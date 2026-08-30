(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sourcePanel = document.querySelector('.source-panel');
  if (!sourcePanel || typeof languages === 'undefined') return;

  const panel = document.createElement('section');
  panel.className = 'panel reverse-panel';
  panel.innerHTML = `
    <div class="panel-title-row">
      <div><span class="step">↩</span><h2>Собеседник → Русский</h2></div>
      <span id="reverseStatus" class="status">Готов</span>
    </div>
    <p class="hint">Дайте иностранному собеседнику сказать фразу. Выберите его язык — приложение распознает речь и сразу переведёт её на русский.</p>
    <div class="reverse-language-row">
      <label for="reverseLanguage"><b>Язык собеседника</b></label>
      <select id="reverseLanguage"></select>
    </div>
    <textarea id="reverseSourceText" rows="3" placeholder="Здесь появится речь собеседника"></textarea>
    <div class="actions reverse-actions">
      <button id="reverseMicBtn" class="primary" type="button">🎤 Слушать собеседника</button>
      <button id="reverseStopBtn" class="danger" type="button" disabled>■ Стоп</button>
      <button id="reverseTranslateBtn" class="secondary" type="button">Перевести на русский</button>
      <button id="reverseClearBtn" class="ghost" type="button">Очистить</button>
    </div>
    <div class="reverse-result-box">
      <div class="reverse-result-head"><b>🇷🇺 Перевод на русский</b><span id="reverseResultHint" class="hint"></span></div>
      <div id="reverseRussianText" class="reverse-russian-text">Здесь появится перевод.</div>
      <div class="actions reverse-result-actions">
        <button id="reverseSpeakBtn" class="ghost" type="button">🔊 Озвучить по-русски</button>
        <button id="reverseCopyBtn" class="ghost" type="button">Копировать</button>
      </div>
    </div>
  `;

  sourcePanel.after(panel);

  const style = document.createElement('style');
  style.textContent = `
    .reverse-panel{border:2px solid #77b7a5;background:linear-gradient(180deg,#fbfffd,#f4fbf8)}
    .reverse-language-row{display:grid;grid-template-columns:minmax(150px,.55fr) minmax(220px,1fr);gap:12px;align-items:center;margin:12px 0}
    .reverse-language-row select{width:100%;min-height:48px;border-radius:10px;padding:8px 12px;font:inherit;font-weight:700}
    .reverse-panel textarea{width:100%;box-sizing:border-box}
    .reverse-result-box{margin-top:14px;padding:14px;border:1px solid #b9d9cf;border-radius:14px;background:#fff}
    .reverse-result-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px}
    .reverse-russian-text{min-height:58px;font-size:1.12rem;line-height:1.55;white-space:pre-wrap}
    .reverse-result-actions{margin-top:10px}
    @media(max-width:680px){.reverse-language-row{grid-template-columns:1fr}.reverse-actions button{flex:1 1 45%}.reverse-result-head{align-items:flex-start;flex-direction:column}}
  `;
  document.head.append(style);

  const els = {
    language: panel.querySelector('#reverseLanguage'),
    source: panel.querySelector('#reverseSourceText'),
    russian: panel.querySelector('#reverseRussianText'),
    status: panel.querySelector('#reverseStatus'),
    hint: panel.querySelector('#reverseResultHint'),
    mic: panel.querySelector('#reverseMicBtn'),
    stop: panel.querySelector('#reverseStopBtn'),
    translate: panel.querySelector('#reverseTranslateBtn'),
    clear: panel.querySelector('#reverseClearBtn'),
    speak: panel.querySelector('#reverseSpeakBtn'),
    copy: panel.querySelector('#reverseCopyBtn')
  };

  const preferredOrder = ['de-DE', 'en-US', 'ar-EG'];
  const unique = new Map();
  languages.forEach((lang) => unique.set(lang.id, lang));
  const ordered = [
    ...preferredOrder.map((id) => unique.get(id)).filter(Boolean),
    ...[...unique.values()].filter((lang) => !preferredOrder.includes(lang.id))
  ];

  ordered.forEach((lang) => {
    const option = document.createElement('option');
    option.value = lang.locale;
    option.dataset.target = lang.target;
    option.textContent = `${lang.flag} ${lang.country} — ${lang.language}`;
    els.language.append(option);
  });

  try {
    const saved = localStorage.getItem('translatorReverseLanguage');
    if (saved && [...els.language.options].some((o) => o.value === saved)) els.language.value = saved;
  } catch {}

  els.language.addEventListener('change', () => {
    try { localStorage.setItem('translatorReverseLanguage', els.language.value); } catch {}
  });

  function setReverseStatus(text, mode = '') {
    els.status.textContent = text;
    els.status.className = `status ${mode}`.trim();
  }

  function sourceBase() {
    return (els.language.value || 'de-DE').split('-')[0];
  }

  async function translateGoogle(text, source) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=ru&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Google Translate: ${response.status}`);
    const data = await response.json();
    const translated = Array.isArray(data?.[0]) ? data[0].map((part) => part?.[0] || '').join('') : '';
    if (!translated) throw new Error('Пустой перевод');
    return translated;
  }

  async function translateMyMemory(text, source) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(source)}|ru`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`MyMemory: ${response.status}`);
    const data = await response.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error('Пустой резервный перевод');
    return translated;
  }

  async function translateToRussian() {
    const text = els.source.value.trim();
    if (!text) {
      if (typeof showToast === 'function') showToast('Сначала дайте собеседнику сказать фразу');
      return;
    }
    const source = sourceBase();
    els.translate.disabled = true;
    setReverseStatus('Перевожу…', 'busy');
    els.hint.textContent = '';
    try {
      let translated;
      try {
        translated = await translateGoogle(text, source);
      } catch (error) {
        console.warn('Основной обратный перевод недоступен, пробуем резервный.', error);
        translated = await translateMyMemory(text, source);
      }
      els.russian.textContent = translated;
      els.hint.textContent = 'Готово';
      setReverseStatus('Готов');
    } catch (error) {
      els.russian.textContent = 'Не удалось получить перевод.';
      els.hint.textContent = error?.message || 'Ошибка сети';
      setReverseStatus('Ошибка');
    } finally {
      els.translate.disabled = false;
    }
  }

  let reverseRecognition = null;
  let reverseListening = false;
  let finalText = '';

  if (SpeechRecognition) {
    reverseRecognition = new SpeechRecognition();
    reverseRecognition.interimResults = true;
    reverseRecognition.continuous = false;
    reverseRecognition.maxAlternatives = 1;

    reverseRecognition.onstart = () => {
      reverseListening = true;
      els.mic.disabled = true;
      els.stop.disabled = false;
      setReverseStatus('Слушаю собеседника…', 'listening');
    };

    reverseRecognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = String(event.results[i][0]?.transcript || '').trim();
        if (!text) continue;
        if (event.results[i].isFinal) finalText = `${finalText} ${text}`.replace(/\s+/g, ' ').trim();
        else interim = `${interim} ${text}`.replace(/\s+/g, ' ').trim();
      }
      els.source.value = `${finalText} ${interim}`.replace(/\s+/g, ' ').trim();
    };

    reverseRecognition.onerror = (event) => {
      const labels = {
        'not-allowed': 'Нет разрешения на микрофон',
        'audio-capture': 'Микрофон не найден',
        'no-speech': 'Речь не распознана',
        'network': 'Ошибка сети распознавания'
      };
      if (event.error !== 'aborted') {
        if (typeof showToast === 'function') showToast(labels[event.error] || `Ошибка микрофона: ${event.error}`);
      }
    };

    reverseRecognition.onend = () => {
      reverseListening = false;
      els.mic.disabled = false;
      els.stop.disabled = true;
      setReverseStatus('Готов');
      if (els.source.value.trim()) translateToRussian();
    };
  } else {
    els.mic.disabled = true;
    els.stop.disabled = true;
    els.hint.textContent = 'Этот браузер не поддерживает распознавание речи';
  }

  function stopMainMicrophone() {
    try {
      if (typeof stopListening === 'function' && (typeof keepListening === 'undefined' || keepListening || recognitionRunning)) stopListening();
    } catch {}
  }

  els.mic.addEventListener('click', () => {
    if (!reverseRecognition || reverseListening) return;
    stopMainMicrophone();
    window.speechSynthesis?.cancel();
    finalText = '';
    els.source.value = '';
    els.russian.textContent = 'Здесь появится перевод.';
    els.hint.textContent = '';
    reverseRecognition.lang = els.language.value || 'de-DE';
    try {
      reverseRecognition.start();
    } catch {
      if (typeof showToast === 'function') showToast('Не удалось запустить микрофон собеседника');
    }
  });

  els.stop.addEventListener('click', () => {
    if (!reverseRecognition || !reverseListening) return;
    try { reverseRecognition.stop(); } catch {}
  });

  document.querySelector('#micBtn')?.addEventListener('click', () => {
    if (reverseRecognition && reverseListening) {
      try { reverseRecognition.abort(); } catch {}
    }
  }, true);

  els.translate.addEventListener('click', translateToRussian);
  els.clear.addEventListener('click', () => {
    if (reverseRecognition && reverseListening) {
      try { reverseRecognition.abort(); } catch {}
    }
    finalText = '';
    els.source.value = '';
    els.russian.textContent = 'Здесь появится перевод.';
    els.hint.textContent = '';
    setReverseStatus('Готов');
  });

  els.copy.addEventListener('click', async () => {
    const text = els.russian.textContent.trim();
    if (!text || text === 'Здесь появится перевод.') return;
    try {
      await navigator.clipboard.writeText(text);
      if (typeof showToast === 'function') showToast('Русский перевод скопирован');
    } catch {
      if (typeof showToast === 'function') showToast('Не удалось скопировать');
    }
  });

  els.speak.addEventListener('click', () => {
    const text = els.russian.textContent.trim();
    if (!text || text === 'Здесь появится перевод.' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.95;
    const russianVoice = window.speechSynthesis.getVoices().find((voice) => String(voice.lang || '').toLowerCase().startsWith('ru'));
    if (russianVoice) utterance.voice = russianVoice;
    window.speechSynthesis.speak(utterance);
  });

  const badge = document.querySelector('.version-badge');
  if (badge) badge.textContent = 'Версия 11 · разговор в обе стороны: иностранный → русский';
})();

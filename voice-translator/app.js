const languages = [
  { id: 'de-DE', target: 'de', locale: 'de-DE', flag: '🇩🇪', country: 'Германия', language: 'Deutsch', selected: true },
  { id: 'de-AT', target: 'de', locale: 'de-AT', flag: '🇦🇹', country: 'Австрия', language: 'Deutsch' },
  { id: 'de-CH', target: 'de', locale: 'de-CH', flag: '🇨🇭', country: 'Швейцария', language: 'Deutsch' },
  { id: 'en-GB', target: 'en', locale: 'en-GB', flag: '🇬🇧', country: 'Великобритания', language: 'English', selected: true },
  { id: 'en-US', target: 'en', locale: 'en-US', flag: '🇺🇸', country: 'США', language: 'English', selected: true },
  { id: 'fr-FR', target: 'fr', locale: 'fr-FR', flag: '🇫🇷', country: 'Франция', language: 'Français' },
  { id: 'es-ES', target: 'es', locale: 'es-ES', flag: '🇪🇸', country: 'Испания', language: 'Español' },
  { id: 'es-MX', target: 'es', locale: 'es-MX', flag: '🇲🇽', country: 'Мексика', language: 'Español' },
  { id: 'it-IT', target: 'it', locale: 'it-IT', flag: '🇮🇹', country: 'Италия', language: 'Italiano' },
  { id: 'nl-NL', target: 'nl', locale: 'nl-NL', flag: '🇳🇱', country: 'Нидерланды', language: 'Nederlands' },
  { id: 'pl-PL', target: 'pl', locale: 'pl-PL', flag: '🇵🇱', country: 'Польша', language: 'Polski' },
  { id: 'tr-TR', target: 'tr', locale: 'tr-TR', flag: '🇹🇷', country: 'Турция', language: 'Türkçe' },
  { id: 'uk-UA', target: 'uk', locale: 'uk-UA', flag: '🇺🇦', country: 'Украина', language: 'Українська' },
  { id: 'cs-CZ', target: 'cs', locale: 'cs-CZ', flag: '🇨🇿', country: 'Чехия', language: 'Čeština' },
  { id: 'ro-RO', target: 'ro', locale: 'ro-RO', flag: '🇷🇴', country: 'Румыния', language: 'Română' },
  { id: 'pt-PT', target: 'pt', locale: 'pt-PT', flag: '🇵🇹', country: 'Португалия', language: 'Português' },
  { id: 'pt-BR', target: 'pt', locale: 'pt-BR', flag: '🇧🇷', country: 'Бразилия', language: 'Português' }
];

const els = {
  languageGrid: document.querySelector('#languageGrid'),
  sourceText: document.querySelector('#sourceText'),
  micBtn: document.querySelector('#micBtn'),
  stopBtn: document.querySelector('#stopBtn'),
  translateBtn: document.querySelector('#translateBtn'),
  clearBtn: document.querySelector('#clearBtn'),
  autoTranslate: document.querySelector('#autoTranslate'),
  results: document.querySelector('#results'),
  status: document.querySelector('#status'),
  resultTemplate: document.querySelector('#resultTemplate'),
  speechRate: document.querySelector('#speechRate'),
  stopSpeechBtn: document.querySelector('#stopSpeechBtn'),
  defaultsBtn: document.querySelector('#defaultsBtn'),
  speechHint: document.querySelector('#speechHint'),
  installBtn: document.querySelector('#installBtn')
};

let recognition = null;
let recognitionRunning = false;
let keepListening = false;
let stopRequested = false;
let restartTimer = null;
let finalTranscript = '';
let interimTranscript = '';
let translationRun = 0;
let voices = [];
let deferredInstallPrompt = null;

function renderLanguages() {
  els.languageGrid.innerHTML = '';
  languages.forEach((lang) => {
    const label = document.createElement('label');
    label.className = 'lang-option';
    label.innerHTML = `
      <input type="checkbox" value="${lang.id}" ${lang.selected ? 'checked' : ''}>
      <span class="flag">${lang.flag}</span>
      <span class="lang-copy"><b>${lang.country}</b><small>${lang.language} · ${lang.locale}</small></span>
    `;
    els.languageGrid.append(label);
  });
}

function setStatus(text, mode = '') {
  els.status.textContent = text;
  els.status.className = `status ${mode}`.trim();
}

function getSelectedLanguages() {
  const selected = new Set([...els.languageGrid.querySelectorAll('input:checked')].map((input) => input.value));
  return languages.filter((lang) => selected.has(lang.id));
}

function setDefaultLanguages() {
  const defaults = new Set(['de-DE', 'en-GB', 'en-US']);
  els.languageGrid.querySelectorAll('input').forEach((input) => {
    input.checked = defaults.has(input.value);
  });
  showToast('Выбраны Германия, Великобритания и США');
}

function showToast(message) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2400);
}

function normalizeSpaces(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function appendFinal(text) {
  const clean = normalizeSpaces(text);
  if (!clean) return;
  finalTranscript = normalizeSpaces(`${finalTranscript} ${clean}`);
}

function updateTranscriptBox() {
  els.sourceText.value = normalizeSpaces(`${finalTranscript} ${interimTranscript}`);
  els.sourceText.scrollTop = els.sourceText.scrollHeight;
}

function splitForFallback(text, maxLength = 450) {
  if (text.length <= maxLength) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function translateWithGoogle(text, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Google Translate: ${response.status}`);
  const data = await response.json();
  const translated = Array.isArray(data?.[0]) ? data[0].map((part) => part?.[0] || '').join('') : '';
  if (!translated) throw new Error('Пустой ответ перевода');
  return translated;
}

async function translateWithMyMemory(text, target) {
  const chunks = splitForFallback(text);
  const translatedChunks = [];
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=ru|${encodeURIComponent(target)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`MyMemory: ${response.status}`);
    const data = await response.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error('Пустой ответ резервного переводчика');
    translatedChunks.push(translated);
  }
  return translatedChunks.join(' ');
}

async function translateText(text, target) {
  try {
    return await translateWithGoogle(text, target);
  } catch (googleError) {
    console.warn('Основной переводчик недоступен, пробуем резервный.', googleError);
    return translateWithMyMemory(text, target);
  }
}

function findVoice(locale) {
  const normalized = locale.toLowerCase();
  return voices.find((voice) => voice.lang.toLowerCase() === normalized)
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(normalized.split('-')[0]))
    || null;
}

function speak(text, locale) {
  if (!('speechSynthesis' in window)) {
    showToast('Озвучка не поддерживается этим браузером');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = Number(els.speechRate.value) || 1;
  const voice = findVoice(locale);
  if (voice) utterance.voice = voice;
  utterance.onerror = () => showToast('Не получилось воспроизвести голос');
  window.speechSynthesis.speak(utterance);
}

function makeResultCard(lang, translatedText) {
  const fragment = els.resultTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.result-card');
  fragment.querySelector('.result-country').textContent = `${lang.flag} ${lang.country}`;
  fragment.querySelector('.result-lang').textContent = `${lang.language} · ${lang.locale}`;
  fragment.querySelector('.translated-text').textContent = translatedText;

  const voice = findVoice(lang.locale);
  fragment.querySelector('.voice-note').textContent = voice
    ? `Голос: ${voice.name}`
    : `Будет использован доступный системный голос для ${lang.locale}`;

  fragment.querySelector('.speak-btn').addEventListener('click', () => speak(translatedText, lang.locale));
  fragment.querySelector('.copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      showToast('Перевод скопирован');
    } catch {
      showToast('Не удалось скопировать автоматически');
    }
  });
  card.dataset.locale = lang.locale;
  return fragment;
}

function makeErrorCard(lang, message) {
  const wrapper = document.createElement('article');
  wrapper.className = 'result-card';
  wrapper.innerHTML = `
    <div class="result-country">${lang.flag} ${lang.country}</div>
    <div class="result-lang">${lang.language} · ${lang.locale}</div>
    <div class="translated-text">Не удалось получить перевод.</div>
    <div class="hint"></div>
  `;
  wrapper.querySelector('.hint').textContent = message;
  return wrapper;
}

async function runTranslation() {
  const text = els.sourceText.value.trim();
  const selected = getSelectedLanguages();
  if (!text) {
    showToast('Сначала скажите или напишите фразу');
    els.sourceText.focus();
    return;
  }
  if (!selected.length) {
    showToast('Выберите хотя бы одну страну');
    return;
  }

  const runId = ++translationRun;
  setStatus('Перевожу…', 'busy');
  els.translateBtn.disabled = true;
  els.results.className = 'results';
  els.results.innerHTML = '';

  try {
    const cache = new Map();
    const getTranslation = (target) => {
      if (!cache.has(target)) cache.set(target, translateText(text, target));
      return cache.get(target);
    };

    const cards = await Promise.all(selected.map(async (lang) => {
      try {
        const translated = await getTranslation(lang.target);
        return { lang, translated };
      } catch (error) {
        return { lang, error: error?.message || 'Ошибка сети' };
      }
    }));

    if (runId !== translationRun) return;
    cards.forEach((item) => {
      if (item.error) els.results.append(makeErrorCard(item.lang, item.error));
      else els.results.append(makeResultCard(item.lang, item.translated));
    });
  } finally {
    if (runId === translationRun) {
      els.translateBtn.disabled = false;
      if (keepListening) setStatus('Слушаю — паузы можно делать', 'listening');
      else setStatus('Готов');
    }
  }
}

function finalizeListeningSession() {
  recognitionRunning = false;
  if (interimTranscript) {
    appendFinal(interimTranscript);
    interimTranscript = '';
    updateTranscriptBox();
  }

  if (keepListening) {
    els.micBtn.disabled = true;
    els.stopBtn.disabled = false;
    setStatus('Слушаю — паузы можно делать', 'listening');
    clearTimeout(restartTimer);
    restartTimer = window.setTimeout(startRecognitionCycle, 280);
    return;
  }

  els.micBtn.disabled = false;
  els.stopBtn.disabled = true;
  if (!els.status.classList.contains('busy')) setStatus('Готов');

  const shouldTranslate = stopRequested && els.autoTranslate.checked && els.sourceText.value.trim();
  stopRequested = false;
  if (shouldTranslate) runTranslation();
}

function startRecognitionCycle() {
  if (!recognition || !keepListening || recognitionRunning) return;
  try {
    recognition.start();
  } catch (error) {
    if (error?.name === 'InvalidStateError') {
      clearTimeout(restartTimer);
      restartTimer = window.setTimeout(startRecognitionCycle, 350);
      return;
    }
    console.warn(error);
    keepListening = false;
    showToast('Не удалось снова запустить микрофон');
    finalizeListeningSession();
  }
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.micBtn.disabled = true;
    els.speechHint.textContent = 'В этом браузере голосовое распознавание недоступно. Используйте ввод текста или откройте страницу в Chrome/совместимом браузере.';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recognitionRunning = true;
    els.micBtn.disabled = true;
    els.stopBtn.disabled = false;
    setStatus('Слушаю — паузы можно делать', 'listening');
  };

  recognition.onresult = (event) => {
    let currentInterim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = normalizeSpaces(event.results[i][0]?.transcript || '');
      if (!text) continue;
      if (event.results[i].isFinal) appendFinal(text);
      else currentInterim = normalizeSpaces(`${currentInterim} ${text}`);
    }
    interimTranscript = currentInterim;
    updateTranscriptBox();
  };

  recognition.onerror = (event) => {
    const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(event.error);
    const labels = {
      'not-allowed': 'Нет разрешения на микрофон',
      'service-not-allowed': 'Браузер запретил распознавание речи',
      'audio-capture': 'Микрофон не найден',
      'network': 'Ошибка сети при распознавании'
    };

    if (fatal) {
      keepListening = false;
      stopRequested = false;
      showToast(labels[event.error] || `Ошибка микрофона: ${event.error}`);
    } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
      showToast(`Ошибка микрофона: ${event.error}`);
    }
  };

  recognition.onend = finalizeListeningSession;
}

function startListening() {
  if (!recognition || keepListening || recognitionRunning) return;
  window.speechSynthesis?.cancel();
  translationRun++;
  els.translateBtn.disabled = false;
  finalTranscript = '';
  interimTranscript = '';
  els.sourceText.value = '';
  keepListening = true;
  stopRequested = false;
  setStatus('Запускаю микрофон…', 'listening');
  startRecognitionCycle();
}

function stopListening() {
  if (!recognition || (!keepListening && !recognitionRunning)) return;
  keepListening = false;
  stopRequested = true;
  clearTimeout(restartTimer);
  setStatus('Завершаю диктовку…', 'busy');
  if (recognitionRunning) {
    try {
      recognition.stop();
    } catch {
      finalizeListeningSession();
    }
  } else {
    finalizeListeningSession();
  }
}

function initVoices() {
  if (!('speechSynthesis' in window)) return;
  const refresh = () => { voices = window.speechSynthesis.getVoices(); };
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

function registerPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=5').catch(console.warn));
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installBtn.hidden = false;
  });

  els.installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showToast('Откройте меню браузера → «Установить приложение» или «Создать ярлык»');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installBtn.hidden = true;
  });
}

els.micBtn.addEventListener('click', startListening);
els.stopBtn.addEventListener('click', stopListening);
els.translateBtn.addEventListener('click', runTranslation);
els.clearBtn.addEventListener('click', () => {
  translationRun++;
  keepListening = false;
  stopRequested = false;
  clearTimeout(restartTimer);
  if (recognitionRunning) {
    try { recognition.abort(); } catch {}
  }
  finalTranscript = '';
  interimTranscript = '';
  els.sourceText.value = '';
  els.translateBtn.disabled = false;
  els.micBtn.disabled = false;
  els.stopBtn.disabled = true;
  els.results.className = 'results empty-state';
  els.results.innerHTML = '<div class="empty-icon">🌍</div><p>Здесь появятся переводы. На каждой карточке будет кнопка ▶ «Озвучить» и список доступных голосов.</p>';
  setStatus('Готов');
});
els.stopSpeechBtn.addEventListener('click', () => window.speechSynthesis?.cancel());
els.defaultsBtn.addEventListener('click', setDefaultLanguages);
els.sourceText.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runTranslation();
});

renderLanguages();
initSpeechRecognition();
initVoices();
registerPwa();
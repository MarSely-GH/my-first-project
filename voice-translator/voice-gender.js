(() => {
  if (!('speechSynthesis' in window)) return;

  const synth = window.speechSynthesis;
  const genderSelect = document.querySelector('#voiceGender');
  const rateSelect = document.querySelector('#speechRate');
  if (!genderSelect) return;

  const MALE_HINTS = [
    'conrad','killian','florian','stefan','hans','markus','martin','max','ralph','bernd','klaus',
    'guy','ryan','andrew','brian','christopher','eric','roger','thomas','george','daniel','james','oliver','arthur','david','matthew','john','alex',
    'henri','remy','alain','nicolas','paul','jean','luc','antoine',
    'alvaro','jorge','diego','carlos','pablo','miguel','antonio','sergio',
    'giuseppe','marco','lorenzo','luigi','fabio','paolo',
    'maarten','daan','jochem','frank','pieter',
    'marek','piotr','adam','krzysztof','tomasz',
    'ahmet','mehmet','emre','mert','kerem',
    'ostap','taras','mykola','andriy','oleksandr',
    'antonin','jakub','jan','petr','tomas',
    'emil','andrei','mihai','alexandru',
    'duarte','joao','joão','cristiano','ricardo','tiago'
  ];

  const FEMALE_HINTS = [
    'katja','anna','helena','petra','sabine','vicki','victoria','zira','aria','jenny','samantha','susan','karen','moira',
    'amelie','amélie','denise','julie','hortense','celine','céline','elise','élise',
    'elvira','lucia','lucía','paulina','monica','mónica','carmen',
    'elsa','isabella','alice','federica','bianca','sofia',
    'femke','lotte','saskia','claire',
    'zofia','agnieszka','ewa','maja',
    'emel','filiz','aylin','selin',
    'polina','olena','natalia','natalya',
    'vlasta','zuzana','tereza','alina','ioana','fernanda','francisca','ines','inês','luciana'
  ];

  const normalized = (value) => String(value || '').toLowerCase();

  function classifyVoice(voice) {
    const name = normalized(voice?.name);
    if (MALE_HINTS.some((hint) => name.includes(hint))) return 'male';
    if (FEMALE_HINTS.some((hint) => name.includes(hint))) return 'female';
    return 'unknown';
  }

  function voicesFor(locale) {
    const list = synth.getVoices();
    const wanted = normalized(locale);
    const base = wanted.split('-')[0];
    const exact = list.filter((voice) => normalized(voice.lang) === wanted);
    return exact.length ? exact : list.filter((voice) => normalized(voice.lang).startsWith(base));
  }

  function voiceLabel(voice) {
    const gender = classifyVoice(voice);
    const icon = gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🎙️';
    return `${icon} ${voice.name} · ${voice.lang}`;
  }

  function findSavedVoice(locale, list) {
    try {
      const saved = localStorage.getItem(`translatorExactVoice:${locale}`);
      if (!saved) return null;
      return list.find((voice) => voice.name === saved) || null;
    } catch {
      return null;
    }
  }

  function populateVoiceSelect(card) {
    const select = card.querySelector('.card-voice-select');
    const note = card.querySelector('.available-voices-note');
    const locale = card.dataset.locale;
    if (!select || !note || !locale) return;

    const list = voicesFor(locale);
    const previous = select.value;
    const saved = findSavedVoice(locale, list);
    const desiredValue = saved?.name || previous || '';

    const signature = list.map((voice) => `${voice.name}|${voice.lang}`).join('||');
    if (select.dataset.voiceSignature !== signature) {
      select.innerHTML = '';

      const automatic = document.createElement('option');
      automatic.value = '';
      automatic.textContent = 'Автовыбор — предпочитать мужской';
      select.append(automatic);

      list.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = voiceLabel(voice);
        select.append(option);
      });
      select.dataset.voiceSignature = signature;
    }

    if (desiredValue && list.some((voice) => voice.name === desiredValue)) {
      select.value = desiredValue;
    }

    const maleCount = list.filter((voice) => classifyVoice(voice) === 'male').length;
    const femaleCount = list.filter((voice) => classifyVoice(voice) === 'female').length;

    if (!list.length) {
      note.textContent = `Браузер не показывает отдельные голоса для ${locale}.`;
    } else if (maleCount) {
      note.textContent = `Доступно голосов: ${list.length}. Распознано мужских: ${maleCount}${femaleCount ? `, женских: ${femaleCount}` : ''}.`;
    } else {
      note.textContent = `Доступно голосов: ${list.length}. Явно мужских голосов браузер не сообщил.`;
    }
  }

  let populating = false;
  function populateAllVoiceSelects() {
    if (populating) return;
    populating = true;
    try {
      document.querySelectorAll('.result-card').forEach(populateVoiceSelect);
    } finally {
      populating = false;
    }
  }

  let populateTimer = null;
  function schedulePopulate(delay = 30) {
    window.clearTimeout(populateTimer);
    populateTimer = window.setTimeout(populateAllVoiceSelects, delay);
  }

  function chooseVoice(locale, mode, card) {
    const list = voicesFor(locale);
    if (!list.length) return { voice: null, matchedGender: false, manual: false };

    const manualName = card?.querySelector('.card-voice-select')?.value;
    if (manualName) {
      const manualVoice = list.find((voice) => voice.name === manualName);
      if (manualVoice) {
        return {
          voice: manualVoice,
          matchedGender: classifyVoice(manualVoice) === mode,
          manual: true
        };
      }
    }

    if (mode === 'auto') return { voice: list[0], matchedGender: true, manual: false };
    const preferred = list.find((voice) => classifyVoice(voice) === mode) || null;
    return { voice: preferred || list[0], matchedGender: Boolean(preferred), manual: false };
  }

  function updateNote(card, mode, voice, matchedGender, manual) {
    const note = card.querySelector('.voice-note');
    if (!note) return;
    if (!voice) {
      note.textContent = 'Системный голос для этого языка не найден';
      return;
    }
    if (manual) {
      note.textContent = `Выбран точный голос: ${voice.name}`;
      return;
    }
    if (mode === 'male') {
      note.textContent = matchedGender
        ? `Мужской голос: ${voice.name}`
        : `Явный мужской голос не найден. Использую ${voice.name} с пониженным тембром.`;
    } else if (mode === 'female') {
      note.textContent = matchedGender
        ? `Женский голос: ${voice.name}`
        : `Отдельный женский голос не найден. Использую ${voice.name}.`;
    } else {
      note.textContent = `Голос: ${voice.name}`;
    }
  }

  function speakWithPreference(card) {
    const text = card.querySelector('.translated-text')?.textContent?.trim();
    const locale = card.dataset.locale;
    if (!text || !locale) return;

    populateVoiceSelect(card);
    const mode = genderSelect.value || 'male';
    const { voice, matchedGender, manual } = chooseVoice(locale, mode, card);

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = Number(rateSelect?.value) || 0.95;
    if (voice) utterance.voice = voice;

    if (manual) {
      utterance.pitch = 1;
    } else if (mode === 'male') {
      utterance.pitch = matchedGender ? 0.92 : 0.62;
    } else if (mode === 'female') {
      utterance.pitch = 1.05;
    } else {
      utterance.pitch = 1;
    }

    updateNote(card, mode, voice, matchedGender, manual);
    utterance.onerror = () => {
      const note = card.querySelector('.voice-note');
      if (note) note.textContent = 'Не получилось воспроизвести этот голос';
    };
    synth.speak(utterance);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.speak-btn');
    if (!button) return;
    const card = button.closest('.result-card');
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    speakWithPreference(card);
  }, true);

  document.addEventListener('change', (event) => {
    const select = event.target.closest('.card-voice-select');
    if (!select) return;
    const card = select.closest('.result-card');
    const locale = card?.dataset.locale;
    if (!locale) return;
    try {
      if (select.value) localStorage.setItem(`translatorExactVoice:${locale}`, select.value);
      else localStorage.removeItem(`translatorExactVoice:${locale}`);
    } catch {}
  });

  try {
    const saved = localStorage.getItem('translatorVoiceGender');
    if (saved && ['male', 'auto', 'female'].includes(saved)) genderSelect.value = saved;
  } catch {}

  genderSelect.addEventListener('change', () => {
    try { localStorage.setItem('translatorVoiceGender', genderSelect.value); } catch {}
  });

  const results = document.querySelector('#results');
  if (results) {
    const observer = new MutationObserver((mutations) => {
      const hasDirectCardChange = mutations.some((mutation) =>
        [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
          node.nodeType === 1 && (node.matches?.('.result-card') || node.querySelector?.('.result-card'))
        )
      );
      if (hasDirectCardChange) schedulePopulate();
    });
    observer.observe(results, { childList: true });
  }

  synth.addEventListener?.('voiceschanged', () => schedulePopulate(80));
  schedulePopulate(250);
  window.setTimeout(() => schedulePopulate(0), 1200);
})();

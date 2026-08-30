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
    'elvira','helena','lucia','lucía','paulina','monica','mónica','carmen',
    'elsa','isabella','alice','federica','bianca','sofia',
    'femke','lotte','saskia','claire',
    'zofia','agnieszka','ewa','maja',
    'emel','filiz','aylin','selin',
    'polina','olena','natalia','natalya','anna',
    'vlasta','zuzana','tereza',
    'alina','ioana','carmen',
    'fernanda','francisca','ines','inês','luciana'
  ];

  function normalized(value) {
    return String(value || '').toLowerCase();
  }

  function voicesFor(locale) {
    const list = synth.getVoices();
    const wanted = normalized(locale);
    const base = wanted.split('-')[0];
    const exact = list.filter((voice) => normalized(voice.lang) === wanted);
    if (exact.length) return exact;
    return list.filter((voice) => normalized(voice.lang).startsWith(base));
  }

  function findByHints(list, hints) {
    return list.find((voice) => {
      const name = normalized(voice.name);
      return hints.some((hint) => name.includes(hint));
    }) || null;
  }

  function chooseVoice(locale, mode) {
    const list = voicesFor(locale);
    if (!list.length) return { voice: null, matchedGender: false };
    if (mode === 'auto') return { voice: list[0], matchedGender: true };

    const hints = mode === 'male' ? MALE_HINTS : FEMALE_HINTS;
    const preferred = findByHints(list, hints);
    return {
      voice: preferred || list[0],
      matchedGender: Boolean(preferred)
    };
  }

  function updateNote(card, mode, voice, matchedGender) {
    const note = card.querySelector('.voice-note');
    if (!note) return;
    if (!voice) {
      note.textContent = 'Системный голос для этого языка не найден';
      return;
    }
    if (mode === 'male') {
      note.textContent = matchedGender
        ? `Мужской голос: ${voice.name}`
        : `Мужской голос не найден. Использую ${voice.name} с более низким тембром.`;
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

    const mode = genderSelect.value || 'male';
    const { voice, matchedGender } = chooseVoice(locale, mode);

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = Number(rateSelect?.value) || 0.95;
    if (voice) utterance.voice = voice;

    if (mode === 'male') {
      utterance.pitch = matchedGender ? 0.92 : 0.72;
    } else if (mode === 'female') {
      utterance.pitch = 1.05;
    } else {
      utterance.pitch = 1;
    }

    updateNote(card, mode, voice, matchedGender);
    utterance.onerror = () => {
      const note = card.querySelector('.voice-note');
      if (note) note.textContent = 'Не получилось воспроизвести этот голос';
    };
    synth.speak(utterance);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.speak-btn');
    if (!button) return;
    const mode = genderSelect.value || 'male';
    if (mode === 'auto') return;

    const card = button.closest('.result-card');
    if (!card) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    speakWithPreference(card);
  }, true);

  try {
    const saved = localStorage.getItem('translatorVoiceGender');
    if (saved && ['male', 'auto', 'female'].includes(saved)) genderSelect.value = saved;
  } catch {}

  genderSelect.addEventListener('change', () => {
    try { localStorage.setItem('translatorVoiceGender', genderSelect.value); } catch {}
  });
})();

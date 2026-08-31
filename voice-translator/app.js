const countries = [
  { id: 'en-US', flag: '🇺🇸', country: 'США', language: 'English', target: 'en' },
  { id: 'de-DE', flag: '🇩🇪', country: 'Германия', language: 'Deutsch', target: 'de' },
  { id: 'ar-EG', flag: '🇪🇬', country: 'Египет', language: 'العربية', target: 'ar' },
  { id: 'de-AT', flag: '🇦🇹', country: 'Австрия', language: 'Deutsch', target: 'de' },
  { id: 'de-CH', flag: '🇨🇭', country: 'Швейцария', language: 'Deutsch', target: 'de' },
  { id: 'en-GB', flag: '🇬🇧', country: 'Великобритания', language: 'English', target: 'en' },
  { id: 'fr-FR', flag: '🇫🇷', country: 'Франция', language: 'Français', target: 'fr' },
  { id: 'es-ES', flag: '🇪🇸', country: 'Испания', language: 'Español', target: 'es' },
  { id: 'es-MX', flag: '🇲🇽', country: 'Мексика', language: 'Español', target: 'es' },
  { id: 'it-IT', flag: '🇮🇹', country: 'Италия', language: 'Italiano', target: 'it' },
  { id: 'nl-NL', flag: '🇳🇱', country: 'Нидерланды', language: 'Nederlands', target: 'nl' },
  { id: 'pl-PL', flag: '🇵🇱', country: 'Польша', language: 'Polski', target: 'pl' },
  { id: 'tr-TR', flag: '🇹🇷', country: 'Турция', language: 'Türkçe', target: 'tr' },
  { id: 'uk-UA', flag: '🇺🇦', country: 'Украина', language: 'Українська', target: 'uk' },
  { id: 'cs-CZ', flag: '🇨🇿', country: 'Чехия', language: 'Čeština', target: 'cs' },
  { id: 'ro-RO', flag: '🇷🇴', country: 'Румыния', language: 'Română', target: 'ro' },
  { id: 'pt-PT', flag: '🇵🇹', country: 'Португалия', language: 'Português', target: 'pt' },
  { id: 'pt-BR', flag: '🇧🇷', country: 'Бразилия', language: 'Português', target: 'pt' }
];

const els = {
  country: document.querySelector('#countrySelect'),
  youDirection: document.querySelector('#youDirection'),
  partnerDirection: document.querySelector('#partnerDirection'),
  youText: document.querySelector('#youText'),
  partnerText: document.querySelector('#partnerText'),
  youMic: document.querySelector('#youMic'),
  partnerMic: document.querySelector('#partnerMic'),
  youSend: document.querySelector('#youSend'),
  partnerSend: document.querySelector('#partnerSend'),
  youResult: document.querySelector('#youResult'),
  partnerResult: document.querySelector('#partnerResult'),
  foreignText: document.querySelector('#foreignText'),
  russianText: document.querySelector('#russianText'),
  speakForeign: document.querySelector('#speakForeign'),
  speakRussian: document.querySelector('#speakRussian'),
  toast: document.querySelector('#toast')
};

let toastTimer = null;
let activeRecognition = null;

function currentCountry() {
  return countries.find((item) => item.id === els.country.value) || countries[0];
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.hidden = false;
  toastTimer = window.setTimeout(() => { els.toast.hidden = true; }, 2200);
}

function tapFeedback() {
  try { navigator.vibrate?.(18); } catch {}
}

function fitTextarea(field) {
  field.style.height = 'auto';
  const next = Math.min(Math.max(field.scrollHeight, 124), 230);
  field.style.height = `${next}px`;
}

function revealResult(element) {
  element.hidden = false;
  window.requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function renderCountries() {
  els.country.innerHTML = '';
  countries.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.flag} ${item.country} · ${item.language}`;
    els.country.append(option);
  });

  let saved = '';
  try { saved = localStorage.getItem('travelTranslatorCountry') || ''; } catch {}
  els.country.value = countries.some((item) => item.id === saved) ? saved : 'en-US';
  updateCountryUI();
}

function updateCountryUI() {
  const item = currentCountry();
  els.youDirection.textContent = `Русский → ${item.language}`;
  els.partnerDirection.textContent = `${item.language} → Русский`;
  els.partnerText.placeholder = `${item.language}: сказать или написать`;
  els.partnerText.dir = item.target === 'ar' ? 'rtl' : 'auto';
  els.foreignText.dir = item.target === 'ar' ? 'rtl' : 'auto';
  els.russianText.dir = 'auto';
  els.youResult.hidden = true;
  els.partnerResult.hidden = true;
  els.partnerText.value = '';
  fitTextarea(els.partnerText);
  try { localStorage.setItem('travelTranslatorCountry', item.id); } catch {}
}

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function capitalizeRussian(text) {
  const value = normalize(text);
  if (!value) return '';
  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1);
}

function looksLikeQuestion(text) {
  const value = normalize(text).toLocaleLowerCase('ru-RU');
  return /^(а\s+|ну\s+|и\s+)?(кто|что|где|куда|откуда|когда|почему|зачем|как|сколько|какой|какая|какое|какие)\b/u.test(value)
    || /\b(можно|нужно|надо|есть|будет|можете|можешь)\s+ли\b/u.test(value)
    || /^(подскажите|скажите|объясните|покажите).*\b(где|куда|когда|как|сколько|почему|можно)\b/u.test(value);
}

function punctuateRussian(text) {
  let value = normalize(text)
    .replace(/\bподскажите пожалуйста\b/giu, 'подскажите, пожалуйста,')
    .replace(/\bскажите пожалуйста\b/giu, 'скажите, пожалуйста,');
  if (!value) return '';
  value = capitalizeRussian(value);
  if (!/[.!?…]$/.test(value)) value += looksLikeQuestion(value) ? '?' : '.';
  return value;
}

async function googleTranslate(text, source, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('translate');
  const data = await response.json();
  const result = Array.isArray(data?.[0]) ? data[0].map((part) => part?.[0] || '').join('') : '';
  if (!result) throw new Error('empty');
  return result;
}

async function fallbackTranslate(text, source, target) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('translate');
  const data = await response.json();
  const result = data?.responseData?.translatedText || '';
  if (!result) throw new Error('empty');
  return result;
}

async function translate(text, source, target) {
  try {
    return await googleTranslate(text, source, target);
  } catch {
    return fallbackTranslate(text, source, target);
  }
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.textContent = busy ? '…' : '➜';
}

async function translateYou() {
  const item = currentCountry();
  const text = punctuateRussian(els.youText.value);
  if (!text) return;
  tapFeedback();
  els.youText.value = text;
  fitTextarea(els.youText);
  els.youResult.hidden = true;
  setBusy(els.youSend, true);
  try {
    const result = await translate(text, 'ru', item.target);
    els.foreignText.textContent = result;
    revealResult(els.youResult);
  } catch {
    showToast('Не удалось перевести');
  } finally {
    setBusy(els.youSend, false);
  }
}

async function translatePartner() {
  const item = currentCountry();
  const text = normalize(els.partnerText.value);
  if (!text) return;
  tapFeedback();
  els.partnerResult.hidden = true;
  setBusy(els.partnerSend, true);
  try {
    let result = await translate(text, item.target, 'ru');
    result = punctuateRussian(result);
    els.russianText.textContent = result;
    revealResult(els.partnerResult);
  } catch {
    showToast('Не удалось перевести');
  } finally {
    setBusy(els.partnerSend, false);
  }
}

function speechRecognitionClass() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function resetMicButton(button) {
  button.classList.remove('listening');
  button.textContent = '🎤';
}

function stopOtherRecognition() {
  if (!activeRecognition) return;
  activeRecognition.suppress = true;
  try { activeRecognition.recognition.abort(); } catch {}
  resetMicButton(activeRecognition.button);
  activeRecognition = null;
}

function listen(role) {
  const SpeechRecognition = speechRecognitionClass();
  if (!SpeechRecognition) {
    showToast('Голосовой ввод недоступен в этом браузере');
    return;
  }

  if (activeRecognition?.role === role) {
    try { activeRecognition.recognition.stop(); } catch {}
    return;
  }

  stopOtherRecognition();
  window.speechSynthesis?.cancel();
  tapFeedback();

  const item = currentCountry();
  const field = role === 'you' ? els.youText : els.partnerText;
  const button = role === 'you' ? els.youMic : els.partnerMic;
  const recognition = new SpeechRecognition();
  recognition.lang = role === 'you' ? 'ru-RU' : item.id;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  field.value = '';
  fitTextarea(field);
  if (role === 'you') els.youResult.hidden = true;
  else els.partnerResult.hidden = true;

  const state = { role, recognition, button, suppress: false };
  activeRecognition = state;
  let finalText = '';

  recognition.onstart = () => {
    button.classList.add('listening');
    button.textContent = '■';
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = normalize(event.results[i][0]?.transcript || '');
      if (!piece) continue;
      if (event.results[i].isFinal) finalText = normalize(`${finalText} ${piece}`);
      else interim = normalize(`${interim} ${piece}`);
    }
    field.value = normalize(`${finalText} ${interim}`);
    fitTextarea(field);
  };

  recognition.onerror = (event) => {
    if (!['aborted', 'no-speech'].includes(event.error)) showToast('Не расслышал. Попробуйте ещё раз');
  };

  recognition.onend = () => {
    resetMicButton(button);
    if (activeRecognition === state) activeRecognition = null;
    if (state.suppress) return;
    if (!normalize(field.value)) return;
    if (role === 'you') translateYou();
    else translatePartner();
  };

  try {
    recognition.start();
  } catch {
    resetMicButton(button);
    activeRecognition = null;
    showToast('Не удалось включить микрофон');
  }
}

function speak(text, locale) {
  const value = normalize(text);
  if (!value || !('speechSynthesis' in window)) return;
  tapFeedback();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = locale;
  utterance.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const wanted = locale.toLocaleLowerCase();
  const base = wanted.split('-')[0];
  const voice = voices.find((item) => item.lang.toLocaleLowerCase() === wanted)
    || voices.find((item) => item.lang.toLocaleLowerCase().startsWith(base));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function bindKeyboardSend(field, handler) {
  field.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    field.blur();
    handler();
  });
}

els.country.addEventListener('change', () => {
  stopOtherRecognition();
  tapFeedback();
  updateCountryUI();
});
els.youMic.addEventListener('click', () => listen('you'));
els.partnerMic.addEventListener('click', () => listen('partner'));
els.youSend.addEventListener('click', translateYou);
els.partnerSend.addEventListener('click', translatePartner);
els.speakForeign.addEventListener('click', () => speak(els.foreignText.textContent, currentCountry().id));
els.speakRussian.addEventListener('click', () => speak(els.russianText.textContent, 'ru-RU'));
els.youText.addEventListener('input', () => fitTextarea(els.youText));
els.partnerText.addEventListener('input', () => fitTextarea(els.partnerText));
bindKeyboardSend(els.youText, translateYou);
bindKeyboardSend(els.partnerText, translatePartner);

renderCountries();
fitTextarea(els.youText);
fitTextarea(els.partnerText);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=13').catch(() => {}));
}

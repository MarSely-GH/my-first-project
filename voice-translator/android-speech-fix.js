(() => {
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  if (!isAndroid || typeof recognition === 'undefined' || !recognition) return;

  const badge = document.querySelector('.version-badge');
  if (badge) badge.textContent = 'Версия 9 · Android: диктовка без повторов и зависаний';

  const listenNote = document.querySelector('.listen-note');
  if (listenNote) {
    listenNote.textContent = '🎤 Android-режим: можно делать паузы. Микрофон работает короткими безопасными циклами и сам продолжает слушать до кнопки «Стоп». Повторно пришедшие фразы от Chrome отбрасываются.';
  }

  // continuous=true нестабилен в Chrome на Android: отдельные короткие циклы
  // заметно надёжнее, а существующий onend уже умеет запускать следующий цикл.
  recognition.continuous = false;
  recognition.interimResults = true;

  const previousAppendFinal = appendFinal;
  let lastSegmentWords = [];
  let lastSegmentAt = 0;
  const recentSegments = new Map();

  function wordsOf(text) {
    return String(text || '')
      .toLocaleLowerCase('ru-RU')
      .replace(/[.,!?;:…«»"'()\[\]{}—–-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
  }

  function keyOf(words) {
    return words.join(' ');
  }

  function startsWithWords(full, prefix) {
    if (!prefix.length || full.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i += 1) {
      if (full[i] !== prefix[i]) return false;
    }
    return true;
  }

  function cleanupRecent(now) {
    for (const [key, time] of recentSegments) {
      if (now - time > 12000) recentSegments.delete(key);
    }
  }

  appendFinal = function androidSafeAppendFinal(text) {
    const now = Date.now();
    cleanupRecent(now);

    let words = wordsOf(text);
    if (!words.length) return;

    const originalKey = keyOf(words);
    const recentAt = recentSegments.get(originalKey);
    if (recentAt && now - recentAt < 6000) return;

    // Android иногда после перезапуска возвращает предыдущую фразу ещё раз,
    // иногда — предыдущую фразу + новые слова. Убираем только свежий повторный префикс.
    if (lastSegmentWords.length && now - lastSegmentAt < 7000) {
      if (words.length <= lastSegmentWords.length && startsWithWords(lastSegmentWords, words)) {
        return;
      }
      if (words.length > lastSegmentWords.length && startsWithWords(words, lastSegmentWords)) {
        words = words.slice(lastSegmentWords.length);
        if (!words.length) return;
      }
    }

    const cleanText = words.join(' ');
    const cleanKey = keyOf(words);
    recentSegments.set(originalKey, now);
    recentSegments.set(cleanKey, now);
    lastSegmentWords = words;
    lastSegmentAt = now;
    previousAppendFinal(cleanText);
  };

  // Если Android оставляет Web Speech в подвисшем состоянии, мягко завершаем
  // только текущий цикл. keepListening остаётся true, поэтому onend сам запустит новый.
  let watchdog = null;
  const WATCHDOG_MS = 7500;

  function clearWatchdog() {
    if (watchdog) window.clearTimeout(watchdog);
    watchdog = null;
  }

  function armWatchdog() {
    clearWatchdog();
    if (typeof keepListening !== 'undefined' && keepListening) {
      watchdog = window.setTimeout(() => {
        if (!keepListening || !recognitionRunning) return;
        try {
          recognition.stop();
        } catch {
          try { recognition.abort(); } catch {}
        }
      }, WATCHDOG_MS);
    }
  }

  recognition.addEventListener('start', armWatchdog);
  recognition.addEventListener('result', armWatchdog);
  recognition.addEventListener('end', clearWatchdog);
  recognition.addEventListener('error', (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    clearWatchdog();
  });

  // На всякий случай полностью сбрасываем зависший цикл при нажатии «Стоп».
  const stopButton = document.querySelector('#stopBtn');
  stopButton?.addEventListener('click', () => {
    clearWatchdog();
    window.setTimeout(() => {
      if (typeof recognitionRunning !== 'undefined' && recognitionRunning && !keepListening) {
        try { recognition.abort(); } catch {}
      }
    }, 700);
  }, true);
})();

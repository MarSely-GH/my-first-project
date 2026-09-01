(() => {
  const style = document.createElement('style');
  style.textContent = `
    .composer-copy-btn,
    .bubble-copy-btn {
      border: 0;
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: rgba(255,255,255,.88);
      color: #087f83;
      font-size: 22px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform .08s ease, background .15s ease, color .15s ease;
    }
    .composer-copy-btn:active,
    .bubble-copy-btn:active { transform: scale(.95); }
    .composer-copy-btn.copied,
    .bubble-copy-btn.copied { background: #087f83; color: #fff; }
    .composer-copy-btn {
      position: absolute;
      z-index: 3;
      top: 11px;
      right: 11px;
      background: #eef7f5;
      box-shadow: 0 2px 8px rgba(8,127,131,.06);
    }
    .composer textarea { padding-right: 66px; }
    .bubble-actions {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .bubble-actions .sound-btn,
    .bubble-actions .bubble-copy-btn {
      width: 44px;
      height: 44px;
      border-radius: 14px;
    }
    .bubble-actions .bubble-copy-btn { font-size: 21px; }
    @media (max-width: 360px) {
      .composer-copy-btn { width: 40px; height: 40px; border-radius: 13px; }
      .composer textarea { padding-right: 62px; }
      .bubble-actions .sound-btn,
      .bubble-actions .bubble-copy-btn { width: 42px; height: 42px; }
    }
  `;
  document.head.append(style);

  async function copyToClipboard(text) {
    const value = String(text || '').trim();
    if (!value) {
      if (typeof showToast === 'function') showToast('Здесь пока нет текста');
      return false;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const helper = document.createElement('textarea');
        helper.value = value;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        helper.style.pointerEvents = 'none';
        document.body.append(helper);
        helper.select();
        helper.setSelectionRange(0, helper.value.length);
        const ok = document.execCommand('copy');
        helper.remove();
        if (!ok) throw new Error('copy');
      }
      try { navigator.vibrate?.(14); } catch {}
      if (typeof showToast === 'function') showToast('Скопировано');
      return true;
    } catch {
      if (typeof showToast === 'function') showToast('Не удалось скопировать');
      return false;
    }
  }

  function makeButton(className, label, getText) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = '⧉';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.addEventListener('click', async () => {
      const ok = await copyToClipboard(getText());
      if (!ok) return;
      button.textContent = '✓';
      button.classList.add('copied');
      window.setTimeout(() => {
        button.textContent = '⧉';
        button.classList.remove('copied');
      }, 900);
    });
    return button;
  }

  function addComposerCopy(fieldId, label) {
    const field = document.querySelector(fieldId);
    const composer = field?.closest('.composer');
    if (!field || !composer || composer.querySelector('.composer-copy-btn')) return;
    composer.append(makeButton('composer-copy-btn', label, () => field.value));
  }

  function addResultCopy(resultId, textId, label) {
    const result = document.querySelector(resultId);
    const text = document.querySelector(textId);
    const sound = result?.querySelector('.sound-btn');
    if (!result || !text || !sound || result.querySelector('.bubble-copy-btn')) return;

    const actions = document.createElement('div');
    actions.className = 'bubble-actions';
    sound.replaceWith(actions);
    actions.append(sound, makeButton('bubble-copy-btn', label, () => text.textContent));
  }

  addComposerCopy('#youText', 'Скопировать ваш текст');
  addResultCopy('#youResult', '#foreignText', 'Скопировать перевод собеседнику');
  addComposerCopy('#partnerText', 'Скопировать текст собеседника');
  addResultCopy('#partnerResult', '#russianText', 'Скопировать перевод на русский');
})();

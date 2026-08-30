(() => {
  const grid = document.querySelector('#languageGrid');
  if (!grid) return;

  const PRIMARY_IDS = new Set(['de-DE', 'en-US']);
  const labels = [...grid.querySelectorAll('.lang-option')];
  if (!labels.length) return;

  const inputFor = (label) => label.querySelector('input[type="checkbox"]');
  const idFor = (label) => inputFor(label)?.value || '';

  let savedSelection = null;
  try {
    const raw = localStorage.getItem('translatorSelectedLanguagesV8');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) savedSelection = new Set(parsed);
    }
  } catch {}

  const initialSelection = savedSelection || PRIMARY_IDS;
  labels.forEach((label) => {
    const input = inputFor(label);
    if (input) input.checked = initialSelection.has(input.value);
  });

  const mainTitle = document.createElement('div');
  mainTitle.className = 'language-section-title';
  mainTitle.textContent = 'Основные языки';

  const mainGrid = document.createElement('div');
  mainGrid.className = 'main-language-grid';

  const selectedExtras = document.createElement('div');
  selectedExtras.className = 'selected-extra-languages';
  selectedExtras.hidden = true;

  const details = document.createElement('details');
  details.className = 'other-language-details';

  const summary = document.createElement('summary');
  summary.innerHTML = '<span>🌍 Другие языки</span><span class="other-count"></span>';

  const otherGrid = document.createElement('div');
  otherGrid.className = 'other-language-grid';

  details.append(summary, otherGrid);
  grid.innerHTML = '';
  grid.classList.add('compact-language-picker');
  grid.append(mainTitle, mainGrid, selectedExtras, details);

  labels.forEach((label) => {
    if (PRIMARY_IDS.has(idFor(label))) mainGrid.append(label);
    else otherGrid.append(label);
  });

  const style = document.createElement('style');
  style.textContent = `
    .compact-language-picker{display:block!important}
    .language-section-title{font-weight:850;margin:8px 0 10px;color:#28395f}
    .main-language-grid,.other-language-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .other-language-details{margin-top:12px;border:1px solid #cbd7f7;border-radius:14px;background:#f8faff;overflow:hidden}
    .other-language-details summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;font-weight:850;color:#244b9b}
    .other-language-details summary::-webkit-details-marker{display:none}
    .other-language-details summary::after{content:'▾';font-size:1.1rem;transition:transform .18s ease}
    .other-language-details[open] summary::after{transform:rotate(180deg)}
    .other-language-details .other-count{margin-left:auto;font-size:.85rem;opacity:.8}
    .other-language-grid{padding:0 12px 12px}
    .selected-extra-languages{margin-top:10px;padding:10px 12px;border-radius:12px;background:#eef4ff}
    .selected-extra-title{font-size:.85rem;font-weight:800;margin-bottom:7px;color:#43516d}
    .selected-extra-chips{display:flex;flex-wrap:wrap;gap:7px}
    .selected-extra-chip{border:1px solid #b9c9ef;background:white;border-radius:999px;padding:7px 10px;font:inherit;font-weight:750;cursor:pointer}
    .selected-extra-chip:hover{background:#f4f7ff}
    @media(max-width:680px){.main-language-grid,.other-language-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);

  function selectedIds() {
    return [...grid.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  }

  function saveSelection() {
    try { localStorage.setItem('translatorSelectedLanguagesV8', JSON.stringify(selectedIds())); } catch {}
  }

  function labelInfo(label) {
    const flag = label.querySelector('.flag')?.textContent?.trim() || '🌐';
    const country = label.querySelector('.lang-copy b')?.textContent?.trim() || idFor(label);
    return { flag, country };
  }

  function refreshExtras() {
    const extras = [...otherGrid.querySelectorAll('.lang-option')].filter((label) => inputFor(label)?.checked);
    const count = summary.querySelector('.other-count');
    count.textContent = extras.length ? `${extras.length} выбрано` : '';

    selectedExtras.innerHTML = '';
    if (!extras.length) {
      selectedExtras.hidden = true;
      return;
    }

    selectedExtras.hidden = false;
    const title = document.createElement('div');
    title.className = 'selected-extra-title';
    title.textContent = 'Дополнительно переводить на:';
    const chips = document.createElement('div');
    chips.className = 'selected-extra-chips';

    extras.forEach((label) => {
      const input = inputFor(label);
      const info = labelInfo(label);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'selected-extra-chip';
      chip.textContent = `${info.flag} ${info.country} ×`;
      chip.title = `Убрать ${info.country}`;
      chip.addEventListener('click', () => {
        input.checked = false;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      chips.append(chip);
    });

    selectedExtras.append(title, chips);
  }

  grid.addEventListener('change', () => {
    saveSelection();
    refreshExtras();
  });

  const defaultsBtn = document.querySelector('#defaultsBtn');
  if (defaultsBtn) {
    defaultsBtn.textContent = '🇩🇪 Германия + 🇺🇸 США';
    defaultsBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      grid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = PRIMARY_IDS.has(input.value);
      });
      details.open = false;
      saveSelection();
      refreshExtras();
      if (typeof showToast === 'function') showToast('Основные: Германия и США');
    }, true);
  }

  const badge = document.querySelector('.version-badge');
  if (badge) badge.textContent = 'Версия 8 · Германия и США основные, остальные под стрелкой';

  refreshExtras();
})();

(() => {
  if (typeof languages === 'undefined') return;
  if (languages.some((lang) => lang.id === 'ar-EG')) return;

  const egypt = {
    id: 'ar-EG',
    target: 'ar',
    locale: 'ar-EG',
    flag: '🇪🇬',
    country: 'Египет',
    language: 'العربية · Арабский'
  };
  languages.push(egypt);

  const grid = document.querySelector('#languageGrid');
  const otherGrid = grid?.querySelector('.other-language-grid');
  if (!grid || !otherGrid) return;

  const label = document.createElement('label');
  label.className = 'lang-option';
  label.innerHTML = `
    <input type="checkbox" value="${egypt.id}">
    <span class="flag">${egypt.flag}</span>
    <span class="lang-copy"><b>${egypt.country}</b><small>${egypt.language} · ${egypt.locale}</small></span>
  `;
  otherGrid.append(label);

  const badge = document.querySelector('.version-badge');
  if (badge) badge.textContent = 'Версия 10 · добавлен Египет — арабский ar-EG';
})();

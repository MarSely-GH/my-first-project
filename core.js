const $ = id => document.getElementById(id);
const round2 = v => Math.round((Number(v) || 0) * 100) / 100;
const num = id => {
  const el = $(id);
  if (!el) return 0;
  return parseFloat(el.value) || 0;
};
const money = v => new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 2
}).format(Number(v) || 0);

function daysInMonth() {
  const y = parseInt(($('year') && $('year').value) || '2027', 10) || 2027;
  const m = parseInt(($('month') && $('month').value) || '1', 10) || 1;
  return new Date(y, m, 0).getDate();
}

function cfg() {
  return {
    salary: num('salary'),
    norm: num('norm'),
    rk: num('rkPct') / 100,
    sn: num('snPct') / 100,
    nightPct: num('nightPct') / 100,
    premiumPct: num('premiumPct') / 100,
    vakhDay: num('vakhDay'),
    unionPct: num('unionPct') / 100,
    taxPct: num('taxPct') / 100,
    taxDeduction: num('taxDeduction'),
    travelDay: num('travelDay'),
    extraGross: num('extraGross')
  };
}

function period(prefix, c) {
  const day = num('day' + prefix);
  const night = num('night' + prefix);
  const holiday = num('holiday' + prefix);
  const travelDays = num('travel' + prefix);
  const totalHours = day + night;

  const vakhEl = $('vakh' + prefix);
  const autoVakh = Math.max(0, Math.ceil(totalHours / 12) + travelDays);
  const vakhDays = !vakhEl || vakhEl.value.trim() === ''
    ? autoVakh
    : (parseFloat(vakhEl.value) || 0);

  const rate = c.norm > 0 ? c.salary / c.norm : 0;
  const base = round2(rate * totalHours);
  const nightPay = round2(rate * night * c.nightPct);
  const holidayPay = round2(rate * holiday);
  const coeffBase = round2(base + nightPay + holidayPay);
  const rk = round2(coeffBase * c.rk);
  const sn = round2(coeffBase * c.sn);

  const travelRate = c.travelDay > 0 ? c.travelDay : round2(rate * 8);
  const travel = round2(travelDays * travelRate);
  const vakh = round2(vakhDays * c.vakhDay);
  const gross = round2(base + nightPay + holidayPay + rk + sn + travel + vakh);

  return {
    day, night, totalHours, holiday, travelDays, vakhDays,
    rate, base, nightPay, holidayPay, rk, sn, travel, vakh, gross
  };
}

function deductions(gross, vakh, c, availableDeduction) {
  const unionBase = Math.max(0, round2(gross - vakh));
  const union = round2(unionBase * c.unionPct);
  const used = Math.min(Math.max(0, availableDeduction), unionBase);
  const taxable = Math.max(0, round2(unionBase - used));
  const tax = Math.round(taxable * c.taxPct);
  const net = round2(gross - union - tax);
  return {
    union, tax, net,
    remaining: Math.max(0, round2(availableDeduction - used))
  };
}

function updateLabels() {
  const last = daysInMonth();
  if ($('secondLabel')) $('secondLabel').textContent = `С 16 по ${last} число`;
  if ($('finalCaption')) $('finalCaption').textContent = `за 16–${last} + премия`;
  if ($('thSecond')) $('thSecond').textContent = `16–${last}`;
}

function calculate() {
  if (!$('salary') || !$('day1') || !$('night1')) return;

  updateLabels();
  const c = cfg();
  if (c.salary <= 0 || c.norm <= 0) {
    if ($('advanceTop')) $('advanceTop').textContent = '0 ₽';
    if ($('salaryTop')) $('salaryTop').textContent = '0 ₽';
    return;
  }

  const p1 = period('1', c);
  const p2 = period('2', c);

  const premiumBase = round2(p1.base + p2.base + p1.nightPay + p2.nightPay);
  const premium = round2(premiumBase * c.premiumPct);
  const rkPremium = round2(premium * c.rk);
  const snPremium = round2(premium * c.sn);
  const premiumGross = round2(premium + rkPremium + snPremium);

  const gross1 = p1.gross;
  const gross2 = round2(p2.gross + premiumGross + c.extraGross);

  const d1 = deductions(gross1, p1.vakh, c, c.taxDeduction);
  const d2 = deductions(gross2, p2.vakh, c, d1.remaining);

  const vacationOn = !!($('hasVacation') && $('hasVacation').checked);
  const vacNet = vacationOn ? num('vacNet') : 0;
  const advance = Math.max(0, d1.net);
  const final = Math.max(0, d2.net);
  const total = round2(advance + final + vacNet);

  if ($('advanceTop')) $('advanceTop').textContent = money(advance);
  if ($('salaryTop')) $('salaryTop').textContent = money(final);
  if ($('advanceOut')) $('advanceOut').textContent = money(advance);
  if ($('finalOut')) $('finalOut').textContent = money(final);
  if ($('vacOut')) $('vacOut').textContent = money(vacNet);
  if ($('netOut')) $('netOut').textContent = money(total);
  if ($('vacResult')) $('vacResult').style.display = vacationOn ? 'flex' : 'none';

  const last = daysInMonth();
  if ($('summary')) {
    $('summary').innerHTML =
      `1–15: <b>${round2(p1.day)} дневных + ${round2(p1.night)} ночных = ${round2(p1.totalHours)} ч</b>. ` +
      `16–${last}: <b>${round2(p2.day)} дневных + ${round2(p2.night)} ночных = ${round2(p2.totalHours)} ч</b>. ` +
      `Ставка: <b>${money(p1.rate)}/ч</b>.`;
  }

  const rows = [
    ['Рабочие часы', p1.totalHours, p2.totalHours, false],
    ['Оплата по окладу', p1.base, p2.base, true],
    ['Ночные', p1.nightPay, p2.nightPay, true],
    ['Праздничные', p1.holidayPay, p2.holidayPay, true],
    ['РК', p1.rk, p2.rk, true],
    ['СН', p1.sn, p2.sn, true],
    ['Вахтовая надбавка', p1.vakh, p2.vakh, true],
    ['Время в пути', p1.travel, p2.travel, true],
    ['Месячная премия + РК/СН', 0, premiumGross, true],
    ['Доп. начисления', 0, c.extraGross, true],
    ['Профсоюз', -d1.union, -d2.union, true],
    ['НДФЛ', -d1.tax, -d2.tax, true],
    ['Чистыми', advance, final, true]
  ];

  if ($('breakdown')) {
    $('breakdown').innerHTML = rows.map(r =>
      `<tr><td>${r[0]}</td><td>${r[3] ? money(r[1]) : round2(r[1])}</td><td>${r[3] ? money(r[2]) : round2(r[2])}</td></tr>`
    ).join('');
  }

  saveState();
}

function saveState() {
  const ids = [
    'month','year','salary','day1','night1','holiday1','travel1','vakh1',
    'day2','night2','holiday2','travel2','vakh2','hasVacation','vacDays','vacNet',
    'norm','rkPct','snPct','nightPct','premiumPct','vakhDay','unionPct','taxPct',
    'taxDeduction','travelDay','extraGross'
  ];
  const data = {};
  ids.forEach(id => {
    const e = $(id);
    if (!e) return;
    data[id] = e.type === 'checkbox' ? e.checked : e.value;
  });
  try { localStorage.setItem('vakhtaSimpleHours', JSON.stringify(data)); } catch(e) {}
}

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem('vakhtaSimpleHours') || '{}');
    Object.entries(data).forEach(([id, v]) => {
      const e = $(id);
      if (!e) return;
      if (e.type === 'checkbox') e.checked = !!v;
      else e.value = v;
    });
  } catch(e) {}
}

function toggleVacation(noCalc) {
  if ($('vacationBox') && $('hasVacation')) {
    $('vacationBox').classList.toggle('hidden', !$('hasVacation').checked);
  }
  if (!noCalc) calculate();
}

function resetHours() {
  ['day1','night1','holiday1','travel1','vakh1','day2','night2','holiday2','travel2','vakh2','vacDays','vacNet','extraGross']
    .forEach(id => { if ($(id)) $(id).value = ''; });
  ['day1','night1','holiday1','travel1','day2','night2','holiday2','travel2']
    .forEach(id => { if ($(id)) $(id).value = '0'; });
  if ($('hasVacation')) $('hasVacation').checked = false;
  toggleVacation(true);
  calculate();
}

let appInitialized = false;
function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  loadState();
  toggleVacation(true);

  // Делегирование работает и когда приложение вставлено загрузчиком GitHub Pages.
  document.addEventListener('input', e => {
    if (e.target && e.target.matches('input,select')) calculate();
  });
  document.addEventListener('change', e => {
    if (!e.target) return;
    if (e.target.id === 'hasVacation') toggleVacation(true);
    if (e.target.matches('input,select')) calculate();
  });

  if ($('resetBtn')) $('resetBtn').addEventListener('click', resetHours);
  calculate();
}

// На GitHub Pages интерфейс подставляется после того, как DOMContentLoaded уже мог пройти.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, {once:true});
} else {
  initApp();
}

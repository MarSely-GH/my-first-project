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

// Перевод фактической длительности ночных смен в часы,
// на которые начисляется ночная доплата по вашим расчеткам:
// 12н -> 8 ч, 8н -> 6 ч, 4н -> 2 ч.
// Если введена сумма нескольких ночных смен, сначала предполагаем
// максимально возможное число 12-часовых смен, затем 8 или 4 часа.
function nightPremiumHoursFromShiftHours(value) {
  const h = Math.max(0, Number(value) || 0);
  const whole = Math.round(h);
  if (Math.abs(h - whole) < 0.0001 && whole % 4 === 0) {
    const twelves = Math.floor(whole / 12);
    const rem = whole % 12;
    let premium = twelves * 8;
    if (rem === 8) premium += 6;
    else if (rem === 4) premium += 2;
    return premium;
  }
  return round2(h * 2 / 3);
}

function period(prefix, c) {
  const dayHours = Math.max(0, num('day' + prefix));
  const nightShiftHours = Math.max(0, num('night' + prefix));
  const totalHours = round2(dayHours + nightShiftHours);
  const nightPremiumHours = nightPremiumHoursFromShiftHours(nightShiftHours);
  const holiday = Math.max(0, num('holiday' + prefix));
  const travelDays = Math.max(0, num('travel' + prefix));

  const vakhEl = $('vakh' + prefix);
  const autoVakh = Math.max(0, Math.ceil(totalHours / 12) + travelDays);
  const vakhDays = !vakhEl || vakhEl.value.trim() === ''
    ? autoVakh
    : Math.max(0, parseFloat(vakhEl.value) || 0);

  const rate = c.norm > 0 ? c.salary / c.norm : 0;
  const base = round2(rate * totalHours);
  const nightPay = round2(rate * nightPremiumHours * c.nightPct);
  const holidayPay = round2(rate * holiday);
  const coeffBase = round2(base + nightPay + holidayPay);
  const rk = round2(coeffBase * c.rk);
  const sn = round2(coeffBase * c.sn);

  const travelRate = c.travelDay > 0 ? c.travelDay : round2(rate * 8);
  const travel = round2(travelDays * travelRate);
  const vakh = round2(vakhDays * c.vakhDay);
  const gross = round2(base + nightPay + holidayPay + rk + sn + travel + vakh);

  return {
    dayHours, nightShiftHours, totalHours, nightPremiumHours,
    holiday, travelDays, vakhDays,
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

  const labels1 = document.querySelectorAll('.period.first .bigField label');
  const labels2 = document.querySelectorAll('.period.second .bigField label');
  if (labels1[0]) labels1[0].textContent = 'Дневные часы';
  if (labels1[1]) labels1[1].textContent = 'Ночные часы';
  if (labels2[0]) labels2[0].textContent = 'Дневные часы';
  if (labels2[1]) labels2[1].textContent = 'Ночные часы';

  const note1 = document.querySelector('.period.first .note');
  if (note1) {
    note1.innerHTML = 'Вводите фактическую длительность смен. Например: <b>60 дневных + 28 ночных = 88 рабочих часов</b>. Ночную доплату программа переведет сама: 12н → 8 ч, 8н → 6 ч, 4н → 2 ч.';
  }
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
      `1–15: <b>${round2(p1.dayHours)} дневных + ${round2(p1.nightShiftHours)} ночных = ${round2(p1.totalHours)} ч</b>; ` +
      `для ночной доплаты: <b>${round2(p1.nightPremiumHours)} ч</b>. ` +
      `16–${last}: <b>${round2(p2.dayHours)} дневных + ${round2(p2.nightShiftHours)} ночных = ${round2(p2.totalHours)} ч</b>; ` +
      `для ночной доплаты: <b>${round2(p2.nightPremiumHours)} ч</b>. ` +
      `Ставка: <b>${money(p1.rate)}/ч</b>.`;
  }

  const rows = [
    ['Дневные часы', p1.dayHours, p2.dayHours, false],
    ['Ночные часы (длительность смен)', p1.nightShiftHours, p2.nightShiftHours, false],
    ['Всего рабочих часов', p1.totalHours, p2.totalHours, false],
    ['Ночные часы для доплаты', p1.nightPremiumHours, p2.nightPremiumHours, false],
    ['Оплата по окладу', p1.base, p2.base, true],
    ['Доплата за ночные', p1.nightPay, p2.nightPay, true],
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
  updateLabels();

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, {once:true});
} else {
  initApp();
}

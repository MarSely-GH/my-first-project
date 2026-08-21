const $ = id => document.getElementById(id);
const money = v => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(v||0);
const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100;
const num = id => parseFloat($(id).value) || 0;

let inputMode = 'days';

function setTab(mode){
  inputMode = mode;
  const days = mode === 'days';
  $('modeDays').classList.toggle('hidden', !days);
  $('modeHalf').classList.toggle('hidden', days);
  $('tabDays').classList.toggle('active', days);
  $('tabHalf').classList.toggle('active', !days);
}

$('tabDays').onclick = () => setTab('days');
$('tabHalf').onclick = () => setTab('half');

function normalizeToken(t){
  return t.trim().toLowerCase()
    .replaceAll('ё','е')
    .replaceAll('×','x')
    .replace(/[;,]+$/,'');
}

function nightHoursFor(total){
  if(total === 12) return 8;
  if(total === 8) return 6;
  if(total === 4) return 2;
  return round2(total * 2/3);
}

function parseOneToken(raw){
  const t = normalizeToken(raw);
  if(!t) return null;

  if(['в','b','выходной','0','-'].includes(t))
    return {raw, work:0, night:0, holiday:0, vakh:0, travel:0, leave:0, kind:'off'};

  if(['о','отп','отпуск'].includes(t))
    return {raw, work:0, night:0, holiday:0, vakh:0, travel:0, leave:1, kind:'leave'};

  if(['пр','приезд','дорога','путь'].includes(t))
    return {raw, work:0, night:0, holiday:0, vakh:1, travel:1, leave:0, kind:'travel'};

  if(['от','отъезд','отезд'].includes(t))
    return {raw, work:0, night:0, holiday:0, vakh:1, travel:1, leave:0, kind:'travel'};

  let holiday = /п$/.test(t);
  let core = holiday ? t.slice(0,-1) : t;
  let isNight = /н$/.test(core);
  if(isNight) core = core.slice(0,-1);

  const hours = parseFloat(core.replace(',','.'));
  if(Number.isFinite(hours)){
    return {
      raw,
      work:hours,
      night:isNight ? nightHoursFor(hours) : 0,
      holiday:holiday ? hours : 0,
      vakh:1,
      travel:0,
      leave:0,
      kind:isNight ? 'night' : 'day'
    };
  }

  return {raw, error:true};
}

function expandCountExpression(text){
  const out = [];
  const parts = text.trim().split(/\s+/).filter(Boolean);
  for(const p of parts){
    const m = normalizeToken(p).match(/^(.+?)x(\d+)$/);
    if(m){
      const token = m[1];
      const count = parseInt(m[2],10);
      for(let i=0;i<count;i++) out.push(token);
    } else {
      out.push(p);
    }
  }
  return out;
}

function getDaysInMonth(){
  const y = parseInt($('year').value,10);
  const m = parseInt($('month').value,10);
  return new Date(y,m,0).getDate();
}

function buildSchedule(){
  const dim = getDaysInMonth();
  let tokens = [];
  let errors = [];

  if(inputMode === 'days'){
    tokens = $('schedule').value.trim().split(/\s+/).filter(Boolean);
    if(tokens.length !== dim){
      errors.push(`В месяце ${dim} дней, а введено ${tokens.length} кодов. Для точного аванса лучше ввести ровно ${dim}.`);
    }
  } else {
    let a = expandCountExpression($('half1').value);
    let b = expandCountExpression($('half2').value);
    if(a.length > 15) errors.push(`В первой половине получилось ${a.length} дней вместо максимум 15.`);
    const secondMax = dim - 15;
    if(b.length > secondMax) errors.push(`Во второй половине получилось ${b.length} дней вместо максимум ${secondMax}.`);
    while(a.length < 15) a.push('В');
    while(b.length < secondMax) b.push('В');
    tokens = a.concat(b);
  }

  const parsed = [];
  for(let i=0;i<Math.min(tokens.length,dim);i++){
    const p = parseOneToken(tokens[i]);
    if(p && p.error) errors.push(`Не понял код «${tokens[i]}» за ${i+1} число.`);
    parsed.push(p || parseOneToken('В'));
  }
  while(parsed.length<dim) parsed.push(parseOneToken('В'));
  return {parsed, errors, tokens};
}

function sumMetrics(days){
  return days.reduce((a,d)=>{
    a.work += d.work||0;
    a.night += d.night||0;
    a.holiday += d.holiday||0;
    a.vakh += d.vakh||0;
    a.travel += d.travel||0;
    a.leave += d.leave||0;
    return a;
  },{work:0,night:0,holiday:0,vakh:0,travel:0,leave:0});
}

function settings(){
  return {
    salary:num('salary'),
    norm:num('norm'),
    rk:num('rkPct')/100,
    sn:num('snPct')/100,
    nightPct:num('nightPct')/100,
    premiumPct:num('premiumPct')/100,
    vakhDay:num('vakhDay'),
    unionPct:num('unionPct')/100,
    taxPct:num('taxPct')/100,
    taxDeduction:num('taxDeduction'),
    personalPct:num('personalPct')/100,
    travelDay:num('travelDay'),
    extraGross:num('extraGross'),
    alreadyPaid:num('alreadyPaid')
  };
}

function regularComponents(metrics, cfg){
  const rate = cfg.salary / cfg.norm;
  const base = round2(rate * metrics.work);
  const night = round2(rate * metrics.night * cfg.nightPct);
  const holiday = round2(rate * metrics.holiday);
  const coeffBase = round2(base + night + holiday);
  const rk = round2(coeffBase * cfg.rk);
  const sn = round2(coeffBase * cfg.sn);
  const vakh = round2(metrics.vakh * cfg.vakhDay);
  const travelRate = cfg.travelDay > 0 ? cfg.travelDay : round2(rate * 8);
  const travel = round2(metrics.travel * travelRate);
  const personal = round2(base * cfg.personalPct);
  const gross = round2(base + night + holiday + rk + sn + vakh + travel + personal);
  return {rate,base,night,holiday,rk,sn,vakh,travel,travelRate,personal,gross};
}

function premiumComponents(allMetrics, cfg){
  const regularAll = regularComponents(allMetrics, cfg);
  const premiumBase = round2(regularAll.base + regularAll.night);
  const premium = round2(premiumBase * cfg.premiumPct);
  const rkPremium = round2(premium * cfg.rk);
  const snPremium = round2(premium * cfg.sn);
  const gross = round2(premium + rkPremium + snPremium);
  return {premiumBase,premium,rkPremium,snPremium,gross};
}

function applyDeductions(gross, vakh, cfg, availableTaxDeduction){
  const unionBase = Math.max(0, round2(gross - vakh));
  const union = round2(unionBase * cfg.unionPct);
  const usedDeduction = Math.min(Math.max(0, availableTaxDeduction), unionBase);
  const taxable = Math.max(0, round2(unionBase - usedDeduction));
  const tax = Math.round(taxable * cfg.taxPct);
  const net = round2(gross - union - tax);
  return {
    unionBase, union, usedDeduction, taxable, tax, net,
    remainingDeduction: Math.max(0, round2(availableTaxDeduction - usedDeduction))
  };
}

function saveSettings(){
  const ids=['norm','rkPct','snPct','nightPct','premiumPct','vakhDay','unionPct','taxPct','taxDeduction','personalPct','travelDay'];
  const data={};
  ids.forEach(id=>data[id]=$(id).value);
  localStorage.setItem('vakhtaCalcSettings',JSON.stringify(data));
}

function loadSettings(){
  try{
    const data=JSON.parse(localStorage.getItem('vakhtaCalcSettings')||'{}');
    for(const [k,v] of Object.entries(data)){
      if($(k)){
        if($(k).type==='checkbox') $(k).checked=!!v;
        else $(k).value=v;
      }
    }
  }catch(e){}
}

function calculate(){
  saveSettings();
  const {parsed, errors} = buildSchedule();
  const cfg = settings();
  $('parseMsg').innerHTML = errors.length ? `<div class="error">${errors.join('<br>')}</div>` : `<div class="ok">График разобран.</div>`;

  if(cfg.salary<=0 || cfg.norm<=0){
    $('warnings').innerHTML='<div class="error">Укажите оклад и норму часов.</div>';
    return;
  }

  const firstDays = parsed.slice(0,15);
  const secondDays = parsed.slice(15);

  const firstMetrics = sumMetrics(firstDays);
  const secondMetrics = sumMetrics(secondDays);
  const allMetrics = sumMetrics(parsed);

  const firstReg = regularComponents(firstMetrics, cfg);
  const secondReg = regularComponents(secondMetrics, cfg);
  const premium = premiumComponents(allMetrics, cfg);

  // 29-го = только 1–15.
  // 14-го = только 16–конец + месячная премия + итоговые начисления.
  const firstGross = firstReg.gross;
  const secondGross = round2(secondReg.gross + premium.gross + cfg.extraGross);

  // Налоговый вычет используется последовательно: сначала на 29-е, остаток — на 14-е.
  const firstDed = applyDeductions(firstGross, firstReg.vakh, cfg, cfg.taxDeduction);
  const secondDed = applyDeductions(secondGross, secondReg.vakh, cfg, firstDed.remainingDeduction);

  const advance = Math.max(0, firstDed.net);
  const salaryBeforeSeparate = Math.max(0, secondDed.net);
  const final = Math.max(0, round2(salaryBeforeSeparate - cfg.alreadyPaid));
  const monthNet = round2(advance + salaryBeforeSeparate);

  const fullGross = round2(firstGross + secondGross);
  const fullUnion = round2(firstDed.union + secondDed.union);
  const fullTax = firstDed.tax + secondDed.tax;

  $('advanceOut').textContent = money(advance);
  $('finalOut').textContent = money(final);
  $('netOut').textContent = money(monthNet);
  $('grossOut').textContent = money(fullGross);
  $('unionOut').textContent = '− ' + money(fullUnion);
  $('taxOut').textContent = '− ' + money(fullTax);

  const rows = [
    ['Оплата по окладу',round2(firstReg.base+secondReg.base)],
    ['Ночные',round2(firstReg.night+secondReg.night)],
    ['Праздничная доплата',round2(firstReg.holiday+secondReg.holiday)],
    [`РК ${num('rkPct')}%`,round2(firstReg.rk+secondReg.rk)],
    [`СН ${num('snPct')}%`,round2(firstReg.sn+secondReg.sn)],
    [`Премия ${num('premiumPct')}%`,premium.premium],
    ['РК на премию',premium.rkPremium],
    ['СН на премию',premium.snPremium],
    ['Вахтовая надбавка',round2(firstReg.vakh+secondReg.vakh)],
    ['Время в пути',round2(firstReg.travel+secondReg.travel)],
    ['Личный вклад',round2(firstReg.personal+secondReg.personal)],
    ['Доп. начисления к выплате 14-го',cfg.extraGross]
  ].filter(x=>Math.abs(x[1])>0.004);

  $('breakdown').innerHTML = rows.map(r=>`<tr><td>${r[0]}</td><td>${money(r[1])}</td></tr>`).join('');

  const periodRows = [
    ['Рабочие часы', round2(firstMetrics.work), round2(secondMetrics.work), false],
    ['Ночные часы', round2(firstMetrics.night), round2(secondMetrics.night), false],
    ['Оплата по окладу', firstReg.base, secondReg.base, true],
    ['Ночные', firstReg.night, secondReg.night, true],
    ['Праздничные', firstReg.holiday, secondReg.holiday, true],
    ['РК', firstReg.rk, secondReg.rk, true],
    ['СН', firstReg.sn, secondReg.sn, true],
    ['Вахтовая надбавка', firstReg.vakh, secondReg.vakh, true],
    ['Время в пути', firstReg.travel, secondReg.travel, true],
    ['Личный вклад', firstReg.personal, secondReg.personal, true],
    ['Месячная премия + РК/СН', 0, premium.gross, true],
    ['Доп. начисления', 0, cfg.extraGross, true],
    ['Профсоюз', -firstDed.union, -secondDed.union, true],
    ['НДФЛ', -firstDed.tax, -secondDed.tax, true],
    ['Чистыми за период', advance, salaryBeforeSeparate, true]
  ];

  $('periodBreakdown').innerHTML = periodRows.map(r=>{
    const left = r[3] ? money(r[1]) : String(r[1]);
    const right = r[3] ? money(r[2]) : String(r[2]);
    return `<tr><td>${r[0]}</td><td>${left}</td><td>${right}</td></tr>`;
  }).join('');

  $('summary').innerHTML =
    `1–15 число: <b>${round2(firstMetrics.work)} рабочих ч</b>, из них ночных <b>${round2(firstMetrics.night)} ч</b>. `+
    `16–конец: <b>${round2(secondMetrics.work)} рабочих ч</b>, из них ночных <b>${round2(secondMetrics.night)} ч</b>. `+
    `Часовая ставка: <b>${money(firstReg.rate)}</b>.`;

  $('halfSummary').innerHTML =
    `<b>29-го:</b> только работа и начисления, относящиеся к 1–15 числу → <b>${money(advance)}</b>.<br>`+
    `<b>14-го:</b> работа 16-го–последнего числа + месячная премия за весь месяц (${money(premium.gross)})`+
    `${cfg.extraGross ? ` + доп. начисления ${money(cfg.extraGross)}` : ''}`+
    ` → до вычета отдельно выплаченного: <b>${money(salaryBeforeSeparate)}</b>`+
    `${cfg.alreadyPaid ? `; после вычета уже выплаченных ${money(cfg.alreadyPaid)} → <b>${money(final)}</b>` : ''}.`;

  let warns=[];
  if(allMetrics.leave>0) warns.push(`Найден отпуск: ${allMetrics.leave} дн. Отпускные по среднему заработку автоматически пока не считаются. Их можно внести в «Доп. начисления к выплате 14-го», а если уже перечислили отдельно — также в «Уже выплачено отдельно».`);
  if(allMetrics.travel>0 && cfg.travelDay<=0) warns.push(`Оплата времени в пути пока оценивается как 8 × часовая ставка = ${money(firstReg.travelRate)} за день. Для точности можно указать сумму дня в пути вручную.`);
  warns.push('Теперь 29-е и 14-е считаются как два самостоятельных периода: 1–15 и 16–конец. Премия 45% и РК/СН на неё целиком относятся к окончательному расчёту 14-го.');
  $('warnings').innerHTML = warns.map(w=>`<div class="warning">${w}</div>`).join('');
}

$('calcBtn').onclick=calculate;
$('clearBtn').onclick=()=>{ $('schedule').value=''; $('half1').value=''; $('half2').value=''; };

$('julyPreset').onclick=()=>{
  setTab('days');
  $('year').value='2026'; $('month').value='7'; $('salary').value='47438';
  $('norm').value='164.33'; $('vakhDay').value='287'; $('travelDay').value='2062.52';
  $('taxDeduction').value='0'; $('personalPct').value='0'; $('extraGross').value='0'; $('alreadyPaid').value='0';
  const t=[
    ...Array(14).fill('О'),
    ...Array(8).fill('В'),
    'Пр',
    '12','12','12','12','12',
    '4н','12н','12н'
  ];
  $('schedule').value=t.join(' ');
  calculate();
};

$('janPreset').onclick=()=>{
  setTab('days');
  $('year').value='2026'; $('month').value='1'; $('salary').value='46776';
  $('norm').value='164.33'; $('vakhDay').value='287'; $('travelDay').value='3118.40';
  $('taxDeduction').value='7855'; $('personalPct').value='0'; $('extraGross').value='0'; $('alreadyPaid').value='0';
  const t=[
    'В','В','В','В','В','В','Пр',
    '12п','12','12','4н',
    '12н','12н','12н','12н','12н','12н','12н','12н','12н','12н','12н',
    '8н','12','9','12','12','12','12','12','12'
  ];
  $('schedule').value=t.join(' ');
  calculate();
};

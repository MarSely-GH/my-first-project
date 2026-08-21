function ruMonthFromText(text){
  const months = {
    'январ':1,'феврал':2,'март':3,'апрел':4,'май':5,'мая':5,'июн':6,'июл':7,
    'август':8,'сентябр':9,'октябр':10,'ноябр':11,'декабр':12
  };
  const s = String(text||'').toLowerCase().replaceAll('ё','е');
  for(const [stem,n] of Object.entries(months)){
    if(s.includes(stem)) return n;
  }
  return null;
}

const RU_NUM = {
  'ноль':0,'один':1,'одна':1,'первый':1,'первого':1,'первое':1,
  'два':2,'две':2,'второй':2,'второго':2,'второе':2,
  'три':3,'третий':3,'третьего':3,'третье':3,
  'четыре':4,'четвертый':4,'четвертого':4,'четвертое':4,
  'пять':5,'пятый':5,'пятого':5,'пятое':5,
  'шесть':6,'шестой':6,'шестого':6,'шестое':6,
  'семь':7,'седьмой':7,'седьмого':7,'седьмое':7,
  'восемь':8,'восьмой':8,'восьмого':8,'восьмое':8,
  'девять':9,'девятый':9,'девятого':9,'девятое':9,
  'десять':10,'десятый':10,'десятого':10,'десятое':10,
  'одиннадцать':11,'одиннадцатый':11,'одиннадцатого':11,
  'двенадцать':12,'двенадцатый':12,'двенадцатого':12,
  'тринадцать':13,'тринадцатый':13,'тринадцатого':13,
  'четырнадцать':14,'четырнадцатый':14,'четырнадцатого':14,
  'пятнадцать':15,'пятнадцатый':15,'пятнадцатого':15,
  'шестнадцать':16,'шестнадцатый':16,'шестнадцатого':16,
  'семнадцать':17,'семнадцатый':17,'семнадцатого':17,
  'восемнадцать':18,'восемнадцатый':18,'восемнадцатого':18,
  'девятнадцать':19,'девятнадцатый':19,'девятнадцатого':19,
  'двадцать':20,'тридцать':30
};

function normalizeVoiceNumbers(text){
  let s = String(text||'').toLowerCase().replaceAll('ё','е');

  s = s.replace(/две\s+тысячи\s+(двадцать|тридцать)\s+([а-я]+)/g,(m,t,u)=>{
    const tens = t==='двадцать'?20:30;
    const unit = RU_NUM[u];
    return unit!=null ? String(2000+tens+unit) : m;
  });
  s = s.replace(/две\s+тысячи\s+(двадцать|тридцать)\b/g,(m,t)=>String(2000+(t==='двадцать'?20:30)));

  s = s.replace(/\b(двадцать|тридцать)\s+([а-я]+)\b/g,(m,t,u)=>{
    const tens = t==='двадцать'?20:30;
    const unit = RU_NUM[u];
    return unit!=null && unit<10 ? String(tens+unit) : m;
  });

  const words = Object.keys(RU_NUM).sort((a,b)=>b.length-a.length);
  for(const w of words){
    s = s.replace(new RegExp('\\b'+w+'\\b','g'), String(RU_NUM[w]));
  }
  return s.replace(/\s+/g,' ').trim();
}

function hasShiftWords(s){
  return /\b(смен|ночн|ночь|дневн|день|пересмен|праздник|праздничн|выходн|отпуск|приезд|заезд|отъезд|отезд|выезд)\w*/.test(s);
}

function inferCodeFromPhrase(phrase){
  const s = String(phrase||'').toLowerCase().replaceAll('ё','е');

  if(/\b(приезд|заезд|дорога\s+туда)\w*/.test(s)) return 'Пр';
  if(/\b(отъезд|отезд|выезд|дорога\s+обратно)\w*/.test(s)) return 'От';
  if(/\b(выходн|отдых|не\s+работ)\w*/.test(s)) return 'В';
  if(/\b(отпуск|отпускной)\w*/.test(s)) return 'О';

  const holiday = /\b(праздник|праздничн)\w*/.test(s);
  let night = /\b(ночн|ночь)\w*/.test(s);
  let hours = null;

  let hm = s.match(/\b(4|6|8|9|10|11|12)\s*:\s*00\b/);
  if(hm) hours = parseInt(hm[1],10);
  if(hours==null){
    hm = s.match(/\b(4|6|8|9|10|11|12)\s*(?:час(?:а|ов)?|ч)\b/);
    if(hm) hours = parseInt(hm[1],10);
  }

  if(hours==null && !/\b\d+\s+смен\w*/.test(s)){
    hm = s.match(/\b(4|8|12)\s+(ночн\w*|дневн\w*)\b/);
    if(hm) hours = parseInt(hm[1],10);
  }

  if(/\bпересмен\w*/.test(s)){
    if(hours==null) hours = 4;
    night = true;
  }

  if(hours==null && /\bсмен\w*/.test(s)) hours = 12;
  if(hours==null && /\b(ночн|дневн)\w*/.test(s)) hours = 12;
  if(hours==null) return null;

  return String(hours) + (night?'н':'') + (holiday?'п':'');
}

function clampDay(n,dim){
  n = parseInt(n,10);
  if(!Number.isFinite(n)) return null;
  return Math.max(1,Math.min(dim,n));
}

function applyRange(days,start,end,code,touched,actions){
  if(!code) return;
  const dim = days.length;
  start = clampDay(start,dim); end = clampDay(end,dim);
  if(start==null || end==null) return;
  if(end<start){ const t=start; start=end; end=t; }
  for(let d=start;d<=end;d++){
    days[d-1]=code;
    touched.add(d);
  }
  actions.push(`${start}–${end}: ${code}`);
}

function applyDay(days,day,code,touched,actions){
  if(!code) return;
  day = clampDay(day,days.length);
  if(day==null) return;
  days[day-1]=code;
  touched.add(day);
  actions.push(`${day}: ${code}`);
}

function nextCommandBoundary(text,from){
  const rest=text.slice(from);
  const patterns=[
    /\b\d{1,2}\s*(?:числа|число|го)\b/,
    /\b(?:приезд|заезд|отъезд|отезд|выезд)\s+\d{1,2}\b/,
    /\b(?:с\s+)?\d{1,2}\s*(?:по|до|-)\s*\d{1,2}\b/,
    /[.;]/
  ];
  let best=rest.length;
  for(const re of patterns){
    const m=rest.match(re);
    if(m && m.index>0) best=Math.min(best,m.index);
  }
  return from+best;
}

function applyVoiceText(){
  const raw = $('voiceText').value.trim();
  if(!raw){
    $('voiceStatus').innerHTML = '<div class="error">Сначала наговорите или введите текст.</div>';
    return;
  }

  const text = normalizeVoiceNumbers(raw);

  const month = ruMonthFromText(text);
  if(month) $('month').value = String(month);

  const yearMatch = text.match(/\b(20\d{2})\b/);
  if(yearMatch) $('year').value = yearMatch[1];

  const salaryMatch = text.match(/\bоклад(?:\s+будет|\s+составит)?\s*[:\-]?\s*(\d[\d\s]{3,})/);
  if(salaryMatch){
    const val = parseFloat(salaryMatch[1].replace(/\s/g,''));
    if(Number.isFinite(val)) $('salary').value = String(val);
  }

  const normMatch = text.match(/\bнорм\w*\s*(?:час\w*)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/);
  if(normMatch) $('norm').value = normMatch[1].replace(',','.');

  const vakhMatch = text.match(/\bвахт\w*\s*(?:надбавк\w*)?\s*(?:день|за\s+день)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/);
  if(vakhMatch) $('vakhDay').value = vakhMatch[1].replace(',','.');

  const dim = getDaysInMonth();
  const days = Array(dim).fill('В');
  const touched = new Set();
  const actions = [];

  const rangeRe = /(?:\bс\s+)?\b(\d{1,2})\s*(?:по|до|-)\s*(\d{1,2})\b/g;
  let rm;
  while((rm=rangeRe.exec(text))){
    const beforeStart=Math.max(0,rm.index-55);
    let before=text.slice(beforeStart,rm.index);
    const punct=Math.max(before.lastIndexOf('.'),before.lastIndexOf(';'));
    if(punct>=0) before=before.slice(punct+1);

    const afterEnd=nextCommandBoundary(text,rangeRe.lastIndex);
    const after=text.slice(rangeRe.lastIndex,afterEnd);

    let descriptor='';
    if(hasShiftWords(before)) descriptor=before;
    if(hasShiftWords(after)) descriptor=(descriptor+' '+after).trim();
    const code=inferCodeFromPhrase(descriptor);
    applyRange(days,rm[1],rm[2],code,touched,actions);
  }

  const dayClauseRe = /\b(\d{1,2})\s*(?:числа|число|го)\b\s*([^.;]{0,55}?)(?=(?:\s+\d{1,2}\s*(?:числа|число|го)\b)|(?:\s+(?:приезд|заезд|отъезд|отезд|выезд)\s+\d{1,2}\b)|(?:\s+(?:с\s+)?\d{1,2}\s*(?:по|до|-)\s*\d{1,2}\b)|[.;]|$)/g;
  let dm;
  while((dm=dayClauseRe.exec(text))){
    const code=inferCodeFromPhrase(dm[2]);
    applyDay(days,dm[1],code,touched,actions);
  }

  const travelBeforeRe = /\b(приезд|заезд|отъезд|отезд|выезд)\s+(\d{1,2})\b/g;
  let tm;
  while((tm=travelBeforeRe.exec(text))){
    const code=/приезд|заезд/.test(tm[1])?'Пр':'От';
    applyDay(days,tm[2],code,touched,actions);
  }

  const travelAfterRe = /\b(\d{1,2})\s*(?:числа|число|го)?\s+(приезд|заезд|отъезд|отезд|выезд)\b/g;
  while((tm=travelAfterRe.exec(text))){
    const code=/приезд|заезд/.test(tm[2])?'Пр':'От';
    applyDay(days,tm[1],code,touched,actions);
  }

  const shortCodeRe = /\b(\d{1,2})\s+(4н|8н|12н|12нп|12п|12)(?=\s|[.;]|$)/g;
  let sm;
  while((sm=shortCodeRe.exec(text))){
    applyDay(days,sm[1],sm[2],touched,actions);
  }

  if(touched.size===0){
    const countRe = /\b(\d{1,2})\s+смен\w*\s+(ночн\w*|дневн\w*)(?:\s+по\s+(4|8|12)\s*(?:час\w*)?)?/g;
    let cm, cursor=1;
    while((cm=countRe.exec(text))){
      const count=parseInt(cm[1],10);
      const hrs=parseInt(cm[3]||'12',10);
      const code=String(hrs)+(cm[2].startsWith('ноч')?'н':'');
      for(let i=0;i<count && cursor<=dim;i++,cursor++) applyDay(days,cursor,code,touched,actions);
    }
  }

  setTab('days');
  $('schedule').value = days.join(' ');

  if(actions.length){
    const unique=[...new Set(actions)];
    $('voiceStatus').innerHTML = `<div class="ok"><b>Выполнено:</b> ${unique.join(' · ')}.<br>График заполнен и сумма пересчитана.</div>`;
  }else{
    $('voiceStatus').innerHTML = '<div class="warning">Речь распознана, но я не нашёл команд графика. Говорите даты вместе с действием, например: «с 1 по 8 ночные смены, 9 числа 8 часов ночная, отъезд 10».</div>';
  }

  calculate();
}

let recognition = null;
let voiceListening = false;

function initVoiceRecognition(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return false;

  recognition = new SR();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalText = '';

  recognition.onstart = ()=>{
    voiceListening = true;
    finalText = '';
    $('voiceBtn').disabled = true;
    $('voiceStopBtn').disabled = false;
    $('voiceStatus').innerHTML = '<div class="ok">Слушаю… говорите одной фразой.</div>';
  };

  recognition.onresult = (event)=>{
    let interim = '';
    for(let i=event.resultIndex;i<event.results.length;i++){
      const txt = event.results[i][0].transcript;
      if(event.results[i].isFinal) finalText += txt + ' ';
      else interim += txt;
    }
    $('voiceText').value = (finalText + interim).trim();
  };

  recognition.onerror = (event)=>{
    voiceListening=false;
    $('voiceBtn').disabled=false;
    $('voiceStopBtn').disabled=true;
    let msg = 'Не удалось распознать голос.';
    if(event.error==='not-allowed' || event.error==='service-not-allowed') msg='Нет доступа к микрофону. Разрешите микрофон для этой страницы.';
    if(event.error==='no-speech') msg='Речь не распознана. Нажмите микрофон и повторите.';
    $('voiceStatus').innerHTML = `<div class="error">${msg}</div>`;
  };

  recognition.onend = ()=>{
    voiceListening=false;
    $('voiceBtn').disabled=false;
    $('voiceStopBtn').disabled=true;
    if($('voiceText').value.trim()) applyVoiceText();
  };
  return true;
}

$('voiceBtn').addEventListener('click', ()=>{
  if(!recognition){
    const ok = initVoiceRecognition();
    if(!ok){
      $('voiceStatus').innerHTML = '<div class="warning">Этот браузер не поддерживает встроенное распознавание речи. Можно использовать микрофон клавиатуры и кнопку «Разобрать текст».</div>';
      $('voiceText').focus();
      return;
    }
  }
  try{ recognition.start(); }catch(e){}
});

$('voiceStopBtn').addEventListener('click', ()=>{
  if(recognition && voiceListening) recognition.stop();
});

$('voiceParseBtn').addEventListener('click', applyVoiceText);

loadSettings();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

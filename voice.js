function ruMonthFromText(text){
  const months = {
    'январ':1,'феврал':2,'март':3,'апрел':4,'ма':5,'июн':6,'июл':7,
    'август':8,'сентябр':9,'октябр':10,'ноябр':11,'декабр':12
  };
  const s = text.toLowerCase();
  for(const [stem,n] of Object.entries(months)){
    if(s.includes(stem)) return n;
  }
  return null;
}

const RU_NUM = {
  'ноль':0,'один':1,'одна':1,'первый':1,'первого':1,'первое':1,
  'два':2,'две':2,'второй':2,'второго':2,
  'три':3,'третий':3,'третьего':3,
  'четыре':4,'четвертый':4,'четвёртый':4,'четвертого':4,'четвёртого':4,
  'пять':5,'пятый':5,'пятого':5,
  'шесть':6,'шестой':6,'шестого':6,
  'семь':7,'седьмой':7,'седьмого':7,
  'восемь':8,'восьмой':8,'восьмого':8,
  'девять':9,'девятый':9,'девятого':9,
  'десять':10,'десятый':10,'десятого':10,
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

function wordNumberToInt(raw){
  if(raw == null) return null;
  let s = String(raw).toLowerCase().trim().replace(/[.,]/g,'');
  if(/^\d+$/.test(s)) return parseInt(s,10);
  if(RU_NUM[s] != null) return RU_NUM[s];

  const parts = s.split(/[\s-]+/).filter(Boolean);
  let total = 0, found = false;
  for(const p of parts){
    if(RU_NUM[p] != null){
      total += RU_NUM[p];
      found = true;
    }
  }
  return found ? total : null;
}

function normalizeVoiceNumbers(text){
  const unitMap = {
    'один':1,'одна':1,'первое':1,'первого':1,'первый':1,
    'два':2,'две':2,'второе':2,'второго':2,'второй':2,
    'три':3,'третье':3,'третьего':3,'третий':3,
    'четыре':4,'четвертое':4,'четвёртое':4,'четвертого':4,'четвёртого':4,'четвертый':4,'четвёртый':4,
    'пять':5,'пятое':5,'пятого':5,'пятый':5,
    'шесть':6,'шестое':6,'шестого':6,'шестой':6,
    'семь':7,'седьмое':7,'седьмого':7,'седьмой':7,
    'восемь':8,'восьмое':8,'восьмого':8,'восьмой':8,
    'девять':9,'девятое':9,'девятого':9,'девятый':9
  };
  let s = text.toLowerCase().replaceAll('ё','е');
  s = s.replace(/\b(двадцать|тридцать)\s+([а-я]+)\b/g,(m,t,u)=>{
    const tens = t==='двадцать'?20:30;
    return unitMap[u] ? String(tens+unitMap[u]) : m;
  });
  for(const [w,n] of Object.entries(RU_NUM)){
    s = s.replace(new RegExp('\\b'+w+'\\b','g'), String(n));
  }
  return s;
}

function inferCodeFromPhrase(phrase){
  const s = phrase.toLowerCase().replaceAll('ё','е');

  if(/\b(выходн|отдых|не работ)\w*/.test(s)) return 'В';
  if(/\b(отпуск|отпускной)\w*/.test(s)) return 'О';
  if(/\b(приезд|заезд|дорога туда)\w*/.test(s)) return 'Пр';
  if(/\b(отъезд|отезд|выезд|дорога обратно)\w*/.test(s)) return 'От';

  let holiday = /\b(праздник|праздничн)\w*/.test(s);
  let night = /\b(ночн|ночь)\w*/.test(s);
  let hours = null;

  const hm = s.match(/\b(4|6|8|9|10|11|12)\s*(?:час|ч)?\w*/);
  if(hm) hours = parseInt(hm[1],10);

  if(hours == null){
    if(/\bпересмен\w*\b/.test(s)) hours = 4;
    else if(/\bсмен\w*\b/.test(s)) hours = 12;
  }
  if(hours == null) return null;

  return String(hours) + (night?'н':'') + (holiday?'п':'');
}

function applyVoiceText(){
  let raw = $('voiceText').value.trim();
  if(!raw){
    $('voiceStatus').innerHTML = '<div class="error">Сначала наговорите или введите текст.</div>';
    return;
  }

  const text = normalizeVoiceNumbers(raw);

  const month = ruMonthFromText(text);
  if(month) $('month').value = String(month);

  const yearMatch = text.match(/\b(20\d{2})\b/);
  if(yearMatch) $('year').value = yearMatch[1];

  const salaryMatch = text.match(/\bоклад(?:\s+будет|\s+составит|\s*)[:\-]?\s*(\d[\d\s]{3,})/);
  if(salaryMatch){
    const val = parseFloat(salaryMatch[1].replace(/\s/g,''));
    if(Number.isFinite(val)) $('salary').value = String(val);
  }

  const normMatch = text.match(/\bнорм\w*\s*(?:час\w*)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/);
  if(normMatch) $('norm').value = normMatch[1].replace(',','.');

  const vakhMatch = text.match(/\bвахт\w*\s*(?:надбавк\w*)?\s*(?:день|за день)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/);
  if(vakhMatch) $('vakhDay').value = vakhMatch[1].replace(',','.');

  const dim = getDaysInMonth();
  const days = Array(dim).fill('В');
  let touched = new Set();

  const segments = text.split(/[.;\n]+/).map(x=>x.trim()).filter(Boolean);

  for(const seg of segments){
    if(/остальн\w*\s+выходн/.test(seg)){
      continue;
    }

    const code = inferCodeFromPhrase(seg);
    if(!code) continue;

    let start=null, end=null;

    let rm = seg.match(/(?:\bс\s+)?\b(\d{1,2})\s*(?:по|до|-)\s*(\d{1,2})\b/);
    if(rm){
      start=parseInt(rm[1],10); end=parseInt(rm[2],10);
    } else {
      let dm = seg.match(/\b(\d{1,2})(?:\s*(?:число|числа|го|е|й))?\b/);
      if(dm){
        const candidate=parseInt(dm[1],10);
        const before = seg.slice(0, dm.index);
        const after = seg.slice(dm.index + dm[0].length);
        const isLikelyHoursOnly = dm[0].startsWith('12') && !before.trim() && /\b(час|ночн|дневн|смен)\w*/.test(after);
        if(!isLikelyHoursOnly){
          start=end=candidate;
        }
      }
    }

    if(start!=null){
      start=Math.max(1,Math.min(dim,start));
      end=Math.max(1,Math.min(dim,end??start));
      if(end<start){ const tmp=start; start=end; end=tmp; }
      for(let d=start; d<=end; d++){
        days[d-1]=code;
        touched.add(d);
      }
    }
  }

  if(touched.size===0){
    const countRe = /(\d{1,2})\s+(дневн\w*|ночн\w*|выходн\w*|отпуск\w*)[^.;,]*?(?:\b(4|8|12)\s*(?:час\w*)?)?/g;
    let m, cursor=0;
    while((m=countRe.exec(text))){
      const count=parseInt(m[1],10);
      const label=m[2];
      let code='В';
      if(label.startsWith('днев')) code=String(parseInt(m[3]||'12',10));
      else if(label.startsWith('ноч')) code=String(parseInt(m[3]||'12',10))+'н';
      else if(label.startsWith('отпуск')) code='О';
      for(let i=0;i<count && cursor<dim;i++,cursor++) days[cursor]=code;
    }
  }

  setTab('days');
  $('schedule').value = days.join(' ');
  $('voiceStatus').innerHTML =
    `<div class="ok">Данные разобраны. Заполнено: месяц/год/оклад (если были названы) и график на ${dim} дней. Проверьте строку графика и нажмите «Рассчитать».</div>`;

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
  recognition.continuous = true;

  let finalText = '';

  recognition.onstart = ()=>{
    voiceListening = true;
    $('voiceBtn').disabled = true;
    $('voiceStopBtn').disabled = false;
    $('voiceStatus').innerHTML = '<div class="ok">Слушаю… говорите обычной речью.</div>';
  };

  recognition.onresult = (event)=>{
    let interim = '';
    for(let i=event.resultIndex;i<event.results.length;i++){
      const txt = event.results[i][0].transcript;
      if(event.results[i].isFinal) finalText += txt + '. ';
      else interim += txt;
    }
    $('voiceText').value = (finalText + interim).trim();
  };

  recognition.onerror = (event)=>{
    voiceListening=false;
    $('voiceBtn').disabled=false;
    $('voiceStopBtn').disabled=true;
    let msg = 'Не удалось распознать голос.';
    if(event.error==='not-allowed') msg='Браузер не дал доступ к микрофону. Разрешите микрофон для этой страницы.';
    if(event.error==='no-speech') msg='Речь не распознана. Попробуйте ещё раз.';
    $('voiceStatus').innerHTML = `<div class="error">${msg}</div>`;
  };

  recognition.onend = ()=>{
    voiceListening=false;
    $('voiceBtn').disabled=false;
    $('voiceStopBtn').disabled=true;
    if($('voiceText').value.trim()){
      applyVoiceText();
    }
  };
  return true;
}

$('voiceBtn').addEventListener('click', ()=>{
  if(!recognition){
    const ok = initVoiceRecognition();
    if(!ok){
      $('voiceStatus').innerHTML =
        '<div class="warning">Этот браузер не поддерживает встроенное распознавание речи. Можно нажать микрофон на клавиатуре телефона, надиктовать текст в поле «Что распознано», а затем нажать «Разобрать текст».</div>';
      $('voiceText').focus();
      return;
    }
  }
  try{ recognition.start(); } catch(e){}
});

$('voiceStopBtn').addEventListener('click', ()=>{
  if(recognition && voiceListening) recognition.stop();
});

$('voiceParseBtn').addEventListener('click', applyVoiceText);

loadSettings();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

const $ = id => document.getElementById(id);
const round2 = v => Math.round((Number(v)||0)*100)/100;
const num = id => parseFloat($(id).value) || 0;
const money = v => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(Number(v)||0);

function daysInMonth(){
  const y=parseInt($('year').value,10)||2027;
  const m=parseInt($('month').value,10)||1;
  return new Date(y,m,0).getDate();
}

function cfg(){
  return {
    salary:num('salary'), norm:num('norm'), rk:num('rkPct')/100, sn:num('snPct')/100,
    nightPct:num('nightPct')/100, premiumPct:num('premiumPct')/100,
    vakhDay:num('vakhDay'), unionPct:num('unionPct')/100, taxPct:num('taxPct')/100,
    taxDeduction:num('taxDeduction'), travelDay:num('travelDay'), extraGross:num('extraGross')
  };
}

function period(prefix,c){
  const day=num('day'+prefix), night=num('night'+prefix), holiday=num('holiday'+prefix), travelDays=num('travel'+prefix);
  const totalHours=day+night;
  const autoVakh=Math.max(0,Math.ceil(totalHours/12)+travelDays);
  const vakhEl=$('vakh'+prefix);
  const vakhDays=vakhEl.value.trim()===''?autoVakh:(parseFloat(vakhEl.value)||0);
  const rate=c.norm>0?c.salary/c.norm:0;
  const base=round2(rate*totalHours);
  const nightPay=round2(rate*night*c.nightPct);
  const holidayPay=round2(rate*holiday);
  const coeffBase=round2(base+nightPay+holidayPay);
  const rk=round2(coeffBase*c.rk);
  const sn=round2(coeffBase*c.sn);
  const travelRate=c.travelDay>0?c.travelDay:round2(rate*8);
  const travel=round2(travelDays*travelRate);
  const vakh=round2(vakhDays*c.vakhDay);
  const gross=round2(base+nightPay+holidayPay+rk+sn+travel+vakh);
  return {day,night,totalHours,holiday,travelDays,vakhDays,rate,base,nightPay,holidayPay,rk,sn,travel,vakh,gross};
}

function deductions(gross,vakh,c,availableDeduction){
  const unionBase=Math.max(0,round2(gross-vakh));
  const union=round2(unionBase*c.unionPct);
  const used=Math.min(Math.max(0,availableDeduction),unionBase);
  const taxable=Math.max(0,round2(unionBase-used));
  const tax=Math.round(taxable*c.taxPct);
  const net=round2(gross-union-tax);
  return {union,tax,net,remaining:Math.max(0,round2(availableDeduction-used))};
}

function updateLabels(){
  const last=daysInMonth();
  $('secondLabel').textContent=`С 16 по ${last} число`;
  $('finalCaption').textContent=`за 16–${last} + премия`;
  $('thSecond').textContent=`16–${last}`;
}

function calculate(){
  updateLabels();
  const c=cfg();
  if(c.salary<=0 || c.norm<=0) return;

  const p1=period('1',c);
  const p2=period('2',c);

  const premiumBase=round2(p1.base+p2.base+p1.nightPay+p2.nightPay);
  const premium=round2(premiumBase*c.premiumPct);
  const rkPremium=round2(premium*c.rk);
  const snPremium=round2(premium*c.sn);
  const premiumGross=round2(premium+rkPremium+snPremium);

  const gross1=p1.gross;
  const gross2=round2(p2.gross+premiumGross+c.extraGross);

  const d1=deductions(gross1,p1.vakh,c,c.taxDeduction);
  const d2=deductions(gross2,p2.vakh,c,d1.remaining);

  const vacationOn=$('hasVacation').checked;
  const vacNet=vacationOn?num('vacNet'):0;
  const advance=Math.max(0,d1.net);
  const final=Math.max(0,d2.net);
  const total=round2(advance+final+vacNet);

  $('advanceTop').textContent=money(advance);
  $('salaryTop').textContent=money(final);
  $('advanceOut').textContent=money(advance);
  $('finalOut').textContent=money(final);
  $('vacOut').textContent=money(vacNet);
  $('netOut').textContent=money(total);
  $('vacResult').style.display=vacationOn?'flex':'none';

  const last=daysInMonth();
  $('summary').innerHTML=`1–15: <b>${round2(p1.day)} дневных + ${round2(p1.night)} ночных ч</b>. 16–${last}: <b>${round2(p2.day)} дневных + ${round2(p2.night)} ночных ч</b>. Часовая ставка: <b>${money(p1.rate)}</b>.`;

  const rows=[
    ['Рабочие часы',p1.totalHours,p2.totalHours,false],
    ['Оплата по окладу',p1.base,p2.base,true],
    ['Ночные',p1.nightPay,p2.nightPay,true],
    ['Праздничные',p1.holidayPay,p2.holidayPay,true],
    ['РК',p1.rk,p2.rk,true],['СН',p1.sn,p2.sn,true],
    ['Вахтовая надбавка',p1.vakh,p2.vakh,true],
    ['Время в пути',p1.travel,p2.travel,true],
    ['Месячная премия + РК/СН',0,premiumGross,true],
    ['Доп. начисления',0,c.extraGross,true],
    ['Профсоюз',-d1.union,-d2.union,true],
    ['НДФЛ',-d1.tax,-d2.tax,true],
    ['Чистыми',advance,final,true]
  ];
  $('breakdown').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[3]?money(r[1]):round2(r[1])}</td><td>${r[3]?money(r[2]):round2(r[2])}</td></tr>`).join('');

  saveState();
}

function saveState(){
  const ids=['month','year','salary','day1','night1','holiday1','travel1','vakh1','day2','night2','holiday2','travel2','vakh2','hasVacation','vacDays','vacNet','norm','rkPct','snPct','nightPct','premiumPct','vakhDay','unionPct','taxPct','taxDeduction','travelDay','extraGross'];
  const data={};
  ids.forEach(id=>{ const e=$(id); data[id]=e.type==='checkbox'?e.checked:e.value; });
  try{ localStorage.setItem('vakhtaSimpleHours',JSON.stringify(data)); }catch(e){}
}

function loadState(){
  try{
    const data=JSON.parse(localStorage.getItem('vakhtaSimpleHours')||'{}');
    Object.entries(data).forEach(([id,v])=>{ if($(id)){ if($(id).type==='checkbox') $(id).checked=!!v; else $(id).value=v; }});
  }catch(e){}
  toggleVacation();
}

function toggleVacation(){
  $('vacationBox').classList.toggle('hidden',!$('hasVacation').checked);
  calculate();
}

function resetHours(){
  ['day1','night1','holiday1','travel1','vakh1','day2','night2','holiday2','travel2','vakh2','vacDays','vacNet','extraGross'].forEach(id=>{$(id).value='';});
  $('day1').value=$('night1').value=$('holiday1').value=$('travel1').value='0';
  $('day2').value=$('night2').value=$('holiday2').value=$('travel2').value='0';
  $('hasVacation').checked=false;
  toggleVacation();
}

window.addEventListener('DOMContentLoaded',()=>{
  loadState();
  document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>{
    if(el.id==='hasVacation') toggleVacation(); else calculate();
  }));
  $('hasVacation').addEventListener('change',toggleVacation);
  $('resetBtn').addEventListener('click',resetHours);
  calculate();
});
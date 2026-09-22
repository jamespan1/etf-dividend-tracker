const OLD='etfDividendTrackerV1',KEY='etfDividendTrackerV2',BAK='etfDividendTrackerV1Backup';
let state={transactions:[],dividends:[]}, publicDividends=[];
const $=s=>document.querySelector(s),money=n=>'NT$ '+Math.round(n).toLocaleString('zh-TW'),fmt=s=>s?s.replaceAll('-','/'):'—';
function loadLocal(){if(!localStorage.getItem(KEY)){try{let raw=localStorage.getItem(OLD),o=JSON.parse(raw);if(o&&Array.isArray(o.holdings)){localStorage.setItem(BAK,raw);state={transactions:o.holdings.map((h,i)=>({id:'m'+i,ticker:String(h.ticker).toUpperCase(),date:h.buyDate,type:'buy',shares:+h.shares})),dividends:o.dividends||[]};localStorage.setItem(KEY,JSON.stringify(state))}}catch{}}try{let x=JSON.parse(localStorage.getItem(KEY));if(x)state=x}catch{}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function sign(t){return t.type==='sell'?-t.shares:t.shares}
function at(t,d='9999-12-31'){return state.transactions.filter(x=>x.ticker===t&&normalizeDate(x.date)<d&&normalizeDate(x.date)).reduce((s,x)=>s+sign(x),0)}
function taipeiToday(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
function normalizeDate(value){
 const m=String(value||'').trim().match(/^(\d{2,4})[年/.-](\d{1,2})[月/.-](\d{1,2})日?$/);
 if(!m)return '';let y=+m[1];if(y<1911)y+=1911;
 const d=new Date(Date.UTC(y,+m[2]-1,+m[3]));
 return d.getUTCFullYear()===y&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]?`${y}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:'';
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selectedMonth=taipeiToday().slice(0,7);
function shiftMonth(month,delta){let [y,m]=month.split('-').map(Number);let d=new Date(Date.UTC(y,m-1+delta,1));return d.toISOString().slice(0,7)}
function monthLabel(month){let [y,m]=month.split('-');return `${y} 年 ${+m} 月`}
function renderCalendar(ev,today){
 const rows=ev.filter(x=>x.payDate.slice(0,7)===selectedMonth);
 $('#selectedMonth').textContent=monthLabel(selectedMonth);
 $('#monthTotal').textContent=money(rows.reduce((s,x)=>s+x.amount,0));
 $('#monthSummary').textContent=`已入帳 ${money(rows.filter(x=>x.payDate<=today).reduce((s,x)=>s+x.amount,0))} · 預計入帳 ${money(rows.filter(x=>x.payDate>today).reduce((s,x)=>s+x.amount,0))}`;
 $('#months').innerHTML=Array.from({length:13},(_,i)=>shiftMonth(selectedMonth,i-6)).map(m=>`<button type="button" class="month-button" data-month="${m}" aria-pressed="${m===selectedMonth}">${monthLabel(m)}${m===today.slice(0,7)?' · 本月':''}</button>`).join('');
 $('#schedule').innerHTML=rows.map(x=>`<article class="row payment"><div><div class="payment-date">${fmt(x.payDate)} <span class="badge ${x.payDate<=today?'paid':''}">${x.payDate<=today?'已入帳':'預計入帳'}</span></div><b>${esc(x.ticker)} ${esc(x.name||'')}</b><div class="muted">除息日 ${fmt(x.exDate)}<br>除息時持股 ${x.shares.toLocaleString('zh-TW')} 股 × 每股 ${x.dividend} 元</div></div><b class="amount">${money(x.amount)}</b></article>`).join('')||'<div class="empty">本月尚無符合持股資格的已公告配息</div>';
 document.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{selectedMonth=b.dataset.month;render()});
 const current=document.querySelector('[data-month][aria-pressed="true"]');
 if(current)$('#months').scrollLeft=current.offsetLeft-$('#months').offsetLeft-($('#months').clientWidth-current.offsetWidth)/2;
}
function allDividends(){let map=new Map();[...(state.dividends||[]),...publicDividends].forEach(d=>{d={...d,ticker:String(d.ticker).trim().toUpperCase(),exDate:normalizeDate(d.exDate),payDate:normalizeDate(d.payDate)};if(!d.exDate||!d.payDate)return;let k=[d.ticker,d.exDate,d.payDate].join('|');if(d.dividend!==null&&d.dividend!==undefined&&d.dividend!=='')map.set(k,{...d,dividend:+d.dividend})});return [...map.values()]}
function events(){return allDividends().map(d=>({...d,shares:at(d.ticker,d.exDate)})).filter(x=>x.shares>0&&Number.isFinite(+x.dividend)).map(x=>({...x,amount:x.shares*x.dividend})).sort((a,b)=>a.payDate.localeCompare(b.payDate))}
function render(){let ev=events(),today=taipeiToday(),f=ev.filter(x=>x.payDate>today),p={};state.transactions.forEach(t=>p[t.ticker]=(p[t.ticker]||0)+sign(t));let active=Object.entries(p).filter(x=>x[1]>0),total=active.reduce((s,x)=>s+x[1],0);$('#count').textContent=active.length+' 檔';$('#totalShares').textContent=total.toLocaleString()+' 股';$('#future').textContent=money(f.reduce((s,x)=>s+x.amount,0));if(f.length){let d=f[0].payDate,a=f.filter(x=>x.payDate===d);$('#next').textContent=money(a.reduce((s,x)=>s+x.amount,0));$('#nextDetail').textContent=fmt(d)+' · '+[...new Set(a.map(x=>x.ticker))].join('、')}else{$('#next').textContent='—';$('#nextDetail').textContent='尚無待領資料'}const paid=ev.filter(x=>x.payDate<=today);$('#yearPaid').textContent=money(paid.filter(x=>x.payDate.slice(0,4)===today.slice(0,4)).reduce((s,x)=>s+x.amount,0));$('#allPaid').textContent=money(paid.reduce((s,x)=>s+x.amount,0));renderCalendar(ev,today);
const dates=allDividends().map(x=>x.exDate).sort();$('#coverage').textContent=dates.length?`配息資料涵蓋除息日 ${fmt(dates[0])} 至 ${fmt(dates[dates.length-1])}；歷年累計僅包含已載入的公告，較早或缺漏資料不在合計內。`:'尚未載入有效配息資料，金額暫不完整。';
$('#portfolio').innerHTML=active.map(x=>`<div class="row"><b>${esc(x[0])}</b><b>${x[1].toLocaleString()} 股</b></div>`).join('')+(active.length?`<div class="row"><b>全部 ETF 總計</b><b>${total.toLocaleString()} 股</b></div>`:'<div class="empty">目前沒有持股</div>');$('#holdings').innerHTML=state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>{let i=state.transactions.indexOf(t);return `<div class="row"><div><b>${esc(t.ticker)}</b> · ${t.type==='buy'?'買進':'賣出'}<div class="muted">${fmt(t.date)} · ${t.shares.toLocaleString()} 股</div></div><button class="secondary" data-t="${i}">刪除</button></div>`}).join('')||'<div class="empty">尚無交易紀錄</div>';$('#dividends').innerHTML=allDividends().filter(d=>at(d.ticker)>0).sort((a,b)=>b.exDate.localeCompare(a.exDate)).slice(0,50).map(d=>`<div class="row"><div><b>${esc(d.ticker)}</b><div class="muted">${esc(d.name||'')} · 除息 ${fmt(d.exDate)} · 發放 ${fmt(d.payDate)} · 每股 ${d.dividend} 元</div></div></div>`).join('')||'<div class="empty">尚無持有 ETF 的配息資料</div>';document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{state.transactions.splice(+b.dataset.t,1);save()})}
async function syncPublic(){let s=$('#syncStatus');try{let r=await fetch('./dividends.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error();let x=await r.json();publicDividends=Array.isArray(x.items)?x.items:[];s.textContent=`已更新：${x.updatedAt||'未知'} · ${publicDividends.length.toLocaleString()} 筆公開配息`;render()}catch{s.textContent='目前無法取得最新公開配息資料，保留已載入資料，可稍後重新整理';render()}}
$('#form').onsubmit=e=>{e.preventDefault();let ticker=$('#ticker').value.trim().toUpperCase(),date=$('#tradeDate').value,type=$('#tradeType').value,shares=Math.floor(+$('#shares').value);if(!ticker||!date||shares<1)return;if(type==='sell'&&at(ticker,date)<shares){$('#msg').textContent='賣出股數超過當時持股';return}state.transactions.push({id:Date.now(),ticker,date,type,shares});save();e.target.reset()};
$('#clear').onclick=()=>{if(confirm('確定清除交易資料？V1 備份仍保留。')){state={transactions:[],dividends:[]};save()}};
$('#export').onclick=()=>{let a=document.createElement('a'),b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});a.href=URL.createObjectURL(b);a.download='ETF股息追蹤器_V3備份.json';a.click()};
$('#importBtn').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{try{let x=JSON.parse(await e.target.files[0].text());if(x.transactions)state=x;else if(x.holdings)state={transactions:x.holdings.map((h,i)=>({id:'i'+i,ticker:h.ticker,date:h.buyDate,type:'buy',shares:+h.shares})),dividends:x.dividends||[]};save();alert('匯入完成')}catch{alert('格式不正確')}};
$('#refreshData').onclick=syncPublic;
$('#prevMonth').onclick=()=>{selectedMonth=shiftMonth(selectedMonth,-1);render()};
$('#nextMonth').onclick=()=>{selectedMonth=shiftMonth(selectedMonth,1);render()};
$('#thisMonth').onclick=()=>{selectedMonth=taipeiToday().slice(0,7);render()};
let lastToday=taipeiToday();setInterval(()=>{const day=taipeiToday();if(day!==lastToday){lastToday=day;render()}},30000);

if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(r=>r?.update()).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload())}
loadLocal();render();syncPublic();


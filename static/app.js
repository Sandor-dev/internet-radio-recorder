const days=[["mon","days.mon"],["tue","days.tue"],["wed","days.wed"],["thu","days.thu"],["fri","days.fri"],["sat","days.sat"],["sun","days.sun"]];
let D={stations:[],status:{}};

function esc(x){
  return String(x??"").replace(/[&<>"]/g,c=>({"&":"&","<":"<",">":">",'"':"""}[c]));
}
function fmtBytes(n){
  n=+n||0;
  for(const u of ["B","KB","MB","GB","TB"]){
    if(n<1024) return n.toFixed(n<10&&u!="B"?1:0)+" "+u;
    n/=1024;
  }
  return n.toFixed(1)+" PB";
}

function durationFrom(iso){
  if(!iso)return "";
  const sec=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000));
  const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
  return (h?h+" h ":"")+(m?m+" min ":"")+s+" s";
}
function until(iso){
  if(!iso)return "";
  let sec=Math.floor((new Date(iso).getTime()-Date.now())/1000);
  if(sec<=0)return t("common.soon");
  const d=Math.floor(sec/86400);sec%=86400;
  const h=Math.floor(sec/3600);sec%=3600;
  const m=Math.floor(sec/60);
  return (d?d+" d ":"")+(h?h+" h ":"")+m+" min";
}
function tab(x){
  for(const n of ["today","stations","calendar","history","health","library","stats"])
    document.getElementById(n).classList.toggle("hide",n!==x);
  if(x==="today") renderToday();
  if(x==="calendar") renderCalendar();
  if(x==="history") loadHistory();
  if(x==="health") loadHealth();
  if(x==="library") lib();
  if(x==="stats") stat();
}
function slotHtml(x={start:"00:00",end:"23:59",title:"",pre:0,post:0}){
  if(Array.isArray(x)) x={start:x[0],end:x[1],title:"",pre:0,post:0};
  return `<span class="slot">
    <input class="a" type="time" value="${esc(x.start)}"> -
    <input class="b" type="time" value="${esc(x.end)}">
    <input class="t" placeholder="${t('stations.add_programme')}" value="${esc(x.title||"")}">
    pre <input class="pre" type="number" min="0" value="${+x.pre||0}" style="width:50px">
    post <input class="post" type="number" min="0" value="${+x.post||0}" style="width:50px"> min
    <button onclick="this.parentElement.remove()">x</button>
  </span>`;
}
function render(){
  cards.innerHTML=D.stations.map((s,i)=>{
    const st=D.status[s.name]||{};
    let h=`<div class="card station-card" data-i="${i}" data-detected-ext="${esc(s.detected_ext||s.codec||"aac")}"
        ondragover="dragStationOver(event,${i})" ondragleave="dragStationLeave(event)" ondrop="dropStation(event,${i})">
      <div class="station-order">
        <span class="drag-handle" draggable="true" title="${t('stations.drag')}" ondragstart="dragStationStart(event,${i})" ondragend="dragStationEnd(event)">☰</span>
        <button class="order-btn" title="${t('stations.move_up')}" onclick="moveStation(${i},-1)" ${i===0?"disabled":""}>↑</button>
        <button class="order-btn" title="${t('stations.move_down')}" onclick="moveStation(${i},1)" ${i===D.stations.length-1?"disabled":""}>↓</button>
        <span class="order-no">${t('stations.position', {pos: i+1, total: D.stations.length})}</span>
      </div>
      <h2><input class="name" value="${esc(s.name)}">
      <small class="status status-${i} ${esc(st.status||"waiting")}">${esc(st.status||"—")}</small></h2>`;

    if(st.next && st.status!=="recording"){
      h+=`<div class="muted">${t('stations.next')} ${esc(st.next.when||"")}${st.next.title?" — "+esc(st.next.title):""} <b class="countdown" data-when="${esc(st.next.when||"")}">(${until(st.next.when)})</b></div>`;
    }
    if(st.status==="recording"){
      h+=`<div class="rec-banner"><div class="rec-title"><span class="rec-dot"></span>${t('stations.recording_now')}</div>
        <div class="file">${esc(st.current_file||"")}</div>
        <div>${fmtBytes(st.current_size||0)}</div>
        ${st.started?`<div class="muted">${t('stations.from')} ${esc(st.started)} • ${t('stations.time')} <b class="duration" data-start="${esc(st.started)}">${durationFrom(st.started)}</b></div>`:""}
      </div>`;
    }

    h+=`<input class="url" value="${esc(s.url||"")}" style="width:75%">
      <button onclick="testStream(${i})">${t('stations.test_stream')}</button>
      <span class="res"></span>
      <p>
        ${t('stations.segment')} <input class="seg" type="number" min="1" value="${+s.segment_minutes||60}" style="width:60px"> ${t('stations.min')};
        ${t('stations.retention')} <select class="ret">
          <option value="0">${t('stations.never')}</option>
          ${[7,14,30,60,90,180,365].map(x=>`<option value="${x}" ${+s.retention_days===x?"selected":""}>${x} ${t('stations.days')}</option>`).join("")}
        </select>
        ${t('stations.limit')} <input class="maxgb" type="number" min="0" step="1" value="${+s.max_storage_gb||0}" style="width:70px"> GB
        <label><input class="one" type="checkbox" ${s.one_file_per_program?"checked":""}> ${t('stations.one_file')}</label>
        <label><input class="en" type="checkbox" ${s.enabled!==false?"checked":""}> ${t('stations.active')}</label>
      </p>
      <div class="storage">
        <div class="storage-head"><span>${t('stations.storage_usage')}</span><span class="station-storage-text" data-station="${esc(s.name)}">—</span></div>
        <div class="storage-bar"><div class="storage-fill station-storage-fill" data-station="${esc(s.name)}" style="width:0%"></div></div>
      </div>`;

    for(const [k,labelKey] of days){
      h+=`<div><b>${t(labelKey)}</b>
        <span class="day" data-day="${k}">${(s.schedule?.[k]||[]).map(slotHtml).join("")}</span>
        <button onclick="this.previousElementSibling.insertAdjacentHTML('beforeend',slotHtml())">${t('stations.add_programme')}</button>
      </div>`;
    }

    h+=`<div class="diag"><b>${t('stations.diagnostics')}</b>
      <div class="diag-grid">
        <div><span class="muted">${t('stations.reconnects')}</span><br><b>${st.reconnects||0}</b></div>
        <div><span class="muted">${t('stations.last_error')}</span><br>${esc(st.last_error||t('common.none'))}</div>
        <div><span class="muted">${t('stations.when')}</span><br>${esc(st.last_error_at||"—")}</div>
        <div><span class="muted">${t('stations.last_stop')}</span><br>${esc(st.stop_reason||"—")}${st.stopped_at?" • "+esc(st.stopped_at):""}</div>
      </div>
    </div><p>
      <button class="primary" onclick="saveAll()">${t('stations.save')}</button>
      <button onclick="action('start','${esc(s.name)}')">${t('stations.rec')}</button>
      <button onclick="action('stop','${esc(s.name)}')">${t('stations.stop')}</button>
      <button class="danger" onclick="removeStation(${i})">${t('stations.delete')}</button>
    </p></div>`;
    return h;
  }).join("");
}

function q(c,sel){return c.querySelector(sel)}
function val(c,sel,def=""){
  const el=q(c,sel);
  return el ? el.value : def;
}
function num(c,sel,def=0){
  const el=q(c,sel);
  return el ? (+el.value||0) : def;
}
function chk(c,sel,def=false){
  const el=q(c,sel);
  return el ? !!el.checked : def;
}

function readCard(c){
  const name=val(c,".name","").trim();
  const url=val(c,".url","").trim();

  const s={
    name,
    url,
    codec:c.dataset.detectedExt||"aac",
    detected_ext:c.dataset.detectedExt||"aac",
    segment_minutes:num(c,".seg",60) || 60,
    retention_days:num(c,".ret",0),
    max_storage_gb:num(c,".maxgb",0),
    one_file_per_program:chk(c,".one",false),
    enabled:chk(c,".en",true),
    schedule:{}
  };

  for(const [k] of days){
    s.schedule[k]=[...c.querySelectorAll(`.day[data-day="${k}"] .slot`)].map(x=>({
      start:val(x,".a","00:00"),
      end:val(x,".b","23:59"),
      title:val(x,".t",""),
      pre:num(x,".pre",0),
      post:num(x,".post",0)
    }));
  }
  return s;
}

function normalizeSlot(x){
  if(Array.isArray(x)) return {start:x[0],end:x[1],title:"",pre:0,post:0};
  return {
    start:x?.start||"00:00",
    end:x?.end||"23:59",
    title:x?.title||"",
    pre:+(x?.pre||0),
    post:+(x?.post||0)
  };
}
function hmToMinutes(hm){
  const [h,m]=String(hm||"00:00").split(":").map(Number);
  return (h||0)*60+(m||0);
}
function minutesToHm(total){
  total=((total%1440)+1440)%1440;
  return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0");
}
function weekdayKey(date){
  return ["sun","mon","tue","wed","thu","fri","sat"][date.getDay()];
}
function dayIndex(key){
  return {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6}[key];
}
function buildScheduleEvents(){
  const events=[];
  (D.stations||[]).forEach(st=>{
    const schedule=st.schedule||{};
    Object.entries(schedule).forEach(([day,raws])=>{
      if(dayIndex(day)===undefined)return;
      (raws||[]).forEach(raw=>{
        const x=normalizeSlot(raw);
        const schedStart=hmToMinutes(x.start);
        const schedEnd=hmToMinutes(x.end);
        const recStart=schedStart-x.pre;
        let recEnd=schedEnd+x.post;
        let crossesMidnight = schedEnd<=schedStart;
        if(crossesMidnight) recEnd+=1440;
        events.push({
          station:st.name,
          day,
          title:x.title||"(bez nazwy)",
          scheduleStart:x.start,
          scheduleEnd:x.end,
          startMin:recStart,
          endMin:recEnd,
          start:minutesToHm(recStart),
          end:minutesToHm(recEnd),
          pre:x.pre,
          post:x.post,
          crossesMidnight
        });
      });
    });
  });
  return events;
}
function dateForEvent(ev, occurrenceOffsetWeeks=0){
  const now=new Date();
  const delta=(dayIndex(ev.day)-now.getDay()+7)%7;
  const d=new Date(now);
  d.setDate(now.getDate()+delta+occurrenceOffsetWeeks*7);
  const baseStart=hmToMinutes(ev.start);
  if(ev.startMin<0)d.setDate(d.getDate()-1);
  d.setHours(Math.floor(baseStart/60),baseStart%60,0,0);
  return d;
}
function eventIsToday(ev, now=new Date()){
  return ev.day===weekdayKey(now);
}
function eventIsRunningNow(ev, now=new Date()){
  const targetDay=dayIndex(ev.day);
  let delta=targetDay-now.getDay();
  const base=new Date(now);
  base.setHours(0,0,0,0);
  base.setDate(base.getDate()+delta);
  const start=new Date(base);
  start.setMinutes(ev.startMin);
  const end=new Date(base);
  end.setMinutes(ev.endMin);
  if(now>=start && now<end)return true;
  const pstart=new Date(start);pstart.setDate(pstart.getDate()-7);
  const pend=new Date(end);pend.setDate(pend.getDate()-7);
  return now>=pstart && now<pend;
}
function renderToday(){
  const now=new Date();
  const todays=buildScheduleEvents()
    .filter(ev=>eventIsToday(ev,now))
    .sort((a,b)=>a.startMin-b.startMin);

  const current=todays.filter(ev=>eventIsRunningNow(ev,now));
  const nowMin=now.getHours()*60+now.getMinutes();
  const next=todays.find(ev=>ev.startMin>nowMin);

  const n=document.getElementById("todayNow");
  const nx=document.getElementById("todayNext");
  const cnt=document.getElementById("todayCount");
  const tl=document.getElementById("todayTimeline");
  if(!n||!nx||!cnt||!tl)return;

  n.innerHTML=current.length
    ? current.map(ev=>`<b>${esc(ev.station)}</b><br>${esc(ev.title)}<br><span class="muted">${esc(ev.start)}–${esc(ev.end)}</span>`).join("<hr>")
    : '<span class="muted">' + t('today.nothing_now') + '</span>';

  nx.innerHTML=next
    ? `<b>${esc(next.station)}</b><br>${esc(next.title)}<br><span class="muted">${esc(next.start)}–${esc(next.end)}</span>`
    : '<span class="muted">' + t('today.nothing_next') + '</span>';

  cnt.innerHTML=`<b style="font-size:26px">${todays.length}</b><br><span class="muted">${t('today.planned_tasks')}</span>`;

  tl.innerHTML=todays.length
    ? todays.map(ev=>`<div class="tl-item"><b>${esc(ev.start)}–${esc(ev.end)}</b><br>${esc(ev.station)} — ${esc(ev.title)}</div>`).join("")
    : '<div class="muted">' + t('today.no_tasks') + '</div>';
}
function renderCalendar(){
  const week=document.getElementById("weekCalendar");
  const upcoming=document.getElementById("upcomingList");
  if(!week||!upcoming)return;

  const labels={mon:t("days.monday"),tue:t("days.tuesday"),wed:t("days.wednesday"),thu:t("days.thursday"),fri:t("days.friday"),sat:t("days.saturday"),sun:t("days.sunday")};
  const keys=["mon","tue","wed","thu","fri","sat","sun"];
  const all=buildScheduleEvents();

  week.innerHTML=keys.map(k=>{
    const events=all.filter(ev=>ev.day===k).sort((a,b)=>a.startMin-b.startMin);
    return `<div class="daycol"><div class="dayhead">${labels[k]}</div>`+
      (events.length?events.map(ev=>{
        const st=(D.status||{})[ev.station]||{};
        const rec=st.status==="recording" && (!st.title || st.title===ev.title);
        return `<div class="event ${rec?"recording":""}">
          <div class="event-title">${esc(ev.station)} — ${esc(ev.title)}</div>
          <div class="event-time">${esc(ev.start)} – ${esc(ev.end)}</div>
        </div>`;
      }).join(""):`<div class="muted">${t('calendar.no_tasks')}</div>`)+`</div>`;
  }).join("");

  const now=new Date();
  const rows=[];
  all.forEach(ev=>{
    let when=dateForEvent(ev,0);
    if(when<=now)when=dateForEvent(ev,1);
    rows.push({...ev,when});
  });
  rows.sort((a,b)=>a.when-b.when);
  upcoming.innerHTML=rows.slice(0,20).map(ev=>`<div class="upcoming-row">
    <div><b>${ev.when.toLocaleDateString()}</b><br>${esc(ev.start)}</div>
    <div><b>${esc(ev.station)}</b><br>${esc(ev.title)}</div>
    <div class="countdown" data-when="${ev.when.toISOString()}">${until(ev.when.toISOString())}</div>
  </div>`).join("") || '<div class="muted">' + t('calendar.no_planned') + '</div>';
}

async function saveAll(){
  saveStatus.className="save-status muted";
  saveStatus.style.color="";
  saveStatus.textContent=t("common.saving");
  try{
    const cards=[...document.querySelectorAll("#cards .card")];
    if(!cards.length){
      throw new Error("No station form fields found.");
    }
    D.stations=cards.map(readCard);
    const r=await fetch("/api/save",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({stations:D.stations})
    });
    const j=await r.json();
    if(!r.ok || !j.ok){
      saveStatus.className="save-status save-bad";
      saveStatus.textContent=t("common.save_error") + " " + (j.message||("HTTP "+r.status));
      return;
    }
    saveStatus.className="save-status save-ok";
    saveStatus.textContent=t("common.saved");
    await fullLoad();
    if(typeof renderCalendar==="function") renderCalendar();
    setTimeout(()=>{saveStatus.textContent=""},4000);
  }catch(e){
    saveStatus.className="save-status save-bad";
    saveStatus.textContent=t("common.save_error") + " " + e;
  }
}

let draggedStationIndex=null;

function captureStationForms(){
  const cs=[...document.querySelectorAll("#cards .station-card")];
  if(cs.length) D.stations=cs.map(readCard);
}
function markOrderDirty(){
  saveStatus.className="save-status";
  saveStatus.style.color="#f59e0b";
  saveStatus.textContent=t("common.order_changed");
}
function moveStation(i,delta){
  captureStationForms();
  const j=i+delta;
  if(i<0||j<0||i>=D.stations.length||j>=D.stations.length)return;
  const [st]=D.stations.splice(i,1);
  D.stations.splice(j,0,st);
  render();
  markOrderDirty();
}
function dragStationStart(ev,i){
  captureStationForms();
  draggedStationIndex=i;
  ev.dataTransfer.effectAllowed="move";
  ev.dataTransfer.setData("text/plain",String(i));
  const card=ev.currentTarget.closest(".station-card");
  if(card) setTimeout(()=>card.classList.add("dragging"),0);
}
function clearDropMarks(){
  document.querySelectorAll("#cards .station-card").forEach(c=>c.classList.remove("drop-before","drop-after"));
}
function dragStationOver(ev,i){
  if(draggedStationIndex===null)return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect="move";
  clearDropMarks();
  const card=ev.currentTarget;
  const r=card.getBoundingClientRect();
  card.classList.add(ev.clientY < r.top+r.height/2 ? "drop-before" : "drop-after");
}
function dragStationLeave(ev){
  const card=ev.currentTarget;
  if(!card.contains(ev.relatedTarget)) card.classList.remove("drop-before","drop-after");
}
function dropStation(ev,targetIndex){
  if(draggedStationIndex===null)return;
  ev.preventDefault();
  const from=draggedStationIndex;
  const card=ev.currentTarget;
  const r=card.getBoundingClientRect();
  const after=ev.clientY >= r.top+r.height/2;
  let insertAt=targetIndex+(after?1:0);
  const [st]=D.stations.splice(from,1);
  if(insertAt>from)insertAt--;
  insertAt=Math.max(0,Math.min(D.stations.length,insertAt));
  D.stations.splice(insertAt,0,st);
  draggedStationIndex=null;
  clearDropMarks();
  render();
  markOrderDirty();
}
function dragStationEnd(){
  draggedStationIndex=null;
  clearDropMarks();
  document.querySelectorAll("#cards .station-card.dragging").forEach(c=>c.classList.remove("dragging"));
}

function add(){
  D.stations.push({name:t("stations.new_station"),url:"",codec:"aac",detected_ext:"aac",segment_minutes:60,retention_days:0,max_storage_gb:0,one_file_per_program:false,enabled:false,schedule:{}});
  render();
  window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
}
function removeStation(i){
  if(confirm(t("stations.delete_confirm"))){
    D.stations.splice(i,1);
    render();
  }
}
async function action(a,n){
  await fetch("/api/"+a+"?name="+encodeURIComponent(n),{method:"POST"});
  await statusLoad();
}
async function testStream(i){
  const c=document.querySelector(`.card[data-i="${i}"]`);
  const r=await fetch("/api/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:c.querySelector(".url").value})});
  const j=await r.json();
  if(j.ok){
    c.dataset.detectedExt=j.ext||"aac";
    c.querySelector(".res").textContent=` ${t('common.ok')} ${j.codec||""} / ${j.format||""} -> .${j.ext||"aac"}`;
  }else{
    c.querySelector(".res").textContent=` ${t('common.error')} ${j.message||t('common.unknown')}`;
  }
}
let LIBFILES=[];
function renderLibrary(){
  const q=(document.getElementById("libSearch")?.value||"").toLowerCase();
  const station=document.getElementById("libStation")?.value||"";
  const range=document.getElementById("libRange")?.value||"all";
  const now=Date.now();
  let rows=LIBFILES.filter(f=>{
    if(station && f.station!==station)return false;
    if(q && !(f.name+" "+f.station+" "+f.date).toLowerCase().includes(q))return false;
    if(range!=="all"){
      const days=+range;
      if((now-(f.mtime*1000)) > days*86400000)return false;
    }
    return true;
  });
  document.getElementById("libList").innerHTML=rows.map(f=>`<div class="card">
    <b>${esc(f.station)}</b> — ${esc(f.date)} — ${esc(f.name)} (${f.size})<br>
    <audio controls preload="none" src="/media?path=${encodeURIComponent(f.path)}"></audio>
    <a href="/media?download=1&path=${encodeURIComponent(f.path)}">${t('library.download')}</a>
    <button onclick="removeFile('${encodeURIComponent(f.path)}')">${t('library.delete')}</button>
  </div>`).join("") || '<div class="muted">' + t('library.no_match') + '</div>';
}
async function lib(){
  const j=await(await fetch("/api/library")).json();
  LIBFILES=j.files||[];
  const stations=[...new Set(LIBFILES.map(x=>x.station))].sort();
  library.innerHTML=`<h2>${t('library.title')}</h2>
    <div class="libtools">
      <input id="libSearch" placeholder="${t('library.search')}" oninput="renderLibrary()">
      <select id="libStation" onchange="renderLibrary()"><option value="">${t('library.all_stations')}</option>${stations.map(x=>`<option>${esc(x)}</option>`).join("")}</select>
      <select id="libRange" onchange="renderLibrary()"><option value="all">${t('library.full_archive')}</option><option value="1">${t('library.today')}</option><option value="7">${t('library.7days')}</option><option value="30">${t('library.30days')}</option><option value="90">${t('library.90days')}</option></select>
    </div><div id="libList"></div>`;
  renderLibrary();
}
async function removeFile(p){
  if(confirm(t("library.delete_confirm"))){
    await fetch("/api/delete?path="+p,{method:"POST"});
    await lib();
    await overview();
  }
}
async function stat(){
  const j=await(await fetch("/api/stats")).json();
  stats.innerHTML="<h2>" + t("stats.title") + "</h2>"+j.map(x=>`<div class="card"><h3>${esc(x.station)}</h3>${x.files} ${t('stats.files_count')} • ${x.size}</div>`).join("");
}
function calendarUrl(){
  const token=window.CALENDAR_TOKEN||"";
  return token?("/calendar.ics?token="+encodeURIComponent(token)):"/calendar.ics";
}

function backup(){ location="/api/backup"; }
async function importBackup(input,mode="merge"){
  const file=input.files?.[0];
  if(!file)return;
  const replacing=mode==="replace";
  const question=replacing
    ? t("common.confirm_restore")
    : t("common.confirm_merge");
  if(!confirm(question)){
    input.value="";
    return;
  }
  try{
    const text=await file.text();
    const r=await fetch("/api/import-backup?mode="+encodeURIComponent(mode),{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:text
    });
    const j=await r.json();
    if(!r.ok||!j.ok){
      alert(t("common.import_error") + " " + (j.message||j.error||("HTTP "+r.status)));
      input.value="";
      return;
    }
    if(j.mode==="merge"){
      alert(t("common.merge_done", j));
    }else{
      alert(t("common.restore_done", j));
    }
    input.value="";
    await fullLoad();
    if(typeof renderToday==="function")renderToday();
    if(typeof renderCalendar==="function")renderCalendar();
  }catch(e){
    alert(t("common.import_error") + " " + e);
    input.value="";
  }
}

async function overview(){
  const j=await(await fetch("/api/overview")).json();
  stStations.textContent=j.stations;
  stRecording.textContent=j.recording;
  stFiles.textContent=j.files;
  stSize.textContent=j.size;
  stFree.textContent=j.free||"—";
  if(j.disk_total_bytes){
    const pct=Math.max(0,Math.min(100,(j.disk_used_bytes/j.disk_total_bytes)*100));
    diskFill.style.width=pct.toFixed(1)+"%";
    diskText.textContent=pct.toFixed(1)+"% • "+j.disk_used+" / "+j.disk_total;
  }
  (j.station_usage||[]).forEach(x=>{
    const sel=`[data-station="${CSS.escape(x.station)}"]`;
    const text=document.querySelector(".station-storage-text"+sel);
    const fill=document.querySelector(".station-storage-fill"+sel);
    if(text) text.textContent=x.limit_bytes>0 ? `${x.size} / ${x.limit}` : `${x.size}`;
    if(fill){
      const pct=x.limit_bytes>0 ? Math.min(100,(x.bytes/x.limit_bytes)*100) : Math.min(100,x.relative_percent||0);
      fill.style.width=pct.toFixed(1)+"%";
    }
  });
}

async function loadHealth(){
  const box=document.getElementById("healthList");
  if(!box)return;
  box.innerHTML='<span class="muted">' + t('streams.checking') + '</span>';
  try{
    const r=await fetch("/api/health",{cache:"no-store"});
    const j=await r.json();
    if(!r.ok){
      box.innerHTML=`<div class="danger">${t('streams.error')} HTTP ${r.status}: ${esc(j.message||j.error||"")}</div>`;
      return;
    }
    const items=Object.entries(j.stations||{});
    if(!items.length){
      box.innerHTML='<div class="muted">' + t('streams.no_data') + '</div>';
      return;
    }
    box.innerHTML='<div class="health-grid">'+items.map(([name,x])=>{
      const checks=+x.checks||0, oks=+x.ok||0;
      const pct=checks?Math.round(oks/checks*100):0;
      const status=x.last_status||"unknown";
      const cls=status==="online"?"health-online":(status==="offline"?"health-offline":"health-unknown");
      return `<div class="health-card">
        <h3>${esc(name)}</h3>
        <div class="${cls}"><b>${esc(status.toUpperCase())}</b></div>
        <div class="muted">${esc(x.codec||"")} ${esc(x.format||"")}${x.bit_rate?" • "+Math.round((+x.bit_rate)/1000)+" kb/s":""}</div>
        ${x.now_playing?`<div class="nowplaying">${t('streams.now_playing')} <b>${esc(x.now_playing)}</b></div>`:""}
        <div class="muted">${t('streams.stability')} ${pct}% (${oks}/${checks})</div>
        <div class="healthbar"><div style="width:${pct}%"></div></div>
        ${x.last_error?`<div class="danger">${esc(x.last_error)}</div>`:""}
        <div class="muted">${t('streams.last_test')} ${esc(x.last_check||"—")}</div>
      </div>`;
    }).join("")+'</div>';
  }catch(e){
    box.innerHTML=`<div class="danger">${t('streams.error')} ${esc(e)}</div>`;
  }
}

async function loadHistory(){
  const box=document.getElementById("execHistory");
  if(!box)return;
  box.innerHTML='<span class="muted">' + t('history.loading') + '</span>';
  try{
    const r=await fetch("/api/executions",{cache:"no-store"});
    const j=await r.json();
    if(!r.ok)throw new Error(j.message||j.error||`HTTP ${r.status}`);
    const rows=[...(j.executions||[])].reverse();
    box.innerHTML=rows.length?rows.map(x=>`<div class="tl-item exec-${esc(x.status||"warning")}">
      <b>${esc(x.station||"—")}</b>${x.title?` — ${esc(x.title)}`:""}
      <div class="muted">${esc(x.started||"—")} → ${esc(x.ended||"—")}</div>
      <div>${t('history.status')} <b>${esc(x.status||"—")}</b> • ${t('history.format')} ${esc(x.output_ext||"—")} • ${t('history.ffmpeg_code')} ${x.return_code??"—"}</div>
      <div>${t('history.file')} ${esc(x.file||t('common.none'))} • ${fmtBytes(x.size||0)}</div>
    </div>`).join(""):'<div class="muted">No history yet.</div>';
  }catch(e){
    box.innerHTML=`<div class="danger">${esc(e)}</div>`;
  }
}

function tickClocks(){
  document.querySelectorAll(".duration").forEach(el=>{
    el.textContent=durationFrom(el.dataset.start);
  });
  document.querySelectorAll(".countdown").forEach(el=>{
    el.textContent=until(el.dataset.when);
  });
}

async function statusLoad(){
  const r=await fetch("/api/status",{cache:"no-store"});
  D.status=await r.json();
  overview();
}
async function fullLoad(){
  const r=await fetch("/api/stations",{cache:"no-store"});
  D.stations=await r.json();
  await statusLoad();
  render();
  renderToday();
  renderCalendar();
}

window.addEventListener("load",()=>{
  fullLoad();
  setInterval(statusLoad,10000);
  setInterval(tickClocks,1000);
});

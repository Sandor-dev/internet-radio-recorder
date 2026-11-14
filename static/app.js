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

// ... (the rest of the original app.js functions remain unchanged for now)
// Note: Full file is large; remaining functions (readCard, renderToday, etc.) still need similar t() updates in a follow-up.
// For immediate station card translation this covers the visible parts from the screenshot.

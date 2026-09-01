const THEME_KEY = '2026B_THEME';
const ACCENT_KEY = '2026B_ACCENT';
const ACCENTS = {
  violet: { name:'Violet', accent:'#655cf6', accent2:'#8a74ff', rgb:'101 92 246' },
  blue: { name:'Ocean Blue', accent:'#3b82f6', accent2:'#60a5fa', rgb:'59 130 246' },
  cyan: { name:'Cyan', accent:'#06b6d4', accent2:'#22d3ee', rgb:'6 182 212' },
  emerald: { name:'Emerald', accent:'#10b981', accent2:'#34d399', rgb:'16 185 129' },
  rose: { name:'Rose', accent:'#f43f5e', accent2:'#fb7185', rgb:'244 63 94' },
  amber: { name:'Amber', accent:'#f59e0b', accent2:'#fbbf24', rgb:'245 158 11' }
};
const DAYS = ['Senin','Selasa','Rabu','Kamis','Jumat'];
const MINUTES_START = 7 * 60;
const MINUTES_END = 21 * 60;
const CLASS_PJ = 'Tisha Farica Tsaqif';
const CATEGORIES = { MKWK: new Set(['pancasila-067','pancasila-068','literasi-050','literasi-051']) };
const HALF_HOUR_PX = 34;

const PJS = [
  { name: "Husna Nafi'ah Zulfa", nim: '26112224076', code: '076', course: 'Pancasila' },
  { name: 'David Antoni', nim: '26112224044', code: '044', course: 'Etika Bisnis & Profesi' },
  { name: 'Nova Risqy Fatur Fadillah', nim: '26112224057', code: '057', course: 'Hukum Bisnis' },
  { name: 'Zhevira Threevia Nur Wardiny', nim: '26112224104', code: '104', course: 'Literasi Digital' },
  { name: 'Atha Bagus Arifianto', nim: '26112224084', code: '084', course: 'Akuntansi Pengantar' },
  { name: 'Adelia Putri Maharani', nim: '26112224051', code: '051', course: 'Hukum Pajak' },
  { name: 'Fairus Eva Ghanesa', nim: '26112224007', code: '007', course: 'Sistem Informasi Akuntansi' },
  { name: 'Ayank Naura Tita', nim: '26112224077', code: '077', course: 'Statistik' }
];

const seedCourses = [
  { id:'pancasila-067', name:'Pancasila', code:'067', day:0, start:'08:40', end:'10:20', room:'', mode:'Virtual', lecturer:'', status:'Tetap' },
  { id:'pancasila-068', name:'Pancasila', code:'068', day:0, start:'08:40', end:'10:20', room:'', mode:'Virtual', lecturer:'', status:'Tetap' },
  { id:'etika-bisnis-profesi', name:'Etika Bisnis & Profesi', code:'', day:1, start:'09:30', end:'12:00', room:'MG1.02.07', mode:'Tatap Muka', lecturer:'', status:'Tetap' },
  { id:'hukum-bisnis', name:'Hukum Bisnis', code:'', day:1, start:'13:00', end:'15:30', room:'', mode:'Virtual', lecturer:'', status:'Tetap' },
  { id:'literasi-050', name:'Literasi Digital', code:'050', day:2, start:'07:00', end:'08:40', room:'', mode:'Virtual', lecturer:'', status:'Tetap' },
  { id:'literasi-051', name:'Literasi Digital', code:'051', day:2, start:'07:00', end:'08:40', room:'', mode:'Virtual', lecturer:'', status:'Tetap' },
  { id:'akuntansi-pengantar', name:'Akuntansi Pengantar', code:'', day:2, start:'13:00', end:'15:30', room:'MG1.02.07', mode:'Tatap Muka', lecturer:'', status:'Tetap' },
  { id:'hukum-pajak', name:'Hukum Pajak', code:'', day:3, start:'13:00', end:'15:30', room:'MG1.04.03', mode:'Tatap Muka', lecturer:'', status:'Tetap' },
  { id:'sistem-informasi-akuntansi', name:'Sistem Informasi Akuntansi', code:'', day:3, start:'15:30', end:'18:00', room:'MG1.02.07', mode:'Tatap Muka', lecturer:'', status:'Tetap' },
  { id:'statistik', name:'Statistik', code:'', day:4, start:'18:00', end:'20:30', room:'MG1.02.07', mode:'Tatap Muka', lecturer:'', status:'Tetap' }
];

let state = { courses: [], changes: [] };
let currentWeek = startOfWeek(new Date());
let loggedInAs = null;
let editorCourseId = null;
let editorMode = 'course';
let supabaseClient = null;
let activeCategory = 'MKWU';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
function pad2(n){ return String(n).padStart(2,'0'); }
function fmtDateISO(date){ return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`; }
function parseISO(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function startOfWeek(date){ const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()); const offset=(d.getDay()+6)%7; d.setDate(d.getDate()-offset); return d; }
function addDays(date,n){ const d=new Date(date); d.setDate(d.getDate()+n); return d; }
function weekKey(date){ return fmtDateISO(startOfWeek(date)); }
function formatDayDate(date){ return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short'}).format(date); }
function formatRange(weekStart){ const weekEnd=addDays(weekStart,4); const fmt=new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long'}); return `${fmt.format(weekStart)} – ${fmt.format(weekEnd)}`; }
function formatFullDate(date){ return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(date); }
function timeToMin(t){ const [h,m]=String(t).slice(0,5).split(':').map(Number); return h*60+m; }
function formatTimeRange(start,end){ return `${String(start).slice(0,5)}–${String(end).slice(0,5)}`; }
function getDateForCourse(course, weekStart){ return addDays(weekStart, course.day); }
function weekdayOf(date){ return (date.getDay()+6)%7; }
function clone(v){ return JSON.parse(JSON.stringify(v)); }

function setConnectionStatus(text, isError=false){
  const el=$('#dataConnectionStatus');
  if(el){ el.textContent=text; el.style.color=isError?'var(--danger)':''; }
}

function normalizeSupabaseUrl(value){
  const raw=String(value??'').trim();
  if(!raw) throw new Error('SUPABASE_URL belum diisi di config.js.');
  if(!/^https?:\/\//i.test(raw)) throw new Error('SUPABASE_URL harus diawali http:// atau https://.');

  let u;
  try{ u=new URL(raw); }
  catch{ throw new Error('SUPABASE_URL tidak valid. Salin Project URL dari Supabase Dashboard → Settings → API.'); }

  // URL Dashboard: https://supabase.com/dashboard/project/<ref>
  const dashboardMatch=u.hostname==='supabase.com' ? u.pathname.match(/^\/dashboard\/project\/([a-z0-9]+)(?:\/|$)/i) : null;
  if(dashboardMatch) return `https://${dashboardMatch[1]}.supabase.co`;

  // Untuk project URL, path seperti /rest/v1 atau path lain dibuang.
  // Supabase JS membutuhkan origin project, bukan endpoint REST.
  return u.origin;
}

function initSupabase(){
  const cfg=window.APP_CONFIG || {};
  if(!cfg.SUPABASE_ENABLED) throw new Error('Supabase masih dinonaktifkan di config.js.');
  if(!window.supabase?.createClient) throw new Error('Supabase JS gagal dimuat. Periksa koneksi internet.');
  if(!cfg.SUPABASE_URL || String(cfg.SUPABASE_URL).includes('PASTE_SUPABASE')) throw new Error('SUPABASE_URL belum diisi di config.js.');
  if(!cfg.SUPABASE_ANON_KEY || String(cfg.SUPABASE_ANON_KEY).includes('PASTE_SUPABASE')) throw new Error('SUPABASE_ANON_KEY belum diisi di config.js.');

  const normalizedUrl=normalizeSupabaseUrl(cfg.SUPABASE_URL);
  supabaseClient=window.supabase.createClient(normalizedUrl,String(cfg.SUPABASE_ANON_KEY).trim(),{auth:{persistSession:false,autoRefreshToken:false}});
}

function courseFromRow(r){
  return { id:r.id, name:r.name, code:r.code||'', day:Number(r.original_day), start:String(r.original_start).slice(0,5), end:String(r.original_end).slice(0,5), room:r.room||'', mode:r.mode||'Virtual', lecturer:r.lecturer||'', status:r.status||'Tetap' };
}
function changeFromRow(r){
  return { id:r.id, course_id:r.course_id, week_key:r.week_key, original_date:r.original_date||'', new_date:r.new_date||'', new_start:r.new_start?String(r.new_start).slice(0,5):'', new_end:r.new_end?String(r.new_end).slice(0,5):'', status:r.status||'Dipindahkan', mode:r.mode||'Virtual', room:r.room||'', note:r.note||'', edited_by:r.edited_by_name||r.edited_by||'—', updated_at:r.updated_at||new Date().toISOString() };
}

async function loadRemoteState(){
  setConnectionStatus('Mengambil data…');
  const [{data:courses,error:cErr},{data:changes,error:mErr}]=await Promise.all([
    supabaseClient.from('courses').select('*').order('original_day').order('original_start'),
    supabaseClient.from('meeting_changes_view').select('*').order('updated_at',{ascending:false})
  ]);
  if(cErr) throw cErr;
  if(mErr) throw mErr;
  state={courses:(courses||[]).map(courseFromRow),changes:(changes||[]).map(changeFromRow)};
  if(!state.courses.length){
    state={courses:clone(seedCourses),changes:[]};
    throw new Error('Tabel courses kosong. Jalankan schema.sql agar data awal 10 kelas dibuat.');
  }
  setConnectionStatus('● Online');
}

async function refreshRemoteState(silent=false){
  try{ await loadRemoteState(); render(); if(!silent) showToast('Data terbaru sudah dimuat.','success'); }
  catch(e){ console.error(e); setConnectionStatus('Database gagal dibaca',true); if(!silent) showToast(`Gagal memuat database: ${e.message}`,'error'); }
}

function subscribeRealtime(){
  const channel=supabaseClient.channel('2026b-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'courses'},()=>refreshRemoteState(true))
    .on('postgres_changes',{event:'*',schema:'public',table:'meeting_changes'},()=>refreshRemoteState(true))
    .subscribe((status)=>{ if(status==='SUBSCRIBED') setConnectionStatus('● Live / Realtime'); });
  return channel;
}

function getChange(courseId,wkKey){ return state.changes.find(c=>c.course_id===courseId && c.week_key===wkKey); }
function getEffective(course,wkStart){
  const wk=weekKey(wkStart); const change=getChange(course.id,wk);
  if(!change) return {course,moved:false,date:getDateForCourse(course,wkStart),start:course.start,end:course.end,mode:course.mode,room:course.room,status:course.status,change:null};
  const date=change.new_date?parseISO(change.new_date):getDateForCourse(course,wkStart);
  return {course,moved:change.status==='Dipindahkan',date,start:change.new_start||course.start,end:change.new_end||course.end,mode:change.mode||course.mode,room:change.room??course.room,status:change.status||'Dipindahkan',change};
}


function isCourseInCategory(course, category){
  return category === 'MKWK' ? CATEGORIES.MKWK.has(course.id) : !CATEGORIES.MKWK.has(course.id);
}
function visibleCourses(){
  return state.courses.filter(c=>isCourseInCategory(c, activeCategory));
}
function findPjName(change){
  return change?.edited_by || change?.edited_by_name || '—';
}
function describeChangeTiming(course, change){
  const originalDate = change?.original_date ? parseISO(change.original_date) : getDateForCourse(course,currentWeek);
  const newDate = change?.new_date ? parseISO(change.new_date) : originalDate;
  const daysBetweenWeeks = (startOfWeek(newDate)-startOfWeek(originalDate))/86400000;
  if(daysBetweenWeeks > 0){
    return `Perubahan - Minggu depan, ${new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(newDate)}`;
  }
  return `Perubahan - ${new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(newDate)}`;
}
function groupEffectiveCourses(courses){
  const groups = new Map();
  for(const course of courses){
    const e = getEffective(course,currentWeek);
    const day = weekdayOf(e.date);
    if(day<0 || day>4) continue;
    const key = [course.name.trim().toLowerCase(), day, e.start, e.end, e.mode || '', e.room || ''].join('|');
    if(!groups.has(key)) groups.set(key,{day,start:e.start,end:e.end,items:[]});
    groups.get(key).items.push({course,e});
  }
  return [...groups.values()];
}
function render(){
  $('#weekLabel').textContent=formatRange(currentWeek); $('#changesWeekHint').textContent=formatRange(currentWeek);
  const today=new Date();
  const todayKey=fmtDateISO(today);
  for(let i=0;i<5;i++){
    const date=addDays(currentWeek,i);
    $('#date-'+(i+1)).textContent=formatDayDate(date);
    const isToday=fmtDateISO(date)===todayKey;
    const head=document.querySelector(`.day-head[data-day=\"${i+1}\"]`);
    const col=document.querySelector(`.day-column[data-day-col=\"${i+1}\"]`);
    head?.classList.toggle('today',isToday);
    col?.classList.toggle('today',isToday);
  }
  renderTimeline(); renderHistory(); renderAdmin();
  $('#courseCount').textContent=state.courses.length;
  $('#changeCount').textContent=state.changes.filter(c=>c.week_key===weekKey(currentWeek)).length;
  $('#mkwuCount').textContent=`${new Set(state.courses.filter(c=>isCourseInCategory(c,'MKWU')).map(c=>c.name)).size} mata kuliah`;
  $('#mkwkCount').textContent=`${new Set(state.courses.filter(c=>isCourseInCategory(c,'MKWK')).map(c=>c.name)).size} mata kuliah`;
  $('#tabMKWU').classList.toggle('active',activeCategory==='MKWU');
  $('#tabMKWK').classList.toggle('active',activeCategory==='MKWK');
}
function renderTimeline(){
  const timeAxis=$('#timeAxis'); timeAxis.innerHTML='';
  for(let min=MINUTES_START;min<MINUTES_END;min+=30){
    const label=document.createElement('div'); label.className='time-slot-label';
    label.textContent=`${pad2(Math.floor(min/60))}.${pad2(min%60)}`; timeAxis.appendChild(label);
  }
  $$('.day-column').forEach(col=>col.innerHTML='');
  for(const group of groupEffectiveCourses(visibleCourses())){
    const col=document.querySelector(`[data-day-col="${group.day+1}"]`); if(!col) continue;
    const moved=group.items.some(x=>x.e.moved);
    const block=document.createElement('div'); block.className='course-block'+(moved?' moved':'');
    const top=(timeToMin(group.start)-MINUTES_START)*(HALF_HOUR_PX/30);
    const h=Math.max(52,(timeToMin(group.end)-timeToMin(group.start))*(HALF_HOUR_PX/30));
    block.style.top=`${top}px`; block.style.height=`${h}px`; block.innerHTML=courseGroupHtml(group); col.appendChild(block);
  }
  for(const col of $$('.day-column')) if(!col.children.length){
    const empty=document.createElement('div'); empty.className='empty-day'; empty.textContent='Tidak ada kelas'; col.appendChild(empty);
  }
}
function courseGroupHtml(group){
  const first=group.items[0];
  const codes=group.items.map(({course})=>course.code).filter(Boolean);
  const code=codes.length ? `<div class="course-group-code">KODE ${codes.map(escapeHtml).join('<span class="amp">&amp;</span>')}</div>` : '';
  const room=first.e.room?`<span>📍 ${escapeHtml(first.e.room)}</span>`:'';
  const lecturers=[...new Set(group.items.map(({course})=>course.lecturer).filter(Boolean))];
  const lecturerText=lecturers.length ? lecturers.join(', ') : 'Dosen Pengampu —';
  const lecturer=`<span>👨‍🏫 ${escapeHtml(lecturerText)}</span>`;
  const status=group.items.some(x=>x.e.moved) ? '<span class="course-badge moved-badge">🔄 Dipindahkan</span>' : '<span class="course-badge">✅ Tetap</span>';
  const mode=first.e.mode==='Virtual' ? '<span class="course-badge">💻 Virtual</span>' : '<span class="course-badge">🏫 Tatap Muka</span>';
  const actions=loggedInAs ? `<div class="course-group-actions">${group.items.map(({course})=>`<button class="mini-button" data-action="edit-meeting" data-course-id="${escapeAttr(course.id)}">🔄 ${escapeHtml(course.code||course.name)}</button>`).join('')}</div>`:'';
  return `<div class="course-name">${escapeHtml(first.course.name)}</div>${code}<div class="course-time">${formatTimeRange(group.start,group.end)}</div><div class="course-meta">${room}${room?' · ':''}${lecturer}</div><div class="course-badges">${status}${mode}</div>${actions}`;
}

function renderHistory(){
  const list=$('#changeHistoryList');
  const changes=state.changes
    .filter(c=>c.week_key===weekKey(currentWeek))
    .filter(c=>state.courses.some(course=>course.id===c.course_id && isCourseInCategory(course,activeCategory)))
    .sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
  if(!changes.length){
    list.innerHTML=`<div class="empty-history">Belum ada perubahan untuk ${activeCategory} pada minggu ${escapeHtml(formatRange(currentWeek))}. Jadwal original tetap digunakan.</div>`;
    return;
  }
  list.innerHTML=changes.map(c=>{
    const course=state.courses.find(x=>x.id===c.course_id); if(!course) return '';
    const originalDate=c.original_date?parseISO(c.original_date):getDateForCourse(course,currentWeek);
    const original=`${new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(originalDate)} ${course.start}–${course.end}`;
    const date=c.new_date?parseISO(c.new_date):originalDate;
    const current=`${new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(date)} ${c.new_start||course.start}–${c.new_end||course.end}`;
    const timing=describeChangeTiming(course,c);
    return `<article class="history-card">
      <div class="history-top"><div><div class="history-title">${escapeHtml(course.name)}${course.code?` · ${escapeHtml(course.code)}`:''}</div></div><span class="history-badge">${escapeHtml(timing)}</span></div>
      <div class="history-grid"><div class="history-box"><small>Original</small><strong>${escapeHtml(original)}</strong></div><div class="history-arrow">→</div><div class="history-box"><small>Perubahan</small><strong>${escapeHtml(current)}</strong></div></div>
      <div class="history-footer"><span>📅 Berlaku: ${escapeHtml(formatRange(currentWeek))}</span><span>${c.mode==='Virtual'?'💻 Virtual':'🏫 Tatap Muka'}</span>${c.room?`<span>📍 ${escapeHtml(c.room)}</span>`:''}<span>👨‍🏫 Dosen: ${escapeHtml(course.lecturer || 'Dosen Pengampu —')}</span></div>
      ${c.note?`<div class="history-note">📝 ${escapeHtml(c.note)}</div>`:''}
    </article>`;
  }).join('');
}

function renderAdmin(){
  const section=$('#adminSection'); if(!loggedInAs){ section.classList.add('hidden'); return; } section.classList.remove('hidden');
  $('#adminGrid').innerHTML=visibleCourses().map(c=>`<article class="admin-course-card"><div class="admin-course-top"><div><div class="admin-course-name">${escapeHtml(c.name)}${c.code?` — ${escapeHtml(c.code)}`:''}</div><div class="admin-course-sub">${DAYS[c.day]} · ${c.start}–${c.end} · ${c.mode}</div></div><span class="role-badge">Admin</span></div><div class="admin-actions"><button class="mini-button" data-action="edit-course" data-course-id="${escapeAttr(c.id)}">✏️ Edit Jadwal</button><button class="mini-button" data-action="edit-meeting" data-course-id="${escapeAttr(c.id)}">🔄 Edit Pertemuan</button></div></article>`).join('');
}
function openModal(id){ const el=document.getElementById(id); if(el) el.classList.remove('hidden'); }
function closeModal(id){ const el=document.getElementById(id); if(el) el.classList.add('hidden'); }
function openEditor(courseId,mode){ if(!loggedInAs){showToast('Login PJ diperlukan.','error');return;} const course=state.courses.find(c=>c.id===courseId); if(!course) return; editorCourseId=courseId; setEditorMode(mode); $('#editorKicker').textContent=mode==='course'?'BASE / ORIGINAL SCHEDULE':'WEEKLY MEETING OVERRIDE'; $('#editorTitle').textContent=`${course.name}${course.code?` — ${course.code}`:''}`; populateCourseForm(course); populateMeetingForm(course); openModal('editorModal'); }
function populateCourseForm(c){ $('#courseIdField').value=c.id; $('#courseName').value=c.name; $('#courseCode').value=c.code; $('#courseDay').value=String(c.day); $('#courseStart').value=c.start; $('#courseEnd').value=c.end; $('#courseRoom').value=c.room; $('#courseMode').value=c.mode; $('#courseLecturer').value=c.lecturer; $('#courseStatus').value=c.status; }
function populateMeetingForm(c){ const wk=weekKey(currentWeek),change=getChange(c.id,wk),originalDate=getDateForCourse(c,currentWeek); $('#meetingCourseId').value=c.id; $('#meetingWeek').value=wk; $('#meetingWeekCaption').textContent=`Minggu aktif: ${formatRange(currentWeek)}`; $('#meetingStatus').value=change?.status||'Tetap'; $('#meetingDate').value=change?.new_date||fmtDateISO(originalDate); $('#meetingStart').value=change?.new_start||c.start; $('#meetingEnd').value=change?.new_end||c.end; $('#meetingMode').value=change?.mode||c.mode; $('#meetingRoom').value=change?.room??c.room; $('#meetingNote').value=change?.note||''; $('#deleteMeetingButton').disabled=!change; $('#deleteMeetingButton').style.opacity=change?'1':'.5'; updateOverridePreview(c,change); }
function updateOverridePreview(c,change){ const original=`${DAYS[c.day]} ${c.start}–${c.end}`; if(!change){ $('#overridePreview').innerHTML=`<strong>Belum ada override untuk minggu ini.</strong><br>Jika Anda menyimpan perubahan, data hanya tersimpan pada <strong>${escapeHtml(formatRange(currentWeek))}</strong>.`; return; } const date=change.new_date?parseISO(change.new_date):getDateForCourse(c,currentWeek); $('#overridePreview').innerHTML=`<strong>Override aktif.</strong><br>Original: ${escapeHtml(original)} → Perubahan: ${escapeHtml(new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(date)+' '+(change.new_start||c.start)+'–'+(change.new_end||c.end))}<br>Berlaku hanya untuk minggu <strong>${escapeHtml(formatRange(currentWeek))}</strong>.`; }
function setEditorMode(mode){ editorMode=mode; $('#tabCourse').classList.toggle('active',mode==='course'); $('#tabMeeting').classList.toggle('active',mode==='meeting'); $('#courseForm').classList.toggle('hidden',mode!=='course'); $('#meetingForm').classList.toggle('hidden',mode!=='meeting'); }

async function doLogin(e){
  e.preventDefault(); const name=$('#loginPJ').value; const code=$('#loginCode').value.trim();
  if(!name||!/^\d{3}$/.test(code)){showToast('Pilih PJ dan masukkan 3 digit kode NIM.','error');return;}
  try{
    const {data,error}=await supabaseClient.rpc('verify_pj',{p_name:name,p_code:code});
    if(error) throw error;
    if(!data?.valid){showToast('Nama PJ atau 3 digit NIM tidak cocok.','error');return;}
    loggedInAs={name:data.name,code};
    $('#adminNameLabel').textContent=loggedInAs.name; $('#adminIdentity').classList.remove('hidden'); $('#loginButton').classList.add('hidden'); $('#logoutButton').classList.remove('hidden');
    closeModal('loginModal'); render(); showToast(`Login berhasil sebagai ${data.name}.`,'success');
  }catch(err){console.error(err);showToast(`Login gagal: ${err.message}`,'error');}
}
function doLogout(){ loggedInAs=null; $('#adminIdentity').classList.add('hidden'); $('#loginButton').classList.remove('hidden'); $('#logoutButton').classList.add('hidden'); closeModal('editorModal'); render(); showToast('Anda telah logout.','success'); }

async function saveCourse(e){
  e.preventDefault(); if(!loggedInAs) return;
  const c=state.courses.find(x=>x.id===$('#courseIdField').value); if(!c) return;
  const payload={p_name:loggedInAs.name,p_code:loggedInAs.code,p_course_id:c.id,p_course_name:$('#courseName').value.trim(),p_code_value:$('#courseCode').value.trim(),p_day:Number($('#courseDay').value),p_start:$('#courseStart').value,p_end:$('#courseEnd').value,p_room:$('#courseRoom').value.trim(),p_mode:$('#courseMode').value,p_lecturer:$('#courseLecturer').value.trim(),p_status:$('#courseStatus').value};
  try{ const {error}=await supabaseClient.rpc('update_course_by_pj',payload); if(error) throw error; closeModal('editorModal'); await refreshRemoteState(true); showToast('Jadwal original berhasil disimpan ke Supabase.','success'); }
  catch(err){ console.error(err); showToast(`Gagal menyimpan jadwal: ${err.message}`,'error'); }
}
async function saveMeeting(e){
  e.preventDefault(); if(!loggedInAs) return;
  const courseId=$('#meetingCourseId').value; const c=state.courses.find(x=>x.id===courseId); if(!c) return; const wk=$('#meetingWeek').value;
  if(wk!==weekKey(currentWeek)){showToast('Form ini dikunci untuk minggu yang sedang dibuka.','error');return;}
  const existing=getChange(courseId,wk); const payload={p_name:loggedInAs.name,p_code:loggedInAs.code,p_course_id:courseId,p_week_key:wk,p_original_date:fmtDateISO(getDateForCourse(c,currentWeek)),p_new_date:$('#meetingDate').value,p_new_start:$('#meetingStart').value,p_new_end:$('#meetingEnd').value,p_status:$('#meetingStatus').value,p_mode:$('#meetingMode').value,p_room:$('#meetingRoom').value.trim(),p_note:$('#meetingNote').value.trim(),p_existing_id:existing?.id||null};
  try{ const {error}=await supabaseClient.rpc('upsert_meeting_change_by_pj',payload); if(error) throw error; closeModal('editorModal'); await refreshRemoteState(true); showToast('Perubahan pertemuan tersimpan di Supabase untuk minggu ini saja.','success'); }
  catch(err){console.error(err);showToast(`Gagal menyimpan perubahan: ${err.message}`,'error');}
}
async function deleteMeeting(){
  if(!loggedInAs)return; const courseId=$('#meetingCourseId').value,wk=weekKey(currentWeek);
  try{ const {error}=await supabaseClient.rpc('delete_meeting_change_by_pj',{p_name:loggedInAs.name,p_code:loggedInAs.code,p_course_id:courseId,p_week_key:wk}); if(error) throw error; closeModal('editorModal'); await refreshRemoteState(true); showToast('Perubahan minggu ini dihapus; jadwal original kembali.','success'); }
  catch(err){console.error(err);showToast(`Gagal menghapus perubahan: ${err.message}`,'error');}
}

function setupTheme(){ const saved=localStorage.getItem(THEME_KEY); const prefers=window.matchMedia?.('(prefers-color-scheme: dark)').matches; applyTheme(saved||'dark',false); applyAccent(localStorage.getItem(ACCENT_KEY)||'violet',false); renderAccentPicker(); }
function applyTheme(theme,save=true){ document.documentElement.dataset.theme=theme; $('#themeIcon').textContent=theme==='dark'?'☀️':'🌙'; if(save)localStorage.setItem(THEME_KEY,theme); }
function toggleTheme(){ applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'); }
function applyAccent(name,save=true){ const cfg=ACCENTS[name]||ACCENTS.violet; const root=document.documentElement; root.dataset.accent=name||'violet'; root.style.setProperty('--accent',cfg.accent); root.style.setProperty('--accent-2',cfg.accent2); root.style.setProperty('--accent-rgb',cfg.rgb); if(save)localStorage.setItem(ACCENT_KEY,name||'violet'); renderAccentPicker(); }
function renderAccentPicker(){ const box=$('#themeSwatches'); if(!box)return; box.innerHTML=Object.entries(ACCENTS).map(([key,cfg])=>`<button type="button" class="theme-swatch" data-accent="${key}" title="${cfg.name}" aria-label="${cfg.name}" style="--swatch:${cfg.accent};--swatch-2:${cfg.accent2}"><span></span><b>${cfg.name}</b></button>`).join(''); box.querySelectorAll('[data-accent]').forEach(btn=>btn.addEventListener('click',()=>applyAccent(btn.dataset.accent)));}
function togglePalette(){ const p=$('#themePicker'); if(!p)return; const open=p.classList.toggle('hidden'); $('#paletteToggle').setAttribute('aria-expanded',String(!open)); }
function closePalette(){ const p=$('#themePicker'); if(p)p.classList.add('hidden'); $('#paletteToggle')?.setAttribute('aria-expanded','false'); }
function showToast(message,type='success'){ const box=document.createElement('div'); box.className=`toast ${type}`; box.textContent=message; $('#toastRegion').appendChild(box); setTimeout(()=>box.remove(),3400); }
function escapeHtml(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#096;'); }

async function init(){
  $('#loginPJ').innerHTML='<option value="">Pilih nama PJ…</option>'+PJS.map(p=>`<option value="${escapeAttr(p.name)}">${escapeHtml(p.name)}</option>`).join('');
  $('#courseDay').innerHTML=DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('');
  setupTheme();
  try{ initSupabase(); await loadRemoteState(); render(); subscribeRealtime(); }
  catch(err){ console.error(err); setConnectionStatus('Database belum terhubung',true); state={courses:clone(seedCourses),changes:[]}; render(); showToast(`Supabase belum siap: ${err.message}`,'error'); }
  finally { $('#loadingScreen')?.classList.add('hidden'); }

  $('#themeToggle').addEventListener('click',toggleTheme);
  $('#paletteToggle').addEventListener('click',(e)=>{e.stopPropagation();togglePalette();});
  document.addEventListener('click',(e)=>{if(!e.target.closest('.theme-picker-wrap'))closePalette();});
  $$('.category-tab').forEach(btn=>btn.addEventListener('click',()=>{ activeCategory=btn.dataset.category; render(); }));
  $('#prevWeek').addEventListener('click',()=>{currentWeek=addDays(currentWeek,-7);render();});
  $('#nextWeek').addEventListener('click',()=>{currentWeek=addDays(currentWeek,7);render();});
  $('#todayButton').addEventListener('click',()=>{currentWeek=startOfWeek(new Date());render();});
  $('#loginButton').addEventListener('click',()=>openModal('loginModal'));
  $('#logoutButton').addEventListener('click',doLogout);
  $('#loginForm').addEventListener('submit',doLogin);
  $('#courseForm').addEventListener('submit',saveCourse);
  $('#meetingForm').addEventListener('submit',saveMeeting);
  $('#deleteMeetingButton').addEventListener('click',deleteMeeting);
  $('#meetingStatus').addEventListener('change',()=>{if($('#meetingStatus').value==='Tetap'){const c=state.courses.find(c=>c.id===$('#meetingCourseId').value);if(c)$('#meetingDate').value=fmtDateISO(getDateForCourse(c,currentWeek));}});
  $$('.editor-tab').forEach(b=>b.addEventListener('click',()=>setEditorMode(b.dataset.mode)));
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  $$('.modal-backdrop').forEach(b=>b.addEventListener('click',(e)=>{if(e.target===b)closeModal(b.id);}));
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape'){closeModal('loginModal');closeModal('editorModal');}});
  document.addEventListener('click',(e)=>{const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,courseId=btn.dataset.courseId;if(action==='edit-course')openEditor(courseId,'course');if(action==='edit-meeting')openEditor(courseId,'meeting');});
}

document.addEventListener('mousemove',(e)=>{
  document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
  document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
});
document.addEventListener('DOMContentLoaded',init);

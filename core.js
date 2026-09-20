const CONFIG={sheetName:'Applications'};
const CLOSED=new Set(['Rejected','Role withdrawn','Recruitment cancelled','Ad closed']);
const ACTIVE=new Set(['Applied','Under review','Interview completed','No outcome found','CV acknowledged','Talent pool / EOI']);
const VIEWS=[['overview','Overview'],['pipeline','Pipeline'],['applications','Applications'],['deadlines','Deadlines'],['quality','Data quality']];
let state={rows:[],view:localStorage.getItem('jobDashView')||'overview',source:'',sheet:'',loadedAt:null,filter:'',status:'All',company:'All',hideClosed:true,sort:'deadline'};

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2400)}
function dateFrom(v){if(!v)return null;if(v instanceof Date&&!isNaN(v))return new Date(v);if(typeof v==='number'){const o=XLSX.SSF.parse_date_code(v);return o?new Date(o.y,o.m-1,o.d):null}const s=String(v).trim();const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);const d=new Date(s);return isNaN(d)?null:d}
function fmtDate(v){const d=dateFrom(v);return d?d.toLocaleDateString('en-AU',{day:'2-digit',month:'2-digit',year:'numeric'}):''}
function daysUntil(v){const d=dateFrom(v);if(!d)return null;const a=new Date();a.setHours(0,0,0,0);d.setHours(0,0,0,0);return Math.ceil((d-a)/86400000)}
function keyNorm(s){return String(s||'').trim().toLowerCase().replace(/\s+/g,' ')}
function statusClass(s){if(s==='Prepared')return'b-prepared';if(['Applied','Under review'].includes(s))return'b-active';if(['Interview completed','Talent pool / EOI','CV acknowledged'].includes(s))return'b-good';if(s==='No outcome found')return'b-warn';if(CLOSED.has(s))return'b-closed';return'b-neutral'}
function statusBadge(s){return `<span class="badge ${statusClass(s)}">${esc(s||'Unknown')}</span>`}
function shortStatus(s){return s==='Interview completed'?'Interview':s==='No outcome found'?'No outcome':s==='Recruitment cancelled'?'Cancelled':s}
function validateExtension(file){return /\.(xlsx|xls)$/i.test(file.name)}
function cleanUrl(v){const s=String(v||'').trim();return /^https?:\/\//i.test(s)?s:''}
function formulaUrl(f){const s=String(f||'');const m=s.match(/^HYPERLINK\(\s*"([^"]+)"/i);return m?cleanUrl(m[1].replace(/""/g,'"')):''}
function cellLink(cell){return cleanUrl(cell?.l?.Target)||formulaUrl(cell?.f)||cleanUrl(cell?.v)||cleanUrl(cell?.w)}
function linkFor(r,h){return cleanUrl(r._links?.[h])||cleanUrl(r[h])}
function usefulLinks(r){return [['Application folder','Folder'],['Tailored CV','CV'],['Cover letter','Cover'],['Dashboard','Dashboard'],['Apply link','Apply'],['Confirmation email','Confirmation'],['Latest email','Latest email']].map(([h,l])=>[l,linkFor(r,h)]).filter(x=>x[1])}
function effectiveDeadline(r){return r.Status==='Prepared'?r.Deadline:(r['Applied date']||r.Deadline)}
function preparedDeadlineSort(a,b){const da=dateFrom(a.Deadline),db=dateFrom(b.Deadline);if(!da&&!db)return String(a.Company||'').localeCompare(String(b.Company||''));if(!da)return-1;if(!db)return 1;return da-db||String(a.Company||'').localeCompare(String(b.Company||''))}
function deadlineSort(a,b){const aPrepared=a.Status==='Prepared',bPrepared=b.Status==='Prepared';const aPreparedBlank=aPrepared&&!dateFrom(a.Deadline),bPreparedBlank=bPrepared&&!dateFrom(b.Deadline);if(aPreparedBlank!==bPreparedBlank)return aPreparedBlank?-1:1;if(aPrepared!==bPrepared)return aPrepared?-1:1;const da=dateFrom(effectiveDeadline(a)),db=dateFrom(effectiveDeadline(b));if(!da&&!db)return String(a.Company||'').localeCompare(String(b.Company||''));if(!da)return 1;if(!db)return-1;return aPrepared?(da-db||String(a.Company||'').localeCompare(String(b.Company||''))):(db-da||String(a.Company||'').localeCompare(String(b.Company||'')))}

function parseWorkbook(buf,sourceLabel){
  const wb=XLSX.read(buf,{type:'array',cellDates:true,cellNF:true,cellText:true});
  const name=wb.SheetNames.includes(CONFIG.sheetName)?CONFIG.sheetName:wb.SheetNames[0];
  const ws=wb.Sheets[name];
  if(!ws||!ws['!ref'])throw new Error('No readable worksheet data found.');
  const range=XLSX.utils.decode_range(ws['!ref']);
  let headerRow=-1,headers=[];
  for(let r=range.s.r;r<=Math.min(range.e.r,25);r++){
    const vals=[];
    for(let c=range.s.c;c<=range.e.c;c++){
      const cell=ws[XLSX.utils.encode_cell({r,c})];
      vals.push(cell?String(cell.w??cell.v??'').trim():'');
    }
    if(vals.includes('Applied date')&&vals.includes('Company')&&vals.includes('Role')&&vals.includes('Status')){headerRow=r;headers=vals;break}
  }
  if(headerRow<0)throw new Error('Could not find the application table headers.');
  const rows=[];
  for(let r=headerRow+1;r<=range.e.r;r++){
    const row={_row:r+1,_links:{}};
    headers.forEach((h,i)=>{
      if(!h)return;
      const c=range.s.c+i,cell=ws[XLSX.utils.encode_cell({r,c})];
      row[h]=cell?(cell.w??cell.v??''):'';
      const url=cellLink(cell);
      if(url)row._links[h]=url;
    });
    if(!String(row.Company||'').trim()&&!String(row.Role||'').trim())continue;
    if(row.Status!=='Prepared'&&row['Applied date'])row.Deadline=row['Applied date'];
    rows.push(row);
  }
  if(!rows.length)throw new Error('The register was found, but it contains no application rows.');
  state.rows=rows;state.source=sourceLabel;state.sheet=name;state.loadedAt=new Date();
  state.filter='';state.status='All';state.company='All';state.hideClosed=true;state.sort='deadline';
  if(!VIEWS.some(([key])=>key===state.view))state.view='overview';
  showDashboard();render();
}

async function loadWorkbook(file){
  const status=document.getElementById('uploadStatus');
  if(!file)return;
  if(!validateExtension(file)){
    const msg='Choose an .xlsx or .xls file.';
    status.textContent=msg;status.className='upload-status error';
    if(state.rows.length)toast(msg);
    return;
  }
  status.textContent=`Reading ${file.name}…`;status.className='upload-status working';
  try{
    const buf=await file.arrayBuffer();
    parseWorkbook(buf,file.name);
    status.textContent='';status.className='upload-status';
    toast(`${state.rows.length} applications loaded`);
  }catch(err){
    const msg=err.message||'Could not read this workbook.';
    status.textContent=msg;status.className='upload-status error';
    if(state.rows.length)toast(msg);
  }
}

function showDashboard(){
  document.getElementById('landing').classList.add('is-hidden');
  document.getElementById('dashboardShell').classList.remove('is-hidden');
  document.getElementById('sourceLabel').textContent=state.source;
  window.scrollTo({top:0,behavior:'instant'});
}
function showLanding(){state.rows=[];state.source='';state.sheet='';state.loadedAt=null;document.getElementById('dashboardShell').classList.add('is-hidden');document.getElementById('landing').classList.remove('is-hidden')}
function companies(rows=state.rows){return [...new Set(rows.map(r=>r.Company).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function filteredRows(){const q=keyNorm(state.filter);let x=state.rows.filter(r=>{if(state.hideClosed&&CLOSED.has(r.Status))return false;if(state.status!=='All'&&r.Status!==state.status)return false;if(state.company!=='All'&&r.Company!==state.company)return false;if(q&&!keyNorm([r.Company,r.Role,r['Job ID'],r.Status,r.Contact,r.Notes].join(' ')).includes(q))return false;return true});if(state.sort==='company')x.sort((a,b)=>String(a.Company).localeCompare(String(b.Company)));else if(state.sort==='deadline')x.sort(deadlineSort);else x.sort((a,b)=>(dateFrom(b['Applied date'])||dateFrom(b['Last update'])||0)-(dateFrom(a['Applied date'])||dateFrom(a['Last update'])||0));return x}
function counts(){const c={total:state.rows.length,prepared:0,active:0,interviews:0,rejected:0};state.rows.forEach(r=>{if(r.Status==='Prepared')c.prepared++;if(ACTIVE.has(r.Status))c.active++;if(r.Status==='Interview completed')c.interviews++;if(r.Status==='Rejected')c.rejected++});return c}
function sourceInfo(){const c=counts();return `<strong>${esc(state.source||'No workbook')}</strong>${state.loadedAt?`Loaded ${state.loadedAt.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}`:''}<br>${c.total} records · ${esc(state.sheet||'—')}`}
function renderSidebar(){const c=counts(),viewCounts={overview:'',pipeline:c.prepared+c.active,applications:c.total,deadlines:state.rows.filter(r=>r.Status==='Prepared').length,quality:''};document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${VIEWS.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;localStorage.setItem('jobDashView',state.view);render()})}
function openDrawer(rowNo){const r=state.rows.find(x=>x._row===rowNo);if(!r)return;document.getElementById('drawerTitle').textContent=r.Role||'Application';document.getElementById('drawerSub').textContent=[r.Company,r['Job ID']].filter(Boolean).join(' · ');const detail=[['Status',statusBadge(r.Status)],['Applied',esc(fmtDate(r['Applied date'])||'—')],['Deadline',esc(fmtDate(r.Deadline)||'—')],['Last update',esc(fmtDate(r['Last update'])||r['Last update']||'—')],['Contact',esc(r.Contact||'—')],['Email',r['Contact email']?`<a href="mailto:${esc(r['Contact email'])}">${esc(r['Contact email'])}</a>`:'—']];document.getElementById('drawerBody').innerHTML=`<div class="detail-grid">${detail.map(([l,v])=>`<div class="detail"><label>${l}</label><div>${v}</div></div>`).join('')}</div><div class="drawer-links">${usefulLinks(r).map(([l,u])=>`<a class="mini-link action-link" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</div><div class="eyebrow">Notes</div><div class="notes">${esc(r.Notes||'No notes recorded.')}</div>`;document.getElementById('drawer').classList.add('open');document.getElementById('drawerBackdrop').classList.add('open')}
function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('drawerBackdrop').classList.remove('open')}
function exportCsv(){const rows=filteredRows(),cols=['Applied date','Company','Role','Job ID','Status','Last update','Contact','Contact email','Deadline','Notes'];const q=v=>`"${String(v??'').replace(/"/g,'""')}"`,csv=[cols.map(q).join(','),...rows.map(r=>cols.map(c=>q(r[c])).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='job-applications-filtered.csv';a.click();URL.revokeObjectURL(a.href)}

const landingInput=document.getElementById('landingFileInput'),headerInput=document.getElementById('fileInput'),dz=document.getElementById('dropZone');
landingInput.addEventListener('change',e=>{loadWorkbook(e.target.files?.[0]);e.target.value=''});
headerInput.addEventListener('change',e=>{loadWorkbook(e.target.files?.[0]);e.target.value=''});
['dragenter','dragover'].forEach(type=>dz.addEventListener(type,e=>{e.preventDefault();e.stopPropagation();dz.classList.add('dragging')}));
['dragleave','drop'].forEach(type=>dz.addEventListener(type,e=>{e.preventDefault();e.stopPropagation();dz.classList.remove('dragging')}));
dz.addEventListener('drop',e=>loadWorkbook(e.dataTransfer?.files?.[0]));
dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();landingInput.click()}});
dz.addEventListener('click',e=>{if(e.target.closest('label'))return;landingInput.click()});
document.getElementById('drawerClose').onclick=closeDrawer;document.getElementById('drawerBackdrop').onclick=closeDrawer;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();if(state.rows.length&&e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();state.view='applications';render();setTimeout(()=>document.getElementById('appSearch')?.focus(),20)}});
function updateThemeButton(){document.getElementById('themeBtn').textContent=document.documentElement.dataset.theme==='dark'?'Light mode':'Dark mode'}
document.documentElement.dataset.theme=localStorage.getItem('jobDashTheme')||'light';updateThemeButton();
document.getElementById('themeBtn').onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem('jobDashTheme',n);updateThemeButton()};
showLanding();
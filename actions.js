if(!VIEWS.some(v=>v[0]==='documents'))VIEWS.splice(5,0,['documents','CV & cover letters']);

function documentRows(){return state.rows.filter(r=>String(r['CV text']||'').trim()||String(r['Cover letter text']||'').trim())}
function wordCount(s){const x=String(s||'').trim();return x?x.split(/\s+/).length:0}
function currentDocumentRow(){const rows=documentRows();if(!rows.length)return null;let r=rows.find(x=>x._row===state.docRow);if(!r){r=rows[0];state.docRow=r._row}return r}

function applicationActions(r){
  const out=[];
  if(String(r['CV text']||'').trim())out.push(['Copy CV','CV text','copy']);
  if(String(r['Cover letter text']||'').trim())out.push(['Copy cover','Cover letter text','copy']);
  const links=[['Dashboard','Dashboard'],['Apply link','Apply'],['Confirmation email','Confirmation'],['Latest email','Latest email']];
  links.forEach(([field,label])=>{const u=linkFor(r,field);if(u)out.push([label,u,'link'])});
  return out;
}

function actionMarkup(r,limit){
  const items=applicationActions(r);
  return (limit?items.slice(0,limit):items).map(([label,value,type])=>{
    if(type==='copy')return `<button type="button" class="mini-link copy-link" data-copy-row="${r._row}" data-copy-field="${esc(value)}" data-copy-label="${esc(label)}">${esc(label)}</button>`;
    return `<a class="mini-link" href="${esc(value)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  }).join('');
}

function copySourceText(rowNo,field){
  const r=state.rows.find(x=>x._row===rowNo);if(!r)return '';
  if(state.view==='documents'&&state.docRow===rowNo){
    if(field==='CV text'){const el=document.getElementById('cvEditor');if(el)return el.value}
    if(field==='Cover letter text'){const el=document.getElementById('clEditor');if(el)return el.value}
  }
  return String(r[field]||'');
}

function legacyCopy(text){
  const active=document.activeElement;
  const t=document.createElement('textarea');
  t.value=text;
  t.setAttribute('readonly','');
  t.setAttribute('aria-hidden','true');
  t.style.position='fixed';t.style.left='-9999px';t.style.top='0';t.style.opacity='0';t.style.pointerEvents='none';
  document.body.appendChild(t);
  t.focus();t.select();t.setSelectionRange(0,t.value.length);
  let ok=false;try{ok=document.execCommand('copy')}catch(err){ok=false}
  t.remove();
  if(active&&typeof active.focus==='function')active.focus({preventScroll:true});
  return ok;
}

async function copyAction(text,label){
  const value=String(text??'');
  if(!value){toast(`${label} is empty`);return false}
  let ok=false;
  if(navigator.clipboard&&window.isSecureContext){
    try{await navigator.clipboard.writeText(value);ok=true}catch(err){ok=false}
  }
  if(!ok)ok=legacyCopy(value);
  toast(ok?`${label} copied`:`Could not copy ${label.toLowerCase()}`);
  return ok;
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-copy-row][data-copy-field]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  const rowNo=+b.dataset.copyRow,field=b.dataset.copyField,label=b.dataset.copyLabel||'Text';
  copyAction(copySourceText(rowNo,field),label);
});

function cachePayload(){return {rows:state.rows,source:state.source,sheet:state.sheet,loadedAt:state.loadedAt?new Date(state.loadedAt).toISOString():null}}
function persistCache(){try{localStorage.setItem('jobDashRegisterCache',JSON.stringify(cachePayload()))}catch(err){console.warn('Could not cache register',err)}}
let cacheTimer=null;function persistCacheSoon(){clearTimeout(cacheTimer);cacheTimer=setTimeout(persistCache,250)}
function restoreCache(){try{const raw=localStorage.getItem('jobDashRegisterCache');if(!raw)return false;const d=JSON.parse(raw);if(!Array.isArray(d.rows)||!d.rows.length)return false;state.rows=d.rows;state.source=d.source||'Cached register';state.sheet=d.sheet||CONFIG.sheetName;state.loadedAt=d.loadedAt?new Date(d.loadedAt):new Date();showDashboard();render();return true}catch(err){console.warn('Could not restore cached register',err);return false}}
const parseWorkbookBase=parseWorkbook;
parseWorkbook=function(buf,sourceLabel){parseWorkbookBase(buf,sourceLabel);persistCache()};

openDrawer=function(rowNo){
  const r=state.rows.find(x=>x._row===rowNo);if(!r)return;
  document.getElementById('drawerTitle').textContent=r.Role||'Application';
  document.getElementById('drawerSub').textContent=[r.Company,r['Job ID']].filter(Boolean).join(' · ');
  const detail=[['Status',statusBadge(r.Status)],['Applied',esc(fmtDate(r['Applied date'])||'—')],['Deadline',esc(fmtDate(r.Deadline)||'—')],['Last update',esc(fmtDate(r['Last update'])||r['Last update']||'—')],['Contact',esc(r.Contact||'—')],['Email',r['Contact email']?`<a href="mailto:${esc(r['Contact email'])}">${esc(r['Contact email'])}</a>`:'—']];
  document.getElementById('drawerBody').innerHTML=`<div class="detail-grid">${detail.map(([l,v])=>`<div class="detail"><label>${l}</label><div>${v}</div></div>`).join('')}</div><div class="drawer-links">${actionMarkup(r)}</div><div class="eyebrow">Notes</div><div class="notes">${esc(r.Notes||'No notes recorded.')}</div>`;
  document.getElementById('drawer').classList.add('open');document.getElementById('drawerBackdrop').classList.add('open');
};

appTable=function(){
  const rows=filteredRows();
  return `${toolbar()}<div class="table-wrap"><table><thead><tr><th>Status</th><th>Company</th><th>Role</th><th>Applied</th><th>Deadline</th><th>Job ID</th><th>Contact</th><th>Actions</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr data-open="${r._row}"><td>${statusBadge(r.Status)}</td><td class="company">${esc(r.Company)}</td><td class="role">${esc(r.Role)}</td><td>${esc(fmtDate(r['Applied date']))}</td><td>${esc(fmtDate(r.Deadline))}</td><td>${esc(r['Job ID']||'')}</td><td>${esc(r.Contact||'')}</td><td><div class="linkrow" onclick="event.stopPropagation()">${actionMarkup(r,6)}</div></td><td class="row-chevron">›</td></tr>`).join('')}</tbody></table>${rows.length?'':'<div class="empty">No applications match these filters.</div>'}</div><div class="footer-note">Showing ${rows.length} of ${state.rows.length} records. Deadline sorting is the default.</div>`;
};

function documents(){
  const rows=documentRows(),r=currentDocumentRow();
  if(!r)return `${pageHead('CV & cover letters','Review and edit the document text loaded with the register.')}<div class="card"><div class="empty">No CV or cover-letter text is present in this register.</div></div>`;
  const cv=String(r['CV text']||''),cl=String(r['Cover letter text']||'');
  return `${pageHead('CV & cover letters','Review, copy and edit the full text stored with each application.')}<div class="doc-toolbar"><select class="select doc-select" id="docSelect">${rows.map(x=>`<option value="${x._row}" ${x._row===r._row?'selected':''}>${esc(x.Company)} · ${esc(x.Role)}</option>`).join('')}</select><span class="badge b-neutral">${rows.length} applications with documents</span></div><div class="notice doc-note">Edits here are saved in this browser and immediately used by Copy CV / Copy cover. The Google Sheet remains the permanent source record.</div><section class="doc-grid"><article class="card doc-card"><div class="section-title"><div><h3>CV</h3><p><span id="cvWords">${wordCount(cv)}</span> words · <span id="cvChars">${cv.length}</span> characters</p></div><button type="button" class="mini-link copy-link" data-copy-row="${r._row}" data-copy-field="CV text" data-copy-label="CV">Copy CV</button></div><textarea class="doc-editor" id="cvEditor" spellcheck="true">${esc(cv)}</textarea></article><article class="card doc-card"><div class="section-title"><div><h3>Cover letter</h3><p><span id="clWords">${wordCount(cl)}</span> words · <span id="clChars">${cl.length}</span> characters</p></div><button type="button" class="mini-link copy-link" data-copy-row="${r._row}" data-copy-field="Cover letter text" data-copy-label="Cover letter">Copy cover</button></div><textarea class="doc-editor" id="clEditor" spellcheck="true">${esc(cl)}</textarea></article></section>`;
}

const attachViewEventsBase=attachViewEvents;
attachViewEvents=function(){
  attachViewEventsBase();
  const ds=document.getElementById('docSelect');if(ds)ds.onchange=e=>{state.docRow=+e.target.value;render()};
  const cv=document.getElementById('cvEditor');if(cv)cv.oninput=e=>{const r=currentDocumentRow();if(!r)return;r['CV text']=e.target.value;document.getElementById('cvWords').textContent=wordCount(e.target.value);document.getElementById('cvChars').textContent=e.target.value.length;persistCacheSoon()};
  const cl=document.getElementById('clEditor');if(cl)cl.oninput=e=>{const r=currentDocumentRow();if(!r)return;r['Cover letter text']=e.target.value;document.getElementById('clWords').textContent=wordCount(e.target.value);document.getElementById('clChars').textContent=e.target.value.length;persistCacheSoon()};
};

renderSidebar=function(){const c=counts(),viewCounts={overview:'',pipeline:c.prepared+c.active,applications:c.total,deadlines:state.rows.filter(r=>r.Status==='Prepared').length,analytics:'',documents:documentRows().length,quality:''};document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${VIEWS.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;localStorage.setItem('jobDashView',state.view);render()})};

render=function(){if(!state.rows.length)return;renderSidebar();const views={overview,pipeline,applications,deadlines,analytics,documents,quality};document.getElementById('main').innerHTML=(views[state.view]||overview)();attachViewEvents()};

restoreCache();
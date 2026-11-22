const qualityViewIndex=VIEWS.findIndex(v=>v[0]==='quality');
if(!VIEWS.some(v=>v[0]==='documents'))VIEWS.splice(qualityViewIndex<0?VIEWS.length:qualityViewIndex,0,['documents','CV & cover letters']);
if(state.view==='analytics'||state.view==='documents'){
  state.view='overview';
  localStorage.setItem('jobDashView','overview');
}

let cleanDocuments=[];
let documentsReady=false;
let documentsLoadPromise=null;
let searchRenderTimer=0;

const normDoc=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ');
function docMatch(r,d){
  const rJob=normDoc(r['Job ID']),dJob=normDoc(d.jobId);
  if(rJob&&dJob&&rJob===dJob)return true;
  return normDoc(r.Company)===normDoc(d.company)&&normDoc(r.Role)===normDoc(d.role);
}
async function loadCleanDocuments(){
  const b64=window.JOB_DOCUMENTS_GZIP_B64||'';
  if(!b64){cleanDocuments=[];return}
  const bin=atob(b64),bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text=await new Response(stream).text();
  cleanDocuments=JSON.parse(text);
}
function hydrateDocumentText(rows=state.rows){
  rows.forEach(r=>{
    const d=cleanDocuments.find(x=>docMatch(r,x));
    if(!d)return;
    r['CV text']=String(d.cv||'');
    r['Cover letter text']=String(d.cover||'');
  });
}
async function ensureDocumentsLoaded(){
  if(documentsReady)return true;
  if(documentsLoadPromise)return documentsLoadPromise;
  documentsLoadPromise=(async()=>{
    if(!window.JOB_DOCUMENTS_GZIP_B64){
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src='./documents-data.js?v=20260920-5';
        s.async=true;
        s.onload=resolve;
        s.onerror=()=>reject(new Error('Could not load document bundle'));
        document.head.appendChild(s);
      });
    }
    await loadCleanDocuments();
    hydrateDocumentText(state.rows);
    documentsReady=true;
    return true;
  })().catch(err=>{
    console.error(err);
    documentsLoadPromise=null;
    toast('Could not load CV and cover-letter data');
    return false;
  });
  return documentsLoadPromise;
}
function documentRows(){return state.rows.filter(r=>String(r['CV text']||'').trim()||String(r['Cover letter text']||'').trim()).slice().sort((a,b)=>String(a.Company||'').localeCompare(String(b.Company||''),undefined,{sensitivity:'base'})||String(a.Role||'').localeCompare(String(b.Role||''),undefined,{sensitivity:'base'}))}
function fastDocumentCount(){
  if(!documentsReady)return '';
  let n=0;
  for(const r of state.rows)if(String(r['CV text']||'').trim()||String(r['Cover letter text']||'').trim())n++;
  return n;
}
function wordCount(s){const x=String(s||'').trim();return x?x.split(/\s+/).length:0}
function currentDocumentRow(){const rows=documentRows();if(!rows.length)return null;let r=rows.find(x=>x._row===state.docRow);if(!r){r=rows[0];state.docRow=r._row}return r}

function applicationActions(r){
  const out=[];
  if(String(r['CV text']||'').trim())out.push(['Copy CV','CV text','copy']);
  if(String(r['Cover letter text']||'').trim())out.push(['Copy cover','Cover letter text','copy']);
  [['Dashboard','Dashboard'],['Apply link','Apply'],['Confirmation email','Confirmation'],['Latest email','Latest email']].forEach(([field,label])=>{const u=linkFor(r,field);if(u)out.push([label,u,'link'])});
  return out;
}
function actionMarkup(r,limit){
  const items=applicationActions(r);
  return (limit?items.slice(0,limit):items).map(([label,value,type])=>type==='copy'
    ?`<button type="button" class="mini-link copy-link" data-copy-row="${r._row}" data-copy-field="${esc(value)}">${esc(label)}</button>`
    :`<a class="mini-link" href="${esc(value)}" target="_blank" rel="noopener">${esc(label)}</a>`).join('');
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
  const active=document.activeElement,t=document.createElement('textarea');
  t.value=text;t.setAttribute('readonly','');t.setAttribute('aria-hidden','true');
  t.style.position='fixed';t.style.left='-9999px';t.style.top='0';t.style.opacity='0';
  document.body.appendChild(t);t.focus();t.select();t.setSelectionRange(0,t.value.length);
  let ok=false;try{ok=document.execCommand('copy')}catch(err){ok=false}t.remove();
  if(active&&typeof active.focus==='function')active.focus({preventScroll:true});return ok;
}
async function copyAction(text){
  const value=String(text??'');if(!value){toast('Nothing to copy');return false}
  let ok=false;
  if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(value);ok=true}catch(err){ok=false}}
  if(!ok)ok=legacyCopy(value);
  toast(ok?'Copied to clipboard':'Could not copy to clipboard');
  return ok;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-copy-row][data-copy-field]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  copyAction(copySourceText(+b.dataset.copyRow,b.dataset.copyField));
});

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
  if(!r)return `${pageHead('CV & cover letters','Review and edit the clean document text loaded with the tracker.')}<div class="card"><div class="empty">No CV or cover-letter text is available for the loaded applications.</div></div>`;
  const cv=String(r['CV text']||''),cl=String(r['Cover letter text']||'');
  return `${pageHead('CV & cover letters','Review, copy and temporarily edit the full text. Refresh restores the clean source version.')}<div class="doc-toolbar"><select class="select doc-select" id="docSelect">${rows.map(x=>`<option value="${x._row}" ${x._row===r._row?'selected':''}>${esc(x.Company)} · ${esc(x.Role)}</option>`).join('')}</select><span class="badge b-neutral">${rows.length} applications with documents</span></div><div class="notice doc-note">Edits are temporary. Refreshing the page restores the clean CV and cover-letter text loaded from the source bundle.</div><section class="doc-grid"><article class="card doc-card"><div class="section-title"><div><h3>CV</h3><p><span id="cvWords">${wordCount(cv)}</span> words · <span id="cvChars">${cv.length}</span> characters</p></div><button type="button" class="mini-link copy-link" data-copy-row="${r._row}" data-copy-field="CV text">Copy CV</button></div><textarea class="doc-editor" id="cvEditor" spellcheck="true">${esc(cv)}</textarea></article><article class="card doc-card"><div class="section-title"><div><h3>Cover letter</h3><p><span id="clWords">${wordCount(cl)}</span> words · <span id="clChars">${cl.length}</span> characters</p></div><button type="button" class="mini-link copy-link" data-copy-row="${r._row}" data-copy-field="Cover letter text">Copy cover</button></div><textarea class="doc-editor" id="clEditor" spellcheck="true">${esc(cl)}</textarea></article></section>`;
}

const attachViewEventsBase=attachViewEvents;
attachViewEvents=function(){
  attachViewEventsBase();
  const bindSearch=id=>{
    const el=document.getElementById(id);if(!el)return;
    el.oninput=e=>{
      const value=e.target.value,pos=e.target.selectionStart??value.length;
      state.filter=value;
      clearTimeout(searchRenderTimer);
      searchRenderTimer=setTimeout(()=>{
        render();
        requestAnimationFrame(()=>{
          const next=document.getElementById(id);if(!next)return;
          next.focus({preventScroll:true});
          const p=Math.min(pos,next.value.length);next.setSelectionRange(p,p);
        });
      },140);
    };
  };
  bindSearch('pipeSearch');bindSearch('appSearch');
  const ds=document.getElementById('docSelect');if(ds)ds.onchange=e=>{state.docRow=+e.target.value;render()};
  const cv=document.getElementById('cvEditor');if(cv)cv.oninput=e=>{const r=currentDocumentRow();if(!r)return;r['CV text']=e.target.value;document.getElementById('cvWords').textContent=wordCount(e.target.value);document.getElementById('cvChars').textContent=e.target.value.length};
  const cl=document.getElementById('clEditor');if(cl)cl.oninput=e=>{const r=currentDocumentRow();if(!r)return;r['Cover letter text']=e.target.value;document.getElementById('clWords').textContent=wordCount(e.target.value);document.getElementById('clChars').textContent=e.target.value.length};
};

renderSidebar=function(){
  const c=counts();
  const visibleViews=VIEWS.filter(v=>v[0]!=='analytics');
  const viewCounts={overview:'',pipeline:c.prepared+c.active,applications:c.total,deadlines:state.rows.filter(r=>r.Status==='Prepared').length,documents:fastDocumentCount(),quality:''};
  document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${visibleViews.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=async()=>{
    const next=b.dataset.view;
    if(next==='documents'&&!documentsReady){
      b.disabled=true;toast('Loading documents…');
      const ok=await ensureDocumentsLoaded();if(!ok){b.disabled=false;return}
    }
    state.view=next;localStorage.setItem('jobDashView',state.view);render();
  });
};
render=function(){
  if(!state.rows.length)return;
  renderSidebar();
  const views={overview,pipeline,applications,deadlines,documents,quality};
  document.getElementById('main').innerHTML=(views[state.view]||overview)();
  attachViewEvents();
};

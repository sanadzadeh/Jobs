// Runtime fixes for navigation and performance.

// Analytics has been merged into Overview. Keep the legacy implementation intact,
// but remove it from the live UI.
if(state.view==='analytics'||state.view==='documents'){
  state.view='overview';
  localStorage.setItem('jobDashView','overview');
}

let documentsReady=false;
let documentsLoadPromise=null;

function fastDocumentCount(){
  if(!documentsReady)return '';
  let n=0;
  for(const r of state.rows){
    if(String(r['CV text']||'').trim()||String(r['Cover letter text']||'').trim())n++;
  }
  return n;
}

async function ensureDocumentsLoaded(){
  if(documentsReady)return true;
  if(documentsLoadPromise)return documentsLoadPromise;

  documentsLoadPromise=(async()=>{
    if(!window.JOB_DOCUMENTS_GZIP_B64){
      await new Promise((resolve,reject)=>{
        const existing=document.querySelector('script[data-job-documents]');
        if(existing){
          existing.addEventListener('load',resolve,{once:true});
          existing.addEventListener('error',reject,{once:true});
          return;
        }
        const s=document.createElement('script');
        s.src='./documents-data.js?v=20260920-4';
        s.async=true;
        s.dataset.jobDocuments='1';
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

renderSidebar=function(){
  const c=counts();
  const visibleViews=VIEWS.filter(v=>v[0]!=='analytics');
  const viewCounts={
    overview:'',
    pipeline:c.prepared+c.active,
    applications:c.total,
    deadlines:state.rows.filter(r=>r.Status==='Prepared').length,
    documents:fastDocumentCount(),
    quality:''
  };
  document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${visibleViews.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;

  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=async()=>{
    const next=b.dataset.view;
    if(next==='documents'&&!documentsReady){
      b.disabled=true;
      toast('Loading documents…');
      const ok=await ensureDocumentsLoaded();
      if(!ok){b.disabled=false;return}
    }
    state.view=next;
    localStorage.setItem('jobDashView',state.view);
    render();
  });
};

render=function(){
  if(!state.rows.length)return;
  renderSidebar();
  const views={overview,pipeline,applications,deadlines,documents,quality};
  document.getElementById('main').innerHTML=(views[state.view]||overview)();
  attachViewEvents();
};

// Keep workbook loading explicit and user-driven. Use the original parser directly,
// avoiding cache writes, document hydration and duplicate renders during import.
if(typeof parseWorkbookBase!=='undefined'){
  parseWorkbook=function(buf,sourceLabel){
    parseWorkbookBase(buf,sourceLabel);
  };
}

// Avoid rebuilding the entire dashboard on every keystroke while filtering.
const attachViewEventsCurrent=attachViewEvents;
let searchRenderTimer=0;
attachViewEvents=function(){
  attachViewEventsCurrent();
  const bind=(id)=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.oninput=e=>{
      const value=e.target.value;
      const pos=e.target.selectionStart??value.length;
      state.filter=value;
      clearTimeout(searchRenderTimer);
      searchRenderTimer=setTimeout(()=>{
        render();
        requestAnimationFrame(()=>{
          const next=document.getElementById(id);
          if(next){
            next.focus({preventScroll:true});
            const p=Math.min(pos,next.value.length);
            next.setSelectionRange(p,p);
          }
        });
      },140);
    };
  };
  bind('pipeSearch');
  bind('appSearch');
};

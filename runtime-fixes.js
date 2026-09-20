// Small runtime fixes kept separate from the main dashboard modules.

// Analytics has been merged into Overview. Keep the underlying legacy code intact,
// but remove the tab and route from the live UI.
if(state.view==='analytics'){
  state.view='overview';
  localStorage.setItem('jobDashView','overview');
}

function fastDocumentCount(){
  let n=0;
  for(const r of state.rows){
    if(String(r['CV text']||'').trim()||String(r['Cover letter text']||'').trim())n++;
  }
  return n;
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
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{
    state.view=b.dataset.view;
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

// Do not reopen the previous workbook automatically on page load.
// The register remains cached only as a fallback, but loading is always user initiated.
restoreCache=function(){return false;};

// The document enhancement wrapper currently causes two full renders while loading a workbook.
// Suppress those intermediate renders and paint once when parsing/hydration is complete.
const parseWorkbookCurrent=parseWorkbook;
parseWorkbook=function(buf,sourceLabel){
  const liveRender=render;
  render=function(){};
  try{
    parseWorkbookCurrent(buf,sourceLabel);
  }finally{
    render=liveRender;
  }
  render();
};

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
      },90);
    };
  };
  bind('pipeSearch');
  bind('appSearch');
};

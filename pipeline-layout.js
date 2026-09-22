/* Pipeline layout refinement: Prepared and Applied are full-width horizontal lanes. */
(function(){
  const style=document.createElement('style');
  style.textContent=`
    .pipeline-stack{display:grid;gap:12px}
    .pipeline-stack .lane{min-height:0}
    .pipeline-stack .lane.pipeline-primary{padding:11px}
    .pipeline-stack .lane-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:8px}
    .pipeline-stack .job-card{margin:0;min-height:84px;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'co meta' 'rl meta';column-gap:14px;align-items:center;padding:11px 12px}
    .pipeline-stack .job-card .co{grid-area:co;margin:0 0 3px}
    .pipeline-stack .job-card .rl{grid-area:rl}
    .pipeline-stack .job-card .meta{grid-area:meta;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:6px;margin:0;white-space:nowrap}
    .pipeline-stack .lane-closed .lane-cards{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
    @media(max-width:700px){
      .pipeline-stack .lane-cards{grid-template-columns:1fr}
      .pipeline-stack .job-card{grid-template-columns:1fr;grid-template-areas:'co' 'rl' 'meta'}
      .pipeline-stack .job-card .meta{align-items:flex-start;flex-direction:row;justify-content:space-between;margin-top:8px;white-space:normal}
    }
  `;
  document.head.appendChild(style);

  window.laneRows=function(type){
    let rows=[];
    if(type==='prepared') rows=state.rows.filter(r=>r.Status==='Prepared').sort(preparedDeadlineSort);
    if(type==='submitted') rows=state.rows.filter(r=>['Applied','Under review','Interview completed','No outcome found','CV acknowledged','Talent pool / EOI'].includes(r.Status));
    if(type==='closed') rows=state.rows.filter(r=>CLOSED.has(r.Status));
    return rows;
  };

  window.pipeline=function(){
    const lanes=[['prepared','Prepared'],['submitted','Applied'],['closed','Closed']];
    return `${pageHead('Pipeline','Scan the current workflow by stage. Click a card for details and links.')}<div class="toolbar"><input class="search" id="pipeSearch" placeholder="Filter pipeline" value="${esc(state.filter)}"><label class="check"><input type="checkbox" id="pipeHide" ${state.hideClosed?'checked':''}> Hide closed</label></div><div class="pipeline-stack">${lanes.filter(([k])=>!(state.hideClosed&&k==='closed')).map(([k,t])=>{const rows=laneRows(k);const q=keyNorm(state.filter);const filtered=!q?rows:rows.filter(r=>keyNorm([r.Company,r.Role,r.Status].join(' ')).includes(q));const laneClass=k==='closed'?'lane lane-closed':'lane pipeline-primary';return `<div class="${laneClass}"><div class="lane-head"><strong>${t}</strong><span>${filtered.length}</span></div><div class="lane-cards">${filtered.length?filtered.map(cardMarkup).join(''):`<div class="empty">No ${t.toLowerCase()} records.</div>`}</div></div>`}).join('')}</div>`;
  };
})();

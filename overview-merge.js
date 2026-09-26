function renderSidebar(){
  const c=counts();
  const visibleViews=VIEWS.filter(v=>v[0]!=='analytics');
  const viewCounts={overview:'',pipeline:c.prepared+c.active,applications:c.total,deadlines:state.rows.filter(r=>r.Status==='Prepared').length,quality:''};
  document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${visibleViews.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;localStorage.setItem('jobDashView',state.view);render()});
}

const followUpStyle=document.createElement('style');
followUpStyle.textContent=`
  .overview-focus{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:11px;margin-bottom:11px}
  .overview-followups{grid-column:span 4}
  .followup-list{display:grid;gap:6px}
  .followup-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:7px 0;border-top:1px solid var(--border);cursor:pointer}
  .followup-row:first-child{border-top:0;padding-top:0}
  .followup-row strong{display:block;font-size:.78rem}
  .followup-row span{display:block;margin-top:2px;color:var(--ink-3);font-size:.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .followup-age{font:600 .66rem var(--mono);color:var(--warn);white-space:nowrap}
  .job-card.follow-up{background:var(--warn-dim);border-color:color-mix(in srgb,var(--warn) 42%,var(--border))}
  .job-card.follow-up:hover{border-color:var(--warn)}
  @media(max-width:1180px){.overview-focus{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-followups{grid-column:1/-1}}
  @media(max-width:860px){.overview-focus{grid-template-columns:1fr}.overview-followups{grid-column:auto}}
`;
document.head.appendChild(followUpStyle);

function followUpAgeDays(r){
  const d=dateFrom(r['Applied date']);
  if(!d)return null;
  const today=new Date();today.setHours(0,0,0,0);d.setHours(0,0,0,0);
  return Math.floor((today-d)/86400000);
}
function needsFollowUp(r){
  const age=followUpAgeDays(r);
  return age!==null&&age>=7&&['Applied','Under review','CV acknowledged','No outcome found'].includes(r.Status);
}
function followUpRows(){return state.rows.filter(needsFollowUp).sort((a,b)=>followUpAgeDays(b)-followUpAgeDays(a))}

function attentionItems(){
  const out=[];
  followUpRows().forEach(r=>out.push([`Follow up · ${followUpAgeDays(r)}d since application`,r]));
  state.rows.forEach(r=>{
    if(r.Status==='Prepared'){
      const n=daysUntil(r.Deadline);
      if(n===null)out.push(['Missing deadline',r]);
      else if(n<0)out.push(['Prepared but expired',r]);
      else if(n<=3)out.push(['Deadline imminent',r]);
      if(!linkFor(r,'Apply link'))out.push(['Missing apply link',r]);
    }
    if(r.Status==='No outcome found'){
      const d=dateFrom(r['Applied date']);
      if(d&&Date.now()-d.getTime()>30*86400000)out.push(['No outcome >30 days',r]);
    }
  });
  return out.slice(0,10);
}

function cardMarkup(r){
  const n=daysUntil(r.Deadline),meta=r.Status==='Prepared'?(r.Deadline?(n===null?'':n<0?'Expired':n===0?'Due today':`${n}d`):'No deadline'):(r['Applied date']?`Applied ${fmtDate(r['Applied date'])}`:'');
  return `<div class="job-card ${needsFollowUp(r)?'follow-up':''}" data-open="${r._row}"><div class="co">${esc(r.Company)}</div><div class="rl">${esc(r.Role)}</div><div class="meta"><span>${statusBadge(r.Status)}</span><span>${esc(meta)}</span></div></div>`;
}

function compactStatusBreakdown(){
  const entries=statusEntries(),total=entries.reduce((n,x)=>n+x[1],0)||1,gradient=conicGradient(entries,total);
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:230px"><div style="display:grid;place-items:center"><div title="Status distribution" style="width:108px;aspect-ratio:1;border-radius:50%;background:${gradient};display:grid;place-items:center;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--border) 55%,transparent)"><div style="width:62px;aspect-ratio:1;border-radius:50%;background:var(--surface);display:grid;place-items:center;text-align:center;box-shadow:0 0 0 1px var(--border)"><div><strong style="display:block;font:600 1.15rem/1 var(--serif)">${total}</strong><span style="display:block;margin-top:3px;font:400 .47rem var(--mono);text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3)">records</span></div></div></div></div><div class="legend" style="margin-top:14px;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 12px;max-width:100%;min-width:0">${entries.map(([k,v],i)=>{const pct=total?Math.round(v/total*100):0,color=STATUS_COLORS[k]||['var(--accent)','var(--prepared)','var(--good)','var(--warn)','var(--risk)','var(--ink-3)'][i%6];return `<span title="${esc(k)}" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap"><i style="background:${color};border-radius:50%"></i><span>${esc(shortStatus(k))}</span><strong style="color:var(--ink);font:600 .61rem var(--mono)">${pct}%</strong></span>`}).join('')}</div></div>`;
}

function overview(){
  const c=counts();
  const applied=state.rows.filter(r=>r['Applied date']).length;
  const followUps=followUpRows();
  const cm={};state.rows.forEach(r=>{if(r.Company)cm[r.Company]=(cm[r.Company]||0)+1});
  const topCompanies=Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const att=attentionItems();
  return `${pageHead('Overview','Application activity, follow-ups, status, organisation concentration and upcoming deadlines.')}
  <section class="overview-focus"><div class="card"><div class="eyebrow">Applied</div><div class="kpi-value">${applied}</div><div class="kpi-sub">Submitted applications</div></div><div class="card"><div class="eyebrow">Prepared</div><div class="kpi-value">${c.prepared}</div><div class="kpi-sub">Ready to submit</div></div><div class="card overview-followups"><div class="section-title"><div><h3>Follow up</h3><p>Applied 7 or more days ago and still active.</p></div></div><div class="followup-list">${followUps.length?followUps.slice(0,5).map(r=>`<div class="followup-row" data-open="${r._row}"><div><strong>${esc(r.Company)}</strong><span>${esc(r.Role)}</span></div><div class="followup-age">${followUpAgeDays(r)}d</div></div>`).join(''):`<div class="notice">No applications currently need follow-up.</div>`}</div></div></section>
  <section class="grid" style="grid-template-columns:minmax(0,1.55fr) minmax(250px,.72fr) minmax(0,1.08fr);margin-top:18px"><div class="card"><div class="section-title"><div><h3>Application activity</h3><p>Submissions by week.</p></div></div>${lineChart(weeklySeries())}</div><div class="card"><div class="section-title"><div><h3>Status distribution</h3><p>Current status mix by percentage.</p></div></div>${compactStatusBreakdown()}</div><div class="card"><div class="section-title"><div><h3>Most targeted organisations</h3><p>Share of applications among the ten most frequent organisations.</p></div></div>${treemap(topCompanies)}</div></section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Dashboard insights</h3><p>Follow-ups, deadlines and data checks.</p></div></div>${att.length?att.map(([t,r])=>`<div class="attention-row" data-open="${r._row}"><strong>${esc(t)}</strong><div>${esc(r.Company)} · ${esc(r.Role)}</div><span class="row-chevron">›</span></div>`).join(''):`<div class="notice">Nothing needs immediate attention.</div>`}</section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Next prepared applications</h3><p>Missing deadlines first, then earliest closing dates.</p></div><button class="btn soft" data-goto="deadlines">View all</button></div><div class="deadline-list">${deadlineRows().map(deadlineMarkup).join('')||`<div class="empty">No prepared applications in this workbook.</div>`}</div></section>`;
}

if(state.view==='analytics'){
  state.view='overview';
  localStorage.setItem('jobDashView','overview');
}

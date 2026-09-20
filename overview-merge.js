function renderSidebar(){
  const c=counts();
  const visibleViews=VIEWS.filter(v=>v[0]!=='analytics');
  const viewCounts={overview:'',pipeline:c.prepared+c.active,applications:c.total,deadlines:state.rows.filter(r=>r.Status==='Prepared').length,quality:''};
  document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${visibleViews.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;localStorage.setItem('jobDashView',state.view);render()});
}

function overview(){
  const c=counts();
  const dated=state.rows.filter(r=>r['Applied date']).length;
  const awaiting=state.rows.filter(r=>['Applied','Under review','No outcome found'].includes(r.Status)).length;
  const rejected=state.rows.filter(r=>r.Status==='Rejected').length;
  const closed=state.rows.filter(r=>CLOSED.has(r.Status));
  const closeDurations=closed.map(r=>{const a=dateFrom(r['Applied date']),b=dateFrom(r['Last update']);return a&&b?Math.max(0,(b-a)/86400000):null}).filter(x=>x!==null);
  const avgClose=closeDurations.length?Math.round(closeDurations.reduce((a,b)=>a+b,0)/closeDurations.length)+'d':'—';
  const cm={};state.rows.forEach(r=>{if(r.Company)cm[r.Company]=(cm[r.Company]||0)+1});
  const topCompanies=Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const att=attentionItems();
  return `${pageHead('Overview','Application activity, status, organisation concentration, deadlines and records needing attention.')}
  <section class="grid kpis"><div class="card"><div class="eyebrow">Tracked</div><div class="kpi-value">${c.total}</div><div class="kpi-sub">All application records</div></div><div class="card"><div class="eyebrow">Prepared</div><div class="kpi-value">${c.prepared}</div><div class="kpi-sub">Ready to submit</div></div><div class="card"><div class="eyebrow">Awaiting</div><div class="kpi-value">${awaiting}</div><div class="kpi-sub">Submitted without a close outcome</div></div><div class="card"><div class="eyebrow">Dated submissions</div><div class="kpi-value">${dated}</div><div class="kpi-sub">Rows with an applied date</div></div></section>
  <section class="grid two"><div class="card"><div class="section-title"><div><h3>Application activity</h3><p>Submissions by week.</p></div></div>${lineChart(weeklySeries())}</div><div class="card"><div class="section-title"><div><h3>Status distribution</h3><p>Current status mix by percentage.</p></div></div>${statusBreakdown()}</div></section>
  <section class="grid two" style="margin-top:18px"><div class="card"><div class="section-title"><div><h3>Application outcomes</h3><p>Closed-record indicators without duplicating the status chart.</p></div></div><div class="data-grid" style="grid-template-columns:repeat(2,1fr)"><div class="data-item"><div class="v">${rejected}</div><div class="l">Rejected</div></div><div class="data-item"><div class="v">${avgClose}</div><div class="l">Average time to close</div></div></div></div><div class="card"><div class="section-title"><div><h3>Most targeted organisations</h3><p>Share of applications among the ten most frequent organisations.</p></div></div>${treemap(topCompanies)}</div></section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Attention</h3><p>Deadline, aging and link checks.</p></div></div>${att.length?att.map(([t,r])=>`<div class="attention-row" data-open="${r._row}"><strong>${esc(t)}</strong><div>${esc(r.Company)} · ${esc(r.Role)}</div><span class="row-chevron">›</span></div>`).join(''):`<div class="notice">Nothing needs immediate attention.</div>`}</section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Next prepared applications</h3><p>Missing deadlines first, then earliest closing dates.</p></div><button class="btn soft" data-goto="deadlines">View all</button></div><div class="deadline-list">${deadlineRows().map(deadlineMarkup).join('')||`<div class="empty">No prepared applications in this workbook.</div>`}</div></section>`;
}

if(state.view==='analytics'){
  state.view='overview';
  localStorage.setItem('jobDashView','overview');
}

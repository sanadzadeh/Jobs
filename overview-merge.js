function renderSidebar(){
  const c=counts();
  const visibleViews=VIEWS.filter(v=>v[0]!=='analytics');
  const viewCounts={overview:'',pipeline:c.prepared+c.active,applications:c.total,deadlines:state.rows.filter(r=>r.Status==='Prepared').length,quality:''};
  document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${visibleViews.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;localStorage.setItem('jobDashView',state.view);render()});
}

function compactStatusBreakdown(){
  const entries=statusEntries(),total=entries.reduce((n,x)=>n+x[1],0)||1,gradient=conicGradient(entries,total);
  return `<div style="display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px;align-items:center;min-height:230px"><div style="display:grid;place-items:center"><div title="Status distribution" style="width:98px;aspect-ratio:1;border-radius:50%;background:${gradient};display:grid;place-items:center;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--border) 55%,transparent)"><div style="width:56px;aspect-ratio:1;border-radius:50%;background:var(--surface);display:grid;place-items:center;text-align:center;box-shadow:0 0 0 1px var(--border)"><div><strong style="display:block;font:600 1.15rem/1 var(--serif)">${total}</strong><span style="display:block;margin-top:3px;font:400 .47rem var(--mono);text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3)">records</span></div></div></div></div><div class="legend" style="margin-top:0;display:grid;grid-template-columns:1fr;gap:4px;min-width:0">${entries.map(([k,v],i)=>{const pct=total?Math.round(v/total*100):0,color=STATUS_COLORS[k]||['var(--accent)','var(--prepared)','var(--good)','var(--warn)','var(--risk)','var(--ink-3)'][i%6];return `<span title="${esc(k)}"><i style="background:${color};border-radius:50%"></i><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(shortStatus(k))}</span><strong style="margin-left:auto;color:var(--ink);font:600 .61rem var(--mono)">${pct}%</strong></span>`}).join('')}</div></div>`;
}

function compactTreemap(entries){
  if(!entries.length)return `<div class="empty">No organisations to chart.</div>`;
  const total=entries.reduce((n,x)=>n+x[1],0),rects=[];
  function split(items,x,y,w,h){
    if(!items.length)return;
    if(items.length===1){rects.push({item:items[0],x,y,w,h});return}
    const sum=items.reduce((n,i)=>n+i[1],0),target=sum/2;
    let acc=0,cut=1,best=Infinity;
    for(let i=1;i<items.length;i++){acc+=items[i-1][1];const diff=Math.abs(target-acc);if(diff<best){best=diff;cut=i}}
    const a=items.slice(0,cut),b=items.slice(cut),sa=a.reduce((n,i)=>n+i[1],0),ratio=sa/sum;
    if(w>=h){const wa=w*ratio;split(a,x,y,wa,h);split(b,x+wa,y,w-wa,h)}else{const ha=h*ratio;split(a,x,y,w,ha);split(b,x,y+ha,w,h-ha)}
  }
  split(entries,0,0,100,100);
  const palette=['var(--accent)','var(--prepared)','var(--good)','var(--warn)','var(--risk)','var(--ink-3)'];
  return `<div style="position:relative;height:260px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--surface-deep)">${rects.map((r,i)=>{const [name,value]=r.item,pct=Math.round(value/total*100),color=palette[i%palette.length],small=r.w<18||r.h<20;return `<div title="${esc(name)}: ${value} application${value===1?'':'s'} (${pct}%)" style="position:absolute;left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%;padding:${small?'5':'8'}px;border:2px solid var(--surface);background:color-mix(in srgb,${color} ${18+(i%3)*7}%,var(--surface));overflow:hidden"><span style="display:block;font-size:${small?'.54rem':'.62rem'};font-weight:400;line-height:1.2;white-space:${small?'nowrap':'normal'};overflow:hidden;text-overflow:ellipsis;color:var(--ink)">${esc(name)}</span><span style="display:block;margin-top:3px;font:400 ${small?'.50rem':'.56rem'} var(--mono);color:var(--ink-2)">${value} · ${pct}%</span></div>`}).join('')}</div>`;
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
  <section class="grid kpis" style="grid-template-columns:repeat(6,minmax(0,1fr))"><div class="card"><div class="eyebrow">Tracked</div><div class="kpi-value">${c.total}</div><div class="kpi-sub">All application records</div></div><div class="card"><div class="eyebrow">Prepared</div><div class="kpi-value">${c.prepared}</div><div class="kpi-sub">Ready to submit</div></div><div class="card"><div class="eyebrow">Awaiting</div><div class="kpi-value">${awaiting}</div><div class="kpi-sub">Submitted without a close outcome</div></div><div class="card"><div class="eyebrow">Dated submissions</div><div class="kpi-value">${dated}</div><div class="kpi-sub">Rows with an applied date</div></div><div class="card"><div class="eyebrow">Rejected</div><div class="kpi-value">${rejected}</div><div class="kpi-sub">Closed as rejected</div></div><div class="card"><div class="eyebrow">Avg. close</div><div class="kpi-value">${avgClose}</div><div class="kpi-sub">Average time to close</div></div></section>
  <section class="grid" style="grid-template-columns:minmax(0,1.55fr) minmax(250px,.72fr) minmax(0,1.08fr);margin-top:18px"><div class="card"><div class="section-title"><div><h3>Application activity</h3><p>Submissions by week.</p></div></div>${lineChart(weeklySeries())}</div><div class="card"><div class="section-title"><div><h3>Status distribution</h3><p>Current status mix by percentage.</p></div></div>${compactStatusBreakdown()}</div><div class="card"><div class="section-title"><div><h3>Most targeted organisations</h3><p>Share of applications among the ten most frequent organisations.</p></div></div>${compactTreemap(topCompanies)}</div></section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Attention</h3><p>Deadline, aging and link checks.</p></div></div>${att.length?att.map(([t,r])=>`<div class="attention-row" data-open="${r._row}"><strong>${esc(t)}</strong><div>${esc(r.Company)} · ${esc(r.Role)}</div><span class="row-chevron">›</span></div>`).join(''):`<div class="notice">Nothing needs immediate attention.</div>`}</section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Next prepared applications</h3><p>Missing deadlines first, then earliest closing dates.</p></div><button class="btn soft" data-goto="deadlines">View all</button></div><div class="deadline-list">${deadlineRows().map(deadlineMarkup).join('')||`<div class="empty">No prepared applications in this workbook.</div>`}</div></section>`;
}

if(state.view==='analytics'){
  state.view='overview';
  localStorage.setItem('jobDashView','overview');
}
function renderSidebar(){
  const c=counts();
  const visibleViews=VIEWS.filter(v=>v[0]!=='analytics');
  const viewCounts={overview:'',pipeline:c.prepared+c.active,applications:c.total,deadlines:state.rows.filter(r=>r.Status==='Prepared').length,quality:''};
  document.getElementById('sidebar').innerHTML=`<div class="side-title">Views</div>${visibleViews.map((v,i)=>`<button class="nav ${state.view===v[0]?'active':''}" data-view="${v[0]}"><span class="nav-num">0${i+1}</span><span class="nav-label">${v[1]}</span>${viewCounts[v[0]]!==''?`<span class="nav-count">${viewCounts[v[0]]}</span>`:''}</button>`).join('')}<a class="nav sidebar-link" href="https://docs.google.com/spreadsheets/d/1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E/edit" target="_blank" rel="noopener"><span class="nav-num">↗</span><span class="nav-label">Google Sheet</span></a><div class="side-meta">${sourceInfo()}</div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;localStorage.setItem('jobDashView',state.view);render()});
}

const inProgressStyle=document.createElement('style');
inProgressStyle.textContent=`
  .overview-focus{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:11px}
  .applied-main-card{position:relative;min-height:94px;padding-right:145px}
  .applied-totals{display:block}
  .applied-breakdown{position:absolute;right:14px;top:16px;bottom:16px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:8px}
  .applied-breakdown-item{display:flex;flex-direction:row;align-items:baseline;gap:8px;white-space:nowrap}
  .applied-breakdown-item strong{font:600 1.45rem/1 var(--serif)}
  .applied-breakdown-item span{font:500 .78rem/1.2 var(--mono)}
  .applied-breakdown-item.live{color:var(--good)}
  .applied-breakdown-item.rejected{color:var(--risk)}
  .response-summary{display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
  .response-summary strong{font:600 1.3rem var(--serif)}
  .response-time-label{font-size:.62rem;color:var(--ink-2)}
  .job-card.in-progress{background:color-mix(in srgb,var(--good) 8%,var(--surface));border-color:var(--good)}
  .in-progress-app-row td{background:color-mix(in srgb,var(--good) 7%,var(--surface))!important}
  .in-progress-app-row td:first-child{box-shadow:inset 4px 0 0 var(--good)}
  .in-progress-app-row:hover td{background:color-mix(in srgb,var(--good) 13%,var(--surface))!important}
  .in-progress-app-row .badge,.job-card.in-progress .badge{color:var(--good)!important;background:color-mix(in srgb,var(--good) 14%,var(--surface))!important}
  .in-progress-app-row .badge:before{background:var(--good)!important}
  .in-progress-days{color:var(--good)!important;font-weight:700}
  @media(max-width:860px){.overview-focus{grid-template-columns:1fr}}
`;
document.head.appendChild(inProgressStyle);

// Calendar-day age relative to closing date, not submission date.
function daysSinceDeadline(r){
  if(!r.Deadline)return null;
  return calendarDaysBetween(r.Deadline,new Date());
}
function isInProgress(r){
  const d=daysSinceDeadline(r);
  return d!==null&&d>=20&&d<=45&&['Applied','Under review','Interview completed','No outcome found','CV acknowledged','Talent pool / EOI'].includes(r.Status);
}
function inProgressRows(){return state.rows.filter(isInProgress).sort((a,b)=>daysSinceDeadline(b)-daysSinceDeadline(a))}

function attentionItems(){
  const out=[];
  inProgressRows().forEach(r=>out.push([`In Progress · ${daysSinceDeadline(r)} days since deadline`,r]));
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
  const timing=responseTiming(r);
  const responseLabel=timing?(timing.kind==='rejected'?`Response ${timing.days}d`:timing.days>=0?`Waiting ${timing.days}d`:`Deadline in ${Math.abs(timing.days)}d`):'';
  const n=daysUntil(r.Deadline),meta=r.Status==='Prepared'?(r.Deadline?(n===null?'':n<0?'Expired':n===0?'Due today':`${n}d`):'No deadline'):(r['Applied date']?`Applied ${fmtDate(r['Applied date'])}`:'');
  return `<div class="job-card ${isInProgress(r)?'in-progress':''}" data-open="${r._row}"><div class="co">${esc(r.Company)}</div><div class="rl">${esc(r.Role)}</div><div class="meta"><span>${isInProgress(r)&&r.Status==='Applied'?'<span class="badge b-good">Applied</span>':statusBadge(r.Status)}</span><span>${esc(meta)}</span>${responseLabel?`<span class="response-time-label">${esc(responseLabel)}</span>`:''}</div></div>`;
}

appTable=function(){
  const rows=filteredRows();
  const response=averageResponseTime();
  const metric=response.average===null?'—':`${response.average.toFixed(1)} days`;
  return `<div class="response-summary card"><span class="eyebrow">Average response time</span><strong>${metric}</strong><span class="kpi-sub">${response.count} rejected applications with deadlines; excludes missing deadlines</span></div>${toolbar()}<div class="table-wrap"><table><thead><tr><th>Status</th><th>Company</th><th>Role</th><th>Applied</th><th>Response time</th><th>Deadline</th><th>Days since deadline</th><th>Contact</th><th>Links</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr class="${isInProgress(r)?'in-progress-app-row':''}" data-open="${r._row}"><td>${isInProgress(r)&&r.Status==='Applied'?'<span class="badge b-good">Applied</span>':statusBadge(r.Status)}</td><td class="company">${esc(r.Company)}</td><td class="role">${esc(r.Role)}</td><td>${esc(fmtDate(r['Applied date']))}</td><td>${(()=>{const t=responseTiming(r);return t?esc(t.kind==='pending'?(t.days>=0?`${t.days}d waiting`:`${Math.abs(t.days)}d until deadline`):`${t.days}d`):'—'})()}</td><td>${esc(fmtDate(r.Deadline))}</td><td class="${isInProgress(r)?'in-progress-days':''}">${(['Applied','Under review','Interview completed','No outcome found','CV acknowledged','Talent pool / EOI'].includes(r.Status)&&daysSinceDeadline(r)!==null)?esc(daysSinceDeadline(r)):'—'}</td><td>${esc(r.Contact||r['Contact email'])}</td><td><div class="link-row">${usefulLinks(r).slice(0,5).map(([l,u])=>u?`<a class="mini-link" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`:'').join('')}</div></td><td class="row-chevron">›</td></tr>`).join('')||`<tr><td colspan="10"><div class="empty">No applications match these filters.</div></td></tr>`}</tbody></table></div>${rows.length?`<div class="footer-note">Showing ${rows.length} of ${state.rows.length} records. Deadline sorting is the default.</div>`:''}`;
};

function compactStatusBreakdown(){
  const entries=statusEntries(),total=entries.reduce((n,x)=>n+x[1],0)||1;
  const gradient=conicGradient(entries,total);
  // The textured slice remains INSIDE the existing Applied segment.
  // Only Applied rows count here, so the donut's totals are unchanged.
  const applied=entries.find(([k])=>k==='Applied')?.[1]||0;
  const inProgressApplied=state.rows.filter(r=>r.Status==='Applied'&&isInProgress(r)).length;
  const beforeApplied=entries.slice(0,entries.findIndex(([k])=>k==='Applied')).reduce((n,[,v])=>n+v,0);
  const circumference=2*Math.PI*76;
  const textureStart=circumference*(beforeApplied+applied-inProgressApplied)/total;
  const textureLength=circumference*inProgressApplied/total;
  const overlay=inProgressApplied>0?`<svg viewBox="0 0 200 200" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">
    <defs><pattern id="inprogress-donut-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.55" fill="white" fill-opacity=".9"/></pattern></defs>
    <circle cx="100" cy="100" r="76" fill="none" stroke="url(#inprogress-donut-dots)" stroke-width="44" stroke-dasharray="${textureLength} ${circumference-textureLength}" stroke-dashoffset="${-textureStart}" transform="rotate(-90 100 100)"/>
  </svg>`:'';
  return `<div style="display:flex;flex-direction:column;justify-content:space-between;align-items:center;min-height:290px;width:100%;gap:17px">
    <div title="Status distribution" style="position:relative;width:min(200px,100%);aspect-ratio:1;border-radius:50%;background:${gradient};box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--border) 55%,transparent);display:grid;place-items:center;flex-shrink:0">
      ${overlay}
      <div style="z-index:1;width:54%;aspect-ratio:1;border-radius:50%;background:var(--surface);display:grid;place-items:center;text-align:center;box-shadow:0 0 0 1px var(--border)">
        <div><strong style="display:block;font:600 1.6rem/1 var(--serif)">${total}</strong><span style="display:block;margin-top:5px;font:400 .57rem var(--mono);text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3)">records</span></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;align-items:center;width:100%;margin-top:auto">
      <div class="legend" style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px 12px;max-width:100%;min-width:0">
      ${entries.map(([k,v],i)=>{const pct=Math.round(v/total*100),color=STATUS_COLORS[k]||['var(--accent)','var(--prepared)','var(--good)','var(--warn)','var(--risk)','var(--ink-3)'][i%6];return `<span title="${esc(k)}" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap"><i style="background:${color};border-radius:50%"></i><span>${esc(shortStatus(k))}</span><strong style="color:var(--ink);font:600 .61rem var(--mono)">${pct}%</strong></span>`}).join('')}
      </div>
      ${inProgressApplied>0?`<div title="Subset of Applied, not an additional status" style="display:flex;align-items:center;gap:7px;font:400 .64rem var(--mono);color:var(--ink-2)"><span style="width:13px;height:13px;border-radius:3px;background-color:var(--accent);background-image:radial-gradient(circle,rgba(255,255,255,.9) 1px,transparent 1.2px);background-size:5px 5px"></span>In Progress · ${inProgressApplied} of ${applied} Applied</div>`:''}
    </div>
  </div>`;
}
let categoryStatusFilter='All';
const JOB_CATEGORIES=['Strategy','Analytics','AI','Financial Crime & Risk','Other'];
function categorySummary(){
  const source=state.rows.filter(r=>categoryStatusFilter==='All'||r.Status===categoryStatusFilter);
  const counts=Object.fromEntries(JOB_CATEGORIES.map(k=>[k,0]));
  source.forEach(r=>{const cat=JOB_CATEGORIES.includes(r['Job Category'])?r['Job Category']:'Other';counts[cat]++});
  return JOB_CATEGORIES.map(k=>[k,counts[k]]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
}
document.addEventListener('change',e=>{if(e.target && e.target.id==='categoryStatusFilter'){categoryStatusFilter=e.target.value;render()}});
function categoryBreakdown(cat){
  const rows=state.rows.filter(r=>(JOB_CATEGORIES.includes(r['Job Category'])?r['Job Category']:'Other')===cat);
  return {total:rows.length,rejected:rows.filter(r=>r.Status==='Rejected').length,inProgress:rows.filter(isInProgress).length};
}
let categoryTooltip=null;
function hideCategoryTooltip(){if(categoryTooltip){categoryTooltip.remove();categoryTooltip=null}}
function moveCategoryTooltip(e){
  if(!categoryTooltip||!('clientX' in e))return;
  const w=categoryTooltip.offsetWidth,h=categoryTooltip.offsetHeight;
  categoryTooltip.style.left=Math.max(8,Math.min(e.clientX+14,innerWidth-w-8))+'px';
  categoryTooltip.style.top=Math.max(8,Math.min(e.clientY+14,innerHeight-h-8))+'px';
}
function showCategoryTooltip(tile,event){
  const cat=tile.getAttribute('data-category-hover');
  if(!cat)return;
  const b=categoryBreakdown(cat);
  hideCategoryTooltip();
  const tip=document.createElement('div');
  tip.style.cssText='position:fixed;z-index:9999;pointer-events:none;min-width:180px;padding:11px 13px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink);box-shadow:0 8px 25px rgba(0,0,0,.18);font-size:12px;line-height:1.75';
  const heading=document.createElement('strong');heading.textContent=cat;heading.style.cssText='display:block;font-size:13px;margin-bottom:4px';
  tip.appendChild(heading);
  [['% of total',`${state.rows.length?Math.round(b.total/state.rows.length*100):0}%`],['Rejected',`${b.rejected} (${b.total?Math.round(b.rejected/b.total*100):0}%)`],['In progress',`${b.inProgress} (${b.total?Math.round(b.inProgress/b.total*100):0}%)`]].forEach(([label,n])=>{
    const line=document.createElement('div');line.style.cssText='display:flex;justify-content:space-between;gap:22px';
    const l=document.createElement('span');l.textContent=label;
    const val=document.createElement('strong');val.textContent=n;
    line.append(l,val);tip.appendChild(line);
  });
  document.body.appendChild(tip);categoryTooltip=tip;
  if(event && 'clientX' in event)moveCategoryTooltip(event);
  else{const rect=tile.getBoundingClientRect();const width=tip.offsetWidth,height=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(rect.left+12,innerWidth-width-8))+'px';tip.style.top=Math.max(8,Math.min(rect.bottom+8,innerHeight-height-8))+'px'}
}
document.addEventListener('pointerover',e=>{
  const tile=e.target.closest?.('[data-category-hover]');
  if(tile&&!tile.contains(e.relatedTarget))showCategoryTooltip(tile,e);
});
document.addEventListener('pointermove',e=>{if(categoryTooltip)moveCategoryTooltip(e)});
document.addEventListener('pointerout',e=>{
  const tile=e.target.closest?.('[data-category-hover]');
  if(tile&&!tile.contains(e.relatedTarget))hideCategoryTooltip();
});
document.addEventListener('focusin',e=>{const tile=e.target.closest?.('[data-category-hover]');if(tile)showCategoryTooltip(tile)});
document.addEventListener('focusout',e=>{if(e.target.closest?.('[data-category-hover]'))hideCategoryTooltip()});
function overview(){
  const c=counts();
  const applied=state.rows.filter(r=>r['Applied date']).length;
  const rejected=state.rows.filter(r=>r.Status==='Rejected'&&r['Applied date']).length;
  const live=state.rows.filter(r=>r['Applied date']&&!CLOSED.has(r.Status)).length;
  const response=averageResponseTime();
  const avgResponse=response.average===null?'—':response.average.toFixed(1);
  const inProgress=inProgressRows();
  const categoryCounts=categorySummary();
  const att=attentionItems();
  return `${pageHead('Overview','Application activity, in-progress applications, status, job categories and upcoming deadlines.')}
  <section class="overview-focus"><div class="card applied-main-card"><div class="eyebrow">Applied</div><div class="applied-totals"><div class="kpi-value">${applied}</div><div class="applied-breakdown"><div class="applied-breakdown-item live"><strong>${live}</strong><span>Live</span></div><div class="applied-breakdown-item rejected"><strong>${rejected}</strong><span>Rejected</span></div></div></div><div class="kpi-sub">Submitted applications</div></div><div class="card"><div class="eyebrow">Prepared</div><div class="kpi-value">${c.prepared}</div><div class="kpi-sub">Ready to submit</div></div><div class="card"><div class="eyebrow">In Progress</div><div class="kpi-value">${inProgress.length}</div><div class="kpi-sub">20–45 days after deadline; still active</div></div><div class="card"><div class="eyebrow">Average response time</div><div class="kpi-value">${avgResponse}${response.average!==null?'d':''}</div><div class="kpi-sub">${response.count} rejected records with deadlines</div></div></section>
  <section class="grid" style="grid-template-columns:minmax(0,1.55fr) minmax(250px,.72fr) minmax(0,1.08fr);margin-top:18px"><div class="card"><div class="section-title"><div><h3>Application activity</h3><p>Submissions by week.</p></div></div>${lineChart(weeklySeries())}</div><div class="card"><div class="section-title"><div><h3>Status distribution</h3><p>Current status mix by percentage.</p></div></div>${compactStatusBreakdown()}</div><div class="card" style="display:flex;flex-direction:column"><div class="section-title"><div><h3>Job categories</h3><p>Application mix by primary role focus.</p></div><select id="categoryStatusFilter" aria-label="Filter categories by application status" style="max-width:114px;min-width:0;padding:5px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:.69rem">${['All','Applied','Rejected','Prepared'].map(s=>`<option value="${s}" ${categoryStatusFilter===s?'selected':''}>${s==='All'?'All statuses':s}</option>`).join('')}</select></div>${treemap(categoryCounts,true)}</div></section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Dashboard insights</h3><p>In-progress applications, deadlines and data checks.</p></div></div>${att.length?att.map(([t,r])=>`<div class="attention-row" data-open="${r._row}"><strong>${esc(t)}</strong><div>${esc(r.Company)} · ${esc(r.Role)}</div><span class="row-chevron">›</span></div>`).join(''):`<div class="notice">Nothing needs immediate attention.</div>`}</section>
  <section class="card" style="margin-top:18px"><div class="section-title"><div><h3>Next prepared applications</h3><p>Missing deadlines first, then earliest closing dates.</p></div><button class="btn soft" data-goto="deadlines">View all</button></div><div class="deadline-list">${deadlineRows().map(deadlineMarkup).join('')||`<div class="empty">No prepared applications in this workbook.</div>`}</div></section>`;
}

if(state.view==='analytics'){
  state.view='overview';
  localStorage.setItem('jobDashView','overview');
}

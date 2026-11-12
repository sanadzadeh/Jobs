function weekStartMonday(d){
  const x=new Date(d);
  const day=(x.getDay()+6)%7;
  x.setDate(x.getDate()-day);
  x.setHours(0,0,0,0);
  return x;
}

function weekKey(d){
  const w=weekStartMonday(d);
  return `${w.getFullYear()}-${String(w.getMonth()+1).padStart(2,'0')}-${String(w.getDate()).padStart(2,'0')}`;
}

function weeklySeries(){
  const applied=new Map(),rejected=new Map();
  let latest=null;

  state.rows.forEach(r=>{
    const a=dateFrom(r['Applied date']);
    if(a){
      const w=weekStartMonday(a),k=weekKey(w);
      applied.set(k,(applied.get(k)||0)+1);
      if(!latest||w>latest)latest=w;
    }

    const u=dateFrom(r['Last update']);
    if(u){
      const w=weekStartMonday(u);
      if(!latest||w>latest)latest=w;
    }

    if(r.Status==='Rejected'&&u){
      const w=weekStartMonday(u),k=weekKey(w);
      rejected.set(k,(rejected.get(k)||0)+1);
    }
  });

  if(!latest)return [];
  const out=[];
  for(let i=11;i>=0;i--){
    const w=new Date(latest);
    w.setDate(w.getDate()-i*7);
    const k=weekKey(w);
    out.push([k,applied.get(k)||0,rejected.get(k)||0]);
  }
  return out;
}

function weeklyAxisLabel(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
}

function historicalInProgressSeries(series){
  if(!series.length)return [];
  const asDay=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;
  const parseWeek=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000};
  const first=parseWeek(series[0][0]),last=parseWeek(series[series.length-1][0])+6;
  const today=asDay(new Date());
  const windows=state.rows.map(r=>{
    const applied=dateFrom(r['Applied date']),deadline=dateFrom(r.Deadline);
    if(!applied||!deadline)return null;
    const start=asDay(applied),due=asDay(deadline);
    let end=due+45;
    if(r['Manual status']==='Rejected'){
      const rejected=dateFrom(r['Manual last update']);
      if(rejected)end=Math.min(end,asDay(rejected));
    }else if(['Role withdrawn','Recruitment cancelled','Ad closed'].includes(r['Manual status'])){
      const closed=dateFrom(r['Manual last update']);
      if(closed)end=Math.min(end,asDay(closed));
    }
    return {start:Math.max(start,due+20),end};
  }).filter(Boolean);
  const out=[];
  for(let day=first;day<=Math.min(last,today);day++){
    const count=windows.reduce((n,w)=>n+(w.start<=day&&day<w.end?1:0),0);
    out.push([day,count]);
  }
  return out;
}

function lineChart(series){
  if(!series.length)return `<div class="empty">No dated applications yet.</div>`;
  const W=650,H=235,pL=36,pR=12,pT=24,pB=42;
  const plotW=W-pL-pR,plotH=H-pT-pB;
  const progress=historicalInProgressSeries(series);
  const max=Math.max(1,...series.flatMap(x=>[x[1],x[2]]),...progress.map(x=>x[1]));
  const step=plotW/series.length;
  const groupW=Math.min(36,step*.72),gap=3,barW=(groupW-gap)/2;
  const scaledMax=Math.sqrt(max);
  const y=v=>H-pB-(Math.sqrt(Math.max(0,v))/scaledMax)*plotH;
  const bars=series.map((x,i)=>{
    const cx=pL+step*i+step/2;
    const ax=cx-groupW/2,rx=ax+barW+gap;
    const ah=(Math.sqrt(x[1])/scaledMax)*plotH,rh=(Math.sqrt(x[2])/scaledMax)*plotH;
    return `<rect x="${ax.toFixed(1)}" y="${y(x[1]).toFixed(1)}" width="${barW.toFixed(1)}" height="${ah.toFixed(1)}" rx="2" fill="var(--accent)"><title>Week of ${weeklyAxisLabel(x[0])} · Applied: ${x[1]}</title></rect><rect x="${rx.toFixed(1)}" y="${y(x[2]).toFixed(1)}" width="${barW.toFixed(1)}" height="${rh.toFixed(1)}" rx="2" fill="var(--risk)"><title>Week of ${weeklyAxisLabel(x[0])} · Rejected: ${x[2]}</title></rect>`;
  }).join('');
  const labels=series.map((x,i)=>{
    const cx=pL+step*i+step/2;
    return `<text class="axis" x="${cx.toFixed(1)}" y="${H-10}" text-anchor="middle">${weeklyAxisLabel(x[0])}</text>`;
  }).join('');
  const progressX=day=>{
    const [year,month,date]=series[0][0].split('-').map(Number);
    const first=Date.UTC(year,month-1,date)/86400000;
    return pL+step*((day-first+.5)/7);
  };
  const path=progress.map(([day,count],i)=>`${i?'L':'M'}${progressX(day).toFixed(2)},${y(count).toFixed(2)}`).join(' ');
  const line=progress.length?`<path d="${path}" fill="none" stroke="var(--good)" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${progress.map(([day,count])=>{const d=new Date(day*86400000),label=`${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;return `<circle cx="${progressX(day).toFixed(2)}" cy="${y(count).toFixed(2)}" r="5" fill="transparent" stroke="none"><title>${label} · In Progress: ${count}</title></circle>`}).join('')}`:'';
  const legend=`<g><rect x="${pL}" y="5" width="9" height="9" rx="2" fill="var(--accent)"/><text class="axis" x="${pL+14}" y="13">Applied</text><rect x="${pL+70}" y="5" width="9" height="9" rx="2" fill="var(--risk)"/><text class="axis" x="${pL+84}" y="13">Rejected</text><line x1="${pL+154}" y1="9.5" x2="${pL+173}" y2="9.5" stroke="var(--good)" stroke-width="2.7"/><text class="axis" x="${pL+179}" y="13">In Progress (daily)</text></g>`;
  return `<svg class="svg-chart" role="img" aria-label="Weekly applied and rejected applications, with daily in-progress applications 20 to 44 days after deadline, using the same square-root axis" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${legend}${[0,.25,.5,.75,1].map(t=>{const yy=H-pB-t*plotH;const value=Math.round(max*t*t);return`<line class="gridline" x1="${pL}" y1="${yy}" x2="${W-pR}" y2="${yy}"/><text class="axis" x="${pL-6}" y="${yy+3}" text-anchor="end">${value}</text>`}).join('')}${bars}${line}${labels}</svg>`;
}

const overviewWeeklyBase=overview;
overview=function(){return overviewWeeklyBase().replace('Submissions by week.','Weekly applied/rejected bars and daily in-progress line (20–44 days after deadline) · shared square-root scale.');};

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

    if(r.Status==='Rejected'){
      const rd=dateFrom(r['Last update']);
      if(rd){
        const w=weekStartMonday(rd),k=weekKey(w);
        rejected.set(k,(rejected.get(k)||0)+1);
        if(!latest||w>latest)latest=w;
      }
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

function lineChart(series){
  if(!series.length)return `<div class="empty">No dated applications yet.</div>`;
  const W=650,H=235,pL=32,pR=12,pT=24,pB=42;
  const plotW=W-pL-pR,plotH=H-pT-pB;
  const max=Math.max(1,...series.flatMap(x=>[x[1],x[2]]));
  const step=plotW/series.length;
  const groupW=Math.min(36,step*.72),gap=3,barW=(groupW-gap)/2;
  const y=v=>H-pB-(v/max)*plotH;
  const bars=series.map((x,i)=>{
    const cx=pL+step*i+step/2;
    const ax=cx-groupW/2,rx=ax+barW+gap;
    const ah=(x[1]/max)*plotH,rh=(x[2]/max)*plotH;
    return `<rect x="${ax.toFixed(1)}" y="${y(x[1]).toFixed(1)}" width="${barW.toFixed(1)}" height="${ah.toFixed(1)}" rx="2" fill="var(--accent)"><title>Week of ${weeklyAxisLabel(x[0])} · Applied: ${x[1]}</title></rect><rect x="${rx.toFixed(1)}" y="${y(x[2]).toFixed(1)}" width="${barW.toFixed(1)}" height="${rh.toFixed(1)}" rx="2" fill="var(--risk)"><title>Week of ${weeklyAxisLabel(x[0])} · Rejected: ${x[2]}</title></rect>`;
  }).join('');
  const labels=series.map((x,i)=>{
    const cx=pL+step*i+step/2;
    return `<text class="axis" x="${cx.toFixed(1)}" y="${H-10}" text-anchor="middle">${weeklyAxisLabel(x[0])}</text>`;
  }).join('');
  const legend=`<g><rect x="${pL}" y="5" width="9" height="9" rx="2" fill="var(--accent)"/><text class="axis" x="${pL+14}" y="13">Applied</text><rect x="${pL+70}" y="5" width="9" height="9" rx="2" fill="var(--risk)"/><text class="axis" x="${pL+84}" y="13">Rejected</text></g>`;
  return `<svg class="svg-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${legend}${[0,.25,.5,.75,1].map(t=>{const yy=pT+t*plotH;return`<line class="gridline" x1="${pL}" y1="${yy}" x2="${W-pR}" y2="${yy}"/>`}).join('')}${bars}${labels}</svg>`;
}

const overviewWeeklyBase=overview;
overview=function(){return overviewWeeklyBase().replace('Submissions by week.','Applied and rejected by week.');};

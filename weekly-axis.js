function weekStartMonday(d){
  const x=new Date(d);
  const day=(x.getDay()+6)%7;
  x.setDate(x.getDate()-day);
  x.setHours(0,0,0,0);
  return x;
}

function weeklySeries(){
  const counts=new Map();
  let latest=null;
  state.rows.forEach(r=>{
    const d=dateFrom(r['Applied date']);
    if(!d)return;
    const w=weekStartMonday(d);
    const k=`${w.getFullYear()}-${String(w.getMonth()+1).padStart(2,'0')}-${String(w.getDate()).padStart(2,'0')}`;
    counts.set(k,(counts.get(k)||0)+1);
    if(!latest||w>latest)latest=w;
  });
  if(!latest)return [];
  const out=[];
  for(let i=11;i>=0;i--){
    const w=new Date(latest);
    w.setDate(w.getDate()-i*7);
    const k=`${w.getFullYear()}-${String(w.getMonth()+1).padStart(2,'0')}-${String(w.getDate()).padStart(2,'0')}`;
    out.push([k,counts.get(k)||0]);
  }
  return out;
}

function weeklyAxisLabel(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
}

function lineChart(series){
  if(!series.length)return `<div class="empty">No dated applications yet.</div>`;
  const W=650,H=220,pL=32,pR=12,pT=15,pB=36;
  const max=Math.max(1,...series.map(x=>x[1]));
  const pts=series.map((x,i)=>[
    pL+i/(Math.max(1,series.length-1))*(W-pL-pR),
    H-pB-(x[1]/max)*(H-pT-pB)
  ]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=path+` L ${pts[pts.length-1][0]} ${H-pB} L ${pts[0][0]} ${H-pB} Z`;
  return `<svg class="svg-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${[0,.25,.5,.75,1].map(t=>{const y=pT+t*(H-pT-pB);return`<line class="gridline" x1="${pL}" y1="${y}" x2="${W-pR}" y2="${y}"/>`}).join('')}
    <path class="chart-fill" d="${area}"/>
    <path class="chart-line" d="${path}"/>
    ${pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"><title>Week of ${weeklyAxisLabel(series[i][0])}: ${series[i][1]}</title></circle>`).join('')}
    ${series.map((x,i)=>`<text class="axis" x="${pts[i][0]}" y="${H-10}" text-anchor="middle">${weeklyAxisLabel(x[0])}</text>`).join('')}
  </svg>`;
}

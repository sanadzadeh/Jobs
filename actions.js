function applicationActions(r){
  return [
    ['Tailored CV','Copy CV','copy'],
    ['Cover letter','Copy cover','copy'],
    ['Dashboard','Dashboard','link'],
    ['Apply link','Apply','link'],
    ['Confirmation email','Confirmation','link'],
    ['Latest email','Latest email','link']
  ].map(([field,label,type])=>[label,linkFor(r,field),type]).filter(x=>x[1]);
}

function actionMarkup(r,limit){
  const items=applicationActions(r);
  return (limit?items.slice(0,limit):items).map(([label,url,type])=>{
    if(type==='copy') return `<a class="mini-link copy-link" href="#" data-copy-url="${esc(url)}" data-copy-label="${esc(label)}">${esc(label)}</a>`;
    return `<a class="mini-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  }).join('');
}

async function copyAction(url,label){
  try{
    await navigator.clipboard.writeText(url);
  }catch(err){
    const t=document.createElement('textarea');
    t.value=url;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';
    document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();
  }
  toast(`${label} copied`);
}

document.addEventListener('click',e=>{
  const a=e.target.closest('[data-copy-url]');
  if(!a)return;
  e.preventDefault();e.stopPropagation();
  copyAction(a.dataset.copyUrl,a.dataset.copyLabel||'Link');
});

openDrawer=function(rowNo){
  const r=state.rows.find(x=>x._row===rowNo);if(!r)return;
  document.getElementById('drawerTitle').textContent=r.Role||'Application';
  document.getElementById('drawerSub').textContent=[r.Company,r['Job ID']].filter(Boolean).join(' · ');
  const detail=[['Status',statusBadge(r.Status)],['Applied',esc(fmtDate(r['Applied date'])||'—')],['Deadline',esc(fmtDate(r.Deadline)||'—')],['Last update',esc(fmtDate(r['Last update'])||r['Last update']||'—')],['Contact',esc(r.Contact||'—')],['Email',r['Contact email']?`<a href="mailto:${esc(r['Contact email'])}">${esc(r['Contact email'])}</a>`:'—']];
  document.getElementById('drawerBody').innerHTML=`<div class="detail-grid">${detail.map(([l,v])=>`<div class="detail"><label>${l}</label><div>${v}</div></div>`).join('')}</div><div class="drawer-links">${actionMarkup(r)}</div><div class="eyebrow">Notes</div><div class="notes">${esc(r.Notes||'No notes recorded.')}</div>`;
  document.getElementById('drawer').classList.add('open');document.getElementById('drawerBackdrop').classList.add('open');
};

appTable=function(){
  const rows=filteredRows();
  return `${toolbar()}<div class="table-wrap"><table><thead><tr><th>Status</th><th>Company</th><th>Role</th><th>Applied</th><th>Deadline</th><th>Job ID</th><th>Contact</th><th>Actions</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr data-open="${r._row}"><td>${statusBadge(r.Status)}</td><td class="company">${esc(r.Company)}</td><td class="role">${esc(r.Role)}</td><td>${esc(fmtDate(r['Applied date']))}</td><td>${esc(fmtDate(r.Deadline))}</td><td>${esc(r['Job ID']||'')}</td><td>${esc(r.Contact||'')}</td><td><div class="linkrow" onclick="event.stopPropagation()">${actionMarkup(r,5)}</div></td><td class="row-chevron">›</td></tr>`).join('')}</tbody></table>${rows.length?'':'<div class="empty">No applications match these filters.</div>'}</div><div class="footer-note">Showing ${rows.length} of ${state.rows.length} records. Deadline sorting is the default.</div>`;
};
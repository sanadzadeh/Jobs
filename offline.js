function parseOfflineSheet(buf){
  try{
    const wb=XLSX.read(buf,{type:'array',cellDates:true,cellNF:true,cellText:true});
    const ws=wb.Sheets['Offline'];
    if(!ws||!ws['!ref'])return [];
    const raw=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
    return raw.map((r,i)=>({
      _row:i+2,
      Company:String(r.Company||'').trim(),
      Industry:String(r.Industry||'').trim(),
      Website:String(r.Website||'').trim(),
      Contact:String(r.Contact||'').trim(),
      'Contact details':String(r['Contact details']||'').trim(),
      Status:String(r.Status||'').trim()
    })).filter(r=>r.Company);
  }catch(e){
    console.warn('Could not read Offline sheet',e);
    return [];
  }
}

function offline(){
  const rows=state.offlineRows||[];
  return `${pageHead('Offline','Direct outreach targets that are not tied to an advertised vacancy.')}<section class="grid kpis" style="grid-template-columns:repeat(2,minmax(0,1fr));max-width:620px"><div class="card"><div class="eyebrow">Targets</div><div class="kpi-value">${rows.length}</div><div class="kpi-sub">Companies identified for direct outreach</div></div><div class="card"><div class="eyebrow">To contact</div><div class="kpi-value">${rows.filter(r=>!r.Status||r.Status==='To contact').length}</div><div class="kpi-sub">Not yet contacted</div></div></section><div class="card" style="margin-top:18px"><div class="section-title"><div><h3>Direct outreach</h3><p>Keep this intentionally small. Company, industry, website and contact are enough.</p></div></div><div class="table-wrap"><table><thead><tr><th>Company</th><th>Industry</th><th>Website</th><th>Contact</th><th>Contact details</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="company">${esc(r.Company)}</td><td>${esc(r.Industry)}</td><td>${cleanUrl(r.Website)?`<a class="mini-link" href="${esc(r.Website)}" target="_blank" rel="noopener">Website</a>`:'—'}</td><td>${esc(r.Contact||'—')}</td><td>${r['Contact details']&&r['Contact details'].includes('@')?`<a href="mailto:${esc(r['Contact details'])}">${esc(r['Contact details'])}</a>`:esc(r['Contact details']||'—')}</td><td>${statusBadge(r.Status||'To contact')}</td></tr>`).join('')||`<tr><td colspan="6"><div class="empty">No offline targets found. Add them to the Offline sheet in the workbook.</div></td></tr>`}</tbody></table></div></div>`;
}

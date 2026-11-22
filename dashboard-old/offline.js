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
      Status:String(r.Status||'').trim(),
      'Outreach message':String(r['Outreach message']||'').trim()
    })).filter(r=>r.Company);
  }catch(e){
    console.warn('Could not read Offline sheet',e);
    return [];
  }
}

function offlineMessage(text){
  if(!text)return '—';
  return `<details style="min-width:260px"><summary class="mini-link" style="cursor:pointer">View message</summary><div style="margin-top:9px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt);font-size:.62rem;line-height:1.55;white-space:normal;min-width:320px;max-width:620px">${esc(text).replace(/\n/g,'<br>')}</div></details>`;
}

function offline(){
  const rows=state.offlineRows||[];
  return `${pageHead('Offline','Direct outreach targets that are not tied to an advertised vacancy.')}<section class="grid kpis" style="grid-template-columns:repeat(2,minmax(0,1fr));max-width:620px"><div class="card"><div class="eyebrow">Targets</div><div class="kpi-value">${rows.length}</div><div class="kpi-sub">People identified for direct outreach</div></div><div class="card"><div class="eyebrow">To contact</div><div class="kpi-value">${rows.filter(r=>!r.Status||r.Status==='To contact').length}</div><div class="kpi-sub">Not yet contacted</div></div></section><div class="card" style="margin-top:18px"><div class="section-title"><div><h3>Direct outreach</h3><p>Company, contact, channel, status and the prepared message are kept together here.</p></div></div><div class="table-wrap"><table><thead><tr><th>Company</th><th>Industry</th><th>Website</th><th>Contact</th><th>Contact details</th><th>Status</th><th>Outreach</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="company">${esc(r.Company)}</td><td>${esc(r.Industry)}</td><td>${cleanUrl(r.Website)?`<a class="mini-link" href="${esc(r.Website)}" target="_blank" rel="noopener">Website</a>`:'—'}</td><td>${esc(r.Contact||'—')}</td><td>${r['Contact details']&&r['Contact details'].includes('@')?`<a href="mailto:${esc(r['Contact details'])}">${esc(r['Contact details'])}</a>`:esc(r['Contact details']||'—')}</td><td>${statusBadge(r.Status||'To contact')}</td><td>${offlineMessage(r['Outreach message'])}</td></tr>`).join('')||`<tr><td colspan="7"><div class="empty">No offline targets found. Add them to the Offline sheet in the workbook.</div></td></tr>`}</tbody></table></div></div>`;
}

// Master CVs are loaded from the workbook's "Master CVs" tab.
function parseMasterCVSheet(buf){
  try {
    const wb=XLSX.read(buf,{type:'array',cellDates:true,cellNF:true,cellText:true});
    const ws=wb.Sheets['Master CVs'];
    if(!ws||!ws['!ref'])return [];
    return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false}).map((r,i)=>({
      _row:i+2,
      name:String(r['Master CV']||'').trim(),
      focus:String(r.Focus||'').trim(),
      url:cleanUrl(r['Google Doc URL']),
      text:String(r['Full CV Text']||''),
      updated:String(r.Updated||''),
      use:String(r.Use||'')
    })).filter(r=>r.name);
  } catch(e){console.warn('Could not read Master CVs sheet',e);return [];}
}
function masterCVs(){
  const rows=state.masterCVRows||[];
  if(!rows.length)return pageHead('Master CVs','Four reusable CVs from the Master CVs worksheet.')+
    '<div class="card"><div class="empty">No Master CVs worksheet was found in the loaded workbook. Export and load the latest Google spreadsheet to see the four CVs.</div></div>';
  return pageHead('Master CVs','Four reusable CVs, with full text loaded from the Master CVs worksheet.')+
    '<div class="notice doc-note">The Google Docs are the editable masters. This view shows the content from your most recently uploaded workbook.</div>'+
    '<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,390px),1fr));gap:16px">'+rows.map((r,i)=>{
      const words=r.text.trim()?r.text.trim().split(/\s+/).length:0;
      const link=r.url?'<a class="mini-link" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">Open Google Doc ↗</a>':'';
      return '<article class="card" style="min-width:0">'+
        '<div class="eyebrow">Master '+String(i+1).padStart(2,'0')+'</div>'+
        '<h3 style="margin:8px 0 10px;font-size:1.12rem">'+esc(r.name)+'</h3>'+
        '<p style="color:var(--ink-2);line-height:1.6">'+esc(r.focus)+'</p>'+
        '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:16px 0">'+link+
        '<span style="color:var(--ink-3);font-size:.75rem">'+words+' words</span></div>'+
        '<details><summary class="mini-link" style="cursor:pointer">View full CV text</summary>'+
        '<div style="margin-top:12px"><textarea readonly spellcheck="false" aria-label="'+esc(r.name)+' full CV" class="doc-editor" style="width:100%;min-height:440px;white-space:pre-wrap">'+esc(r.text)+'</textarea></div></details>'+
        '</article>';
    }).join('')+'</section>';
}

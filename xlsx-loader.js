let xlsxLoadPromise=null;

function ensureXlsxLoaded(){
  if(window.XLSX)return Promise.resolve(window.XLSX);
  if(xlsxLoadPromise)return xlsxLoadPromise;

  xlsxLoadPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async=true;
    script.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Excel support did not initialise'));
    script.onerror=()=>reject(new Error('Could not load Excel support'));
    document.head.appendChild(script);
  }).catch(err=>{
    xlsxLoadPromise=null;
    throw err;
  });

  return xlsxLoadPromise;
}

loadWorkbook=async function(file){
  const status=document.getElementById('uploadStatus');
  if(!file)return;
  if(!validateExtension(file)){
    const msg='Choose an .xlsx or .xls file.';
    status.textContent=msg;
    status.className='upload-status error';
    if(state.rows.length)toast(msg);
    return;
  }

  status.textContent=`Preparing to read ${file.name}…`;
  status.className='upload-status working';

  try{
    await ensureXlsxLoaded();
    status.textContent=`Reading ${file.name}…`;
    const buf=await file.arrayBuffer();
    parseWorkbook(buf,file.name);
    status.textContent='';
    status.className='upload-status';
    toast(`${state.rows.length} applications loaded`);
  }catch(err){
    const msg=err.message||'Could not read this workbook.';
    status.textContent=msg;
    status.className='upload-status error';
    if(state.rows.length)toast(msg);
  }
};

 
// Public repository workbook is the default source; upload remains available.
const PUBLISHED_WORKBOOK='./data/Job%20Application%20Register.xlsx';
let publishedLoadPromise=null;
async function reloadPublishedWorkbook(){
  if(publishedLoadPromise)return publishedLoadPromise;
  const status=document.getElementById('uploadStatus');
  const btn=document.getElementById('reloadBtn');
  publishedLoadPromise=(async()=>{
    if(btn){btn.disabled=true;btn.textContent='Reloading…';}
    status.textContent='Loading register from GitHub…';
    status.className='upload-status working';
    try{
      await ensureXlsxLoaded();
      const url=PUBLISHED_WORKBOOK+'?v='+Date.now();
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw new Error('Repository Excel unavailable ('+response.status+')');
      const data=await response.arrayBuffer();
      // Ensure document hydration is complete before the dashboard renders.
      if(typeof loadCleanDocuments==='function')await loadCleanDocuments();
      parseWorkbook(data,'Repository Excel');
      status.textContent='';
      status.className='upload-status';
      toast(state.rows.length+' applications loaded from GitHub');
    }catch(err){
      const message='Could not load repository Excel: '+(err.message||'Unknown error');
      status.textContent=message+'; you can upload a file instead.';
      status.className='upload-status error';
      if(state.rows.length)toast(message);
      else document.querySelector('#dropZone strong').textContent='Drop Excel file here';
      console.error(message,err);
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Reload register';}
    }
  })();
  try{return await publishedLoadPromise}finally{publishedLoadPromise=null}
}
document.getElementById('reloadBtn')?.addEventListener('click',reloadPublishedWorkbook);
window.addEventListener('load',reloadPublishedWorkbook,{once:true});

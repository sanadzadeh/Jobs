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

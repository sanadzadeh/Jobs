// Sort deadlines from latest to earliest.
// Load this file after core.js and before views.js.
function preparedDeadlineSort(a,b){
  const da=dateFrom(a.Deadline);
  const db=dateFrom(b.Deadline);

  // Keep rows without a deadline at the bottom.
  if(!da&&!db) return String(a.Company||'').localeCompare(String(b.Company||''));
  if(!da) return 1;
  if(!db) return -1;

  return db-da;
}

function deadlineSort(a,b){
  const aMissing=a.Status==='Prepared'&&!dateFrom(a.Deadline);
  const bMissing=b.Status==='Prepared'&&!dateFrom(b.Deadline);

  // Keep prepared rows without a deadline at the bottom.
  if(aMissing!==bMissing) return aMissing?1:-1;

  const da=dateFrom(effectiveDeadline(a));
  const db=dateFrom(effectiveDeadline(b));

  if(!da&&!db) return String(a.Company||'').localeCompare(String(b.Company||''));
  if(!da) return 1;
  if(!db) return -1;

  return db-da;
}

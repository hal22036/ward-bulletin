const PREVIEW_ACCOUNT_KEY='bulletin-studio-account-preview-v1';
const PREVIEW_PLANS={bulletin:{name:'Ward Bulletin Studio',monthly:6,annual:66},kids:{name:'Kids Program Library',monthly:2,annual:22},bundle:{name:'Complete Bundle',monthly:8,annual:88}};
function readPreviewAccount(){try{const value=JSON.parse(localStorage.getItem(PREVIEW_ACCOUNT_KEY)||'{}');return {...value,plan:PREVIEW_PLANS[value.plan]?value.plan:'bulletin',billing:value.billing==='annual'?'annual':'monthly'};}catch{return {plan:'bulletin',billing:'monthly'};}}
function previewLibraryAccess(account){return account.plan==='kids'||account.plan==='bundle';}
function filterLibraryPrograms(programs,{query='',month='',activity=''}={}){query=query.toLowerCase().trim();return programs.filter(p=>(!query||[p.title,p.topic,p.holiday,p.activity].join(' ').toLowerCase().includes(query))&&(!month||p.date.startsWith(month))&&(!activity||p.activity===activity)).sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));}
window.BulletinPreview={plans:PREVIEW_PLANS,readAccount:readPreviewAccount,hasLibrary:previewLibraryAccess,filterPrograms:filterLibraryPrograms};
const accountForm=document.querySelector('#accountForm');
if(accountForm){
 const account=readPreviewAccount();for(const key of ['ownerName','ownerEmail','unitName'])document.getElementById(key).value=account[key]||'';
 accountForm.querySelector(`[name="plan"][value="${account.plan}"]`).checked=true;accountForm.querySelector(`[name="billing"][value="${account.billing}"]`).checked=true;
 function updatePlanPrices(){const period=accountForm.querySelector('[name="billing"]:checked').value;for(const node of document.querySelectorAll('[data-price]'))node.textContent='$'+PREVIEW_PLANS[node.dataset.price][period]+' / '+(period==='annual'?'year':'month');}
 function updatePlanSummary(){const saved=readPreviewAccount();document.querySelector('#planSummary').textContent='Saved preview: '+PREVIEW_PLANS[saved.plan].name+' · '+(saved.billing==='annual'?'Annual':'Monthly')+'.';document.querySelector('#openKids').hidden=!(saved.libraryAdmin||previewLibraryAccess(saved));}
 accountForm.addEventListener('change',updatePlanPrices);
 accountForm.addEventListener('submit',event=>{event.preventDefault();const value={};for(const key of ['ownerName','ownerEmail','unitName'])value[key]=document.getElementById(key).value.trim();value.plan=accountForm.querySelector('[name="plan"]:checked').value;value.billing=accountForm.querySelector('[name="billing"]:checked').value;try{localStorage.setItem(PREVIEW_ACCOUNT_KEY,JSON.stringify(value));document.querySelector('#accountStatus').textContent='Preview settings saved on this browser. No subscription was created and no payment was taken.';updatePlanSummary();}catch{document.querySelector('#accountStatus').textContent='Could not save preview settings. Browser storage may be unavailable.';}});updatePlanPrices();updatePlanSummary();
}

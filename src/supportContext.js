export const emptySapContext=()=>({system:'',module:'',transaction:'',companyCode:'',plant:'',storageLocation:'',documentNumber:'',fiscalYear:'',movementType:'',postingDate:'',message:'',messageClass:'',messageNumber:'',scope:'',impact:''});

export function inferSapContext(text='',scenario={}){
 const q=text.toLowerCase(); const c=emptySapContext();
 const category=scenario.category||'';
 c.module=category.replace(/^SAP\s*/i,'').trim();
 const tcodes=['MIGO','MBST','MIRO','ME21N','ME22N','ME23N','ME51N','ME52N','ME53N','SU53','ST22','SM37','SP01','WE02','WE05','SM58','F110'];
 c.transaction=tcodes.find(t=>new RegExp('\\b'+t+'\\b','i').test(text))||'';
 if(/\bprd\b|production system|\bprod\b/.test(q))c.system='PRD';
 else if(/\bqas\b|quality system|\bqa\b/.test(q))c.system='QAS';
 else if(/\bdev\b|development system/.test(q))c.system='DEV';
 const msg=text.match(/\b([A-Z]{1,3})\s*[- ]?(\d{3,4})\b/);
 if(msg){c.messageClass=msg[1].toUpperCase();c.messageNumber=msg[2];c.message=msg[0]}
 if(/everyone|all users|site-wide/.test(q))c.scope='Everyone / site-wide';
 else if(/multiple|several users|team/.test(q))c.scope='Several users';
 else if(/only me|just me/.test(q))c.scope='One user';
 if(/blocked|cannot work|can't work|critical|urgent/.test(q))c.impact='Business process blocked';
 return c;
}

export function sapRequiredEvidence(scenario={}){
 const id=scenario.id||'', cat=scenario.category||'';
 const common=['system','transaction','message','scope','impact'];
 if(/material-document|mm/i.test(id)||/SAP MM/i.test(cat))return [...common,'documentNumber','fiscalYear','movementType','plant'];
 if(/SAP FI/i.test(cat))return [...common,'companyCode','documentNumber'];
 if(/SAP SD/i.test(cat))return [...common,'documentNumber'];
 return common;
}

export const evidenceStrength=(confidence=0)=>confidence>=85?'High':confidence>=65?'Medium':'Low';

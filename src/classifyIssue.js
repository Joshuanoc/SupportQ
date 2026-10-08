import { scenarios } from './data.js';

const keywordMap={
 'wifi-no-internet':['wifi','wi-fi','internet','dns','website','websites','connected no internet','network'],
 'vpn-failure':['vpn','remote access','tunnel','internal resource'],
 'locked-account':['locked','password','sign in','login','mfa','account','authentication','sso'],
 'outlook-send':['outlook','email','mail','outbox','send email','exchange'],
 'slow-pc':['slow','lag','performance','cpu','memory','windows slow','computer slow','pc slow'],
 'printer-offline':['printer','printing','print','spooler'],
 'phishing':['phishing','suspicious email','scam','malware','mfa prompt','clicked link'],
 'onedrive-sync':['onedrive','sync','files not syncing'],
 'app-crash':['app crash','application crash','crashes','won\'t open','will not open','software'],
 'camera-teams':['teams camera','camera','webcam','video'],
 'azure-access':['azure','rbac','403','cloud access','permission denied'],
 'disk-full':['disk full','storage full','low disk','drive full','space']
};

export function classifyIssue(text){
 const q=text.toLowerCase().trim();
 const tokens=q.replace(/[^a-z0-9/ -]/g,' ').split(/\s+/).filter(x=>x.length>2);
 const sapIntent=/\bsap\b|\bmigo\b|\bmiro\b|\bme2\w*\b|\bme5\w*\b|\bmmbe\b|\bmbst\b|\bgr\/?ir\b|\bidoc\b|\bst22\b|\bsm37\b|\bfiori\b|material document|purchase order|purchase requisition|goods receipt|invoice receipt|movement type|vendor|supplier|posting period|obyc/i.test(q);
 const sapSynonyms={
  cancel:['cancel','cancelled','canceled','cancellation','reverse','reversal'],
  reverse:['reverse','reversal','cancel','cancelled','canceled'],
  material:['material','stock','inventory'],
  document:['document','posting'],
  po:['po','purchase order'],
  pr:['pr','purchase requisition'],
  gr:['gr','goods receipt'],
  invoice:['invoice','miro']
 };
 const expanded=new Set(tokens);
 tokens.forEach(t=>(sapSynonyms[t]||[]).forEach(v=>v.split(' ').forEach(x=>expanded.add(x))));
 const preferred = /\bazure\b|\brbac\b|\bpim\b/.test(q)?'azure-access':sapRoute(q);
 const ranked=scenarios.map(s=>{
  let score=s.id===preferred?1000:0;
  const hay=`${s.id} ${s.category} ${s.title} ${s.symptoms.join(' ')}`.toLowerCase();
  const words=keywordMap[s.id]||[];
  words.forEach(k=>{if(q.includes(k))score+=k.includes(' ')?7:3});
  if(q.includes(s.category.toLowerCase()))score+=4;
  s.symptoms.forEach(x=>{const sx=x.toLowerCase();if(q.includes(sx))score+=sx.includes(' ')?10:5});
  expanded.forEach(t=>{if(t.length>2&&hay.includes(t))score+=1});
  if(sapIntent&&s.category.toLowerCase().startsWith('sap'))score+=8;
  if(sapIntent&&!s.category.toLowerCase().startsWith('sap'))score-=8;
  return{s,score};
 }).sort((a,b)=>b.score-a.score);
 return ranked.filter(x=>x.score>0);
}


// Business-process cues take precedence over shared words such as account or network.
function sapRoute(q){
 const rules=[
  [/\b(?:sap|migo|miro|su53|fiori|po)\b.*(?:not authorized|authorization|role)|\bsu53\b|missing (?:movement.type|plant) authorization|role assigned.*(?:buffer|session)|fiori.*backend authorization/, 'sap-authorization'],
  [/(?:material document|migo|mbst|movement)\b.*(?:revers|cancel)|\b(?:102|123|162|344|322)\b.*revers/, 'sap-material-document-reversal'],
  [/closed posting period|posting period.*closed|closed.*posting period|\bfi\b.*period.*closed/, 'sap-posting-period'],
  [/\bwbs\b|account assignment|account-assignment|network activity|project (?:stock|budget)|settlement rule/, 'sap-account-assignment'],
  [/\bgr\s*\/?\s*ir\b|\bgrir\b/, 'sap-grir-balance'],
  [/\bidoc\b/, 'sap-idoc-data'],
  [/\bariba\b|\bcig\b/, 'sap-ariba-integration'],
  [/\b(?:st22|sm37)\b|sap short dump|background job/, 'sap-basis-runtime'],
  [/\bobyc\b|account determination/, 'sap-account-determination'],
  [/\buom\b|unit of measure|unit conversion/, 'sap-uom'],
  [/(?:vendor|supplier).*(?:block|purchasing organization|partner function)|vendor partner/, 'sap-vendor-blocked'],
  [/material.*(?:not extended|view missing|missing.*view|status|valuation|split valuation)|(?:accounting|purchasing|storage) view|valuation class|split valuation/, 'sap-material-master'],
  [/source of supply|source list|source.*(?:missing|not determined)|purchasing info record|contract.*expired|scheduling agreement/, 'sap-pr-source'],
  [/release strategy|\bpo\b.*(?:approv|release)|purchase order.*(?:approv|release)|approver.*purchase order/, 'sap-po-release'],
  [/\b(?:122|161|343|321|311|301|309)\b|storage.location transfer|plant.to.plant|material.to.material/, 'sap-goods-movement'],
  [/duplicate invoice|duplicate.*invoice|invoice.*(?:wrong po|currency mismatch)|miro.*tax code/, 'sap-invoice-posting'],
  [/\bmiro\b|invoice.*(?:variance|tolerance|wrong po|duplicate|currency)|duplicate invoice/, 'sap-miro-blocked'],
  [/\bmigo\b|goods receipt|\bgr\b|\bpo\b.*(?:quantity|overdelivery|underdelivery|delivery complete)|batch.managed|serial.number.managed/, 'sap-gr-posting'],
  [/\bg\/l\b|cost center|internal order|profit center|document balance|tax code|currency.*posting/, 'sap-fi']
 ];
 return rules.find(([pattern])=>pattern.test(q))?.[1];
}

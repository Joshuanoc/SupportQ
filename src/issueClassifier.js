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

export function classifyIssue(text, scenarios){
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
 const ranked=scenarios.map(s=>{
  let score=0;
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

// User observations are evidence, never proof of an independently verified result.
export function normalize(text='') {
  return text.toLowerCase().replace(/\b(?:wifii|wi fi)\b/g,'wifi').replace(/\b(?:materail|matrial)\b/g,'material').replace(/\bdocum(?:net|nt)\b/g,'document').replace(/\b(?:cancle|cncel)\b/g,'cancel');
}
export function extractFacts(text) {
  const q=normalize(text), facts={}, entities={};
  const document=q.match(/\b\d{10}\b/); if(document)entities.documentNumber=document[0];
  const transaction=q.match(/\b(migo|mbst|miro|vl02n|ob52|mmrv)\b/);if(transaction)entities.transaction=transaction[0].toUpperCase();
  if(/\bmac(?:book)?\b/.test(q))entities.os='macOS';
  if(/posting period.*closed|closed.*posting period|period is closed/.test(q))facts.error='period';
  else if(/already (?:reversed|cancelled|canceled)/.test(q))facts.error='reversed';
  else if(/not authori[sz]ed|authorization error|missing authorization/.test(q))facts.error='authorization';
  if(!facts.error&&/\berror\s+\S+/i.test(text)) {facts.error='other';facts.exactError=text;}
  if(/(?:all|none of|other|multiple) (?:the )?devices.*(?:fail|no internet|not work|don't work)|none of them (?:work|do)|everyone.*no internet/.test(q))facts.scope='shared';
  else if(/other devices (?:work|have internet)|only (?:my|this) (?:mac|device).*no internet/.test(q))facts.scope='device';
  if(/(?:already |have |has |i )?(?:restarted|rebooted) (?:the )?(?:router|modem)/.test(q))facts.restart='done';
  if(/haven't (?:restarted|rebooted)|not (?:restarted|rebooted)/.test(q))delete facts.restart;
  return {facts,entities};
}
export function supportsAdaptive(id) {return ['wifi-no-internet','sap-material-document-reversal','sap-posting-period'].includes(id);}
export function createSession(issue,scenarioId,sessionId) {
  const {facts,entities}=extractFacts(issue);
  return {version:1,sessionId,scenarioId,domain:scenarioId.startsWith('sap-')?'SAP':'IT',module:scenarioId.startsWith('sap-')?'MM/FI':null,intent:scenarioId==='wifi-no-internet'?'network_connectivity':scenarioId==='sap-posting-period'?'posting_period_diagnosis':'material_document_reversal',entities,knownFacts:facts,completedChecks:[],unavailableChecks:[],evidence:[{source:'user',text:issue}],turns:[],resolutionStatus:'in_progress'};
}
const question=(id,prompt,why,options)=>({id,prompt,why,options:options.map(([value,label])=>({value,label}))});
const unavailable=['unavailable','I cannot check'];
function terminal(status,prompt,why) {return {id:status,prompt,why,options:[],terminal:true,status};}
export function nextAction(s) {
  const f=s.knownFacts, unavailableCheck=id=>s.unavailableChecks.includes(id);
  if(s.resolutionStatus==='resolved')return terminal('resolved','You reported that the issue is resolved.','The outcome is based on your confirmation; SupportQ has no direct system access.');
  if(s.unavailableChecks.includes('verification'))return terminal('escalated','Ask the responsible support team to verify the original issue.','The result could not be checked, so no resolution has been confirmed. Include the attempted action and available evidence.');
  if(s.domain==='SAP') {
    if(!f.error&&!unavailableCheck('error'))return question('error','What happens when you attempt the reversal or posting?','The error identifies the relevant document, access, or posting-period checks.',[['period','Posting period closed'],['reversed','Document already reversed'],['authorization','Authorization error'],['other','Another error'],['not_attempted',"I haven't attempted it yet"],unavailable]);
    if(f.error==='period') {
      if(!f.datePolicy&&!unavailableCheck('datePolicy'))return question('datePolicy','Is the intended posting date permitted by your business policy?','A reversal is a new posting. Check the applicable MM and FI periods for that date; period changes require authorized Finance/MM support.',[['allowed','Yes, the date is approved'],['needs_approval','I need Finance/MM approval'],unavailable]);
      if(f.datePolicy==='needs_approval'||unavailableCheck('datePolicy'))return terminal('escalated','Contact authorized Finance/MM support with the intended posting date and exact period error.','Do not reopen a period or change the posting date without business approval. Include the document reference and fiscal year when available.');
      return verification(f,'Check the MM and FI periods for the approved posting date. Retry through the approved posting/reversal process only when permitted.');
    }
    if(f.error==='authorization')return terminal('escalated','Ask SAP Security to review the authorization failure.','Capture the message and use the approved authorization check immediately after failure. Request least-privilege access; do not bypass authorization.');
    if(f.error==='reversed')return verification(f,'Review document history and the reversal document reference. Do not create a duplicate reversal.');
    if(f.error==='not_attempted')return verification(f,'First review the original document, fiscal year and document flow. Attempt reversal only through the approved business process and with authorization.');
    if(!f.exactError&&!unavailableCheck('exactError'))return {id:'exactError',prompt:'Paste the exact SAP error, including its message number if available.',why:'The common blockers are not confirmed. Exact wording will determine the next diagnostic path.',options:[unavailable].map(([value,label])=>({value,label})),text:true};
    return terminal('escalated','Send the available document reference, fiscal year, posting date and error to SAP MM/FI support.','The available evidence does not establish a safe correction. Ask support to inspect document dependencies, stock and posting controls before changes.');
  }
  if(!f.scope&&!unavailableCheck('scope'))return question('scope','Do other devices on the same Wi-Fi have internet access?','This separates a shared network problem from a device-specific problem.',[['device','Yes, other devices work'],['shared','No, none of them work'],unavailable,['unknown',"I'm not sure"]]);
  if(f.scope==='shared') {
    if(!f.restart&&!unavailableCheck('restart'))return question('restart','Have you already restarted the router or modem?','A completed restart will be recorded so it is not requested again.',[['done','Yes, already restarted'],['not_done','No, not yet'],unavailable]);
    if(f.restart==='not_done'&&!f.restartResult&&!unavailableCheck('restartResult'))return question('restartResult','If you can safely access your home equipment, restart it once, wait for it to reconnect, then test a website. What happened?','Use the normal power restart, never a factory reset. Managed or shared equipment should be handled by its owner.',[['works','Internet works now'],['failed','Still no internet'],unavailable]);
    if(f.restartResult==='works')return verification(f,'Confirm a website loads on the affected devices.');
    if(!f.lights&&!unavailableCheck('lights'))return question('lights','Do the modem or router lights show an offline or alarm indicator?','An indicator is a clue to the upstream connection, not proof of an ISP outage.',[['alarm','Offline / alarm indicator'],['normal','Lights look normal'],unavailable]);
    if(!f.outage&&!unavailableCheck('outage'))return question('outage','Can you check your provider’s official outage status using mobile data?','Use a bill or account record to identify the provider. Do not infer the provider from the cable type.',[['reported','Provider reports an outage'],['none','No outage reported'],['provider_unknown',"I don't know my provider"],unavailable]);
    if(f.outage==='reported')return terminal('escalated','Follow your provider’s outage updates and retest after service restoration.','The provider reports an outage, but SupportQ cannot independently confirm its scope or restoration time.');
    if(!f.cable&&!unavailableCheck('cable'))return question('cable','Can you visually check that the modem’s incoming cable is securely seated and undamaged?','Check only accessible home equipment. Do not open equipment or touch damaged/exposed wiring.',[['checked','Cable checked; still offline'],['works','Internet returned'],unavailable]);
    if(f.cable==='works')return verification(f,'Confirm internet access on the affected devices.');
    return terminal('escalated','Contact the equipment owner or ISP with the shared-device failure and completed checks.','The fault is in the shared network path; the evidence does not isolate router, modem or ISP. Use a bill or account record to identify the provider, or ask the network owner.');
  }
  if(!s.entities.os&&!f.os&&!unavailableCheck('os'))return question('os','Which operating system is on the affected device?','This lets us give the appropriate device instructions.',[['macOS','macOS'],['Windows','Windows'],['other','Another system'],unavailable]);
  if(!f.hotspot&&!unavailableCheck('hotspot'))return question('hotspot','Does this device have internet on a different network, such as a phone hotspot?','A different path helps isolate the original Wi-Fi from device configuration.',[['works','Yes, another network works'],['failed','No, it also fails'],unavailable]);
  if(!f.browser&&!unavailableCheck('browser'))return question('browser','Does a website load in another browser or private window?','This separates browser-specific symptoms from a wider connectivity problem.',[['works','Yes, another browser works'],['failed','No, all browsers fail'],unavailable]);
  if(f.browser==='works')return verification(f,'Review the affected browser’s extensions and cache using approved procedures, then retest the original browser.');
  if(!f.details&&!unavailableCheck('details'))return {id:'details',prompt:'What exact error or network status do you see now?',why:'The simpler checks did not isolate the fault. Record the error before changing network settings.',text:true,options:[{value:'unavailable',label:'I cannot check'}]};
  return terminal('escalated','Contact Desktop/Network support with the available checks and error.','No root cause has been confirmed. Support should inspect DHCP, gateway reachability, DNS and managed VPN/proxy settings without bypassing security controls.');
}
function verification(f,why) {
  if(f.verification==='failed'||f.verification==='unavailable')return terminal('escalated','Contact the responsible support team with the attempted action and remaining error.','The action did not produce a confirmed resolution. Do not repeat it without new evidence.');
  return question('verification','After the approved check or action, is the original issue resolved?',why,[['resolved','Yes, the original issue is resolved'],['failed','No, it still fails'],unavailable]);
}
export function respond(s,{value,text}={}) {
  const node=nextAction(s);
  if(node.terminal)throw new Error('Session has no pending question');
  const raw=typeof text==='string'?text.trim():'';
  if(raw.length>4000)throw new Error('Answer is too long');
  if(!raw&&!node.options.some(o=>o.value===value))throw new Error('Invalid diagnostic answer');
  const answer=value??interpretAnswer(node,raw);
  if(!node.text&&!node.options.some(o=>o.value===answer))throw new Error('Please choose an option or describe an answer that matches this check.');
  if(!raw&&answer===undefined)throw new Error('An answer is required');
  const next=structuredClone(s);
  next.turns.push({questionId:node.id,prompt:node.prompt,value:answer,text:raw});
  next.evidence.push({source:'user',questionId:node.id,text:raw||node.options.find(o=>o.value===answer)?.label||answer});
  if(answer==='unavailable'||answer==='unknown')next.unavailableChecks=[...new Set([...next.unavailableChecks,node.id])];
  else next.knownFacts[node.id]=answer||raw;
  next.completedChecks=[...new Set([...next.completedChecks,node.id])];
  const extracted=extractFacts(raw);Object.assign(next.knownFacts,extracted.facts);Object.assign(next.entities,extracted.entities);
  if(node.id==='exactError'&&extracted.facts.error)delete next.knownFacts.verification;
  if(node.id==='verification'&&answer==='resolved')next.resolutionStatus='resolved';
  const action=nextAction(next);if(action.terminal)next.resolutionStatus=action.status;
  return next;
}
function interpretAnswer(node,text) {
  const id=node.id;
  const q=normalize(text);
  const match=node.options.find(o=>normalize(o.label)===q||o.value.toLowerCase()===q);if(match)return match.value;
  if(/(?:can't|cannot|unable to) (?:check|test|access)|not sure|don't know/.test(q))return 'unavailable';
  if(id==='scope'){if(/none|all.*fail|no.*work/.test(q))return 'shared';if(/yes|other.*work/.test(q))return 'device';}
  if(id==='restart'){if(/already|yes|restarted/.test(q))return 'done';if(/no|not yet/.test(q))return 'not_done';}
  if(id==='error')return extractFacts(text).facts.error||'other';
  if(id==='verification'){if(/^(yes|resolved|works|fixed)\b/.test(q))return 'resolved';if(/no|still|fail/.test(q))return 'failed';}
  if(['hotspot','browser'].includes(id)){if(/^(yes|works)\b/.test(q))return 'works';if(/^(no|failed)\b|still fail/.test(q))return 'failed';}
  if(id==='datePolicy'){if(/^(yes|approved)\b/.test(q))return 'allowed';if(/approval|^no\b/.test(q))return 'needs_approval';}
  if(id==='lights'){if(/alarm|offline|red/.test(q))return 'alarm';if(/normal|green/.test(q))return 'normal';}
  if(id==='outage'){if(/no outage|^no\b/.test(q))return 'none';if(/outage/.test(q))return 'reported';}
  if(id==='restartResult'||id==='cable'){if(/works|returned/.test(q))return 'works';if(/still|fail/.test(q))return id==='cable'?'checked':'failed';}
  return text;
}
// Replay eliminates dependent answers and conclusions when the user goes back.
export function backtrack(s) {
  const turns=s.turns.slice(0,-1);
  let next=createSession(s.evidence[0].text,s.scenarioId,s.sessionId);
  for(const turn of turns)next=respond(next,{value:turn.value,text:turn.text});
  return next;
}

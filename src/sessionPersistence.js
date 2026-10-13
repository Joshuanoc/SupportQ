import {createSession,respond} from './adaptiveSession.js';
const allowed={scope:['shared','device'],restart:['done','not_done'],error:['period','reversed','authorization','other','not_attempted']};
export function confirmedInterpretation(interpretation,text) {
  return (interpretation?.facts||[]).filter(f=>allowed[f.key]?.includes(f.value)&&typeof f.quote==='string'&&f.quote.trim()&&text.toLowerCase().includes(f.quote.toLowerCase()));
}
export function restoreSession(saved) {
  if(saved?.version!==1||typeof saved.sessionId!=='string'||typeof saved.evidence?.[0]?.text!=='string'||saved.evidence[0].text.length>4000||!Array.isArray(saved.turns)||saved.turns.length>100)throw new Error('Invalid saved session');
  const facts=confirmedInterpretation({facts:saved.confirmedIntakeFacts},saved.evidence[0].text);
  let rebuilt=createSession(saved.evidence[0].text,saved.scenarioId,saved.sessionId);
  rebuilt.confirmedIntakeFacts=facts;
  for(const fact of facts)rebuilt.knownFacts[fact.key]=fact.value;
  for(const turn of saved.turns)rebuilt=respond(rebuilt,{value:turn.value,text:turn.text});
  return rebuilt;
}
export async function saveSession(client,session,revision) {
  restoreSession(session);
  const {data,error}=await client.rpc('save_supportq_session',{session_id:session.sessionId,session_state:session,expected_revision:revision});
  if(error)throw new Error(error.code==='40001'?'This session changed on another device. Reload it before saving.':'Session could not be saved. Try again.');
  return data;
}
export async function listSessions(client,userId) {
  const {data,error}=await client.from('diagnostic_sessions').select('id,state,revision,updated_at').eq('user_id',userId).order('updated_at',{ascending:false}).limit(25);
  if(error)throw new Error('Saved sessions could not be loaded.');
  return data||[];
}

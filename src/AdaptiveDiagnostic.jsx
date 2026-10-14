import React,{useState,useEffect,useRef} from 'react';
import {createSession,nextAction,respond,backtrack} from './adaptiveSession.js';
import {useAuth} from './AuthContext.jsx';
import {restoreSession,saveSession,confirmedInterpretation} from './sessionPersistence.js';
import {interpretMessage} from './aiClient.js';

export default function AdaptiveDiagnostic({scenario,reportedIssue,onComplete,resumeSession,intakeFacts=[]}) {
  const {client,user,session:authSession}=useAuth();
  const storageKey=`supportq-adaptive:${user?.id||'guest'}:${scenario.id}:${reportedIssue}`;
  const [session,setSession]=useState(()=>{
    if(resumeSession)return restoreSession(resumeSession.state);
    try {
      const saved=JSON.parse(sessionStorage.getItem(storageKey));
      if(!intakeFacts.length&&saved?.version===1&&saved.scenarioId===scenario.id&&saved.evidence?.[0]?.text===reportedIssue&&Array.isArray(saved.turns)) {
        return restoreSession(saved);
      }
    }catch{}
    const fresh=createSession(reportedIssue,scenario.id,crypto.randomUUID());
    fresh.confirmedIntakeFacts=confirmedInterpretation({facts:intakeFacts},reportedIssue);
    for(const fact of fresh.confirmedIntakeFacts)fresh.knownFacts[fact.key]=fact.value;
    return fresh;
  });
  const [input,setInput]=useState(''),[error,setError]=useState('');
  const [revision,setRevision]=useState(resumeSession?.revision||0),[busy,setBusy]=useState(false),[savedMessage,setSavedMessage]=useState(''),[suggestion,setSuggestion]=useState(null);
  const node=nextAction(session),heading=useRef(null),completed=useRef(false);
  useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(session))}catch{}},[storageKey,session]);
  useEffect(()=>{heading.current?.focus()},[node.id]);
  useEffect(()=>{
    if(node.terminal&&!completed.current){completed.current=true;onComplete?.({scenario:scenario.title,category:scenario.category,reportedIssue,status:node.status==='resolved'?'Resolved':'Escalated',cause:node.why,confidence:0,evidence:session.evidence,completedAt:new Date().toLocaleString(),priority:scenario.priority,outcomeSource:'user_reported',sessionId:session.sessionId});}
    if(!node.terminal)completed.current=false;
  },[node.terminal]);
  function answer(payload){try{const updated=respond(session,payload);setSession(updated);setInput('');setSuggestion(null);setSavedMessage('');setError('')}catch(e){setError(e.message)}}
  function undo(){onComplete?.({discardSessionId:session.sessionId});setSession(s=>backtrack(s));setInput('');setSuggestion(null);setSavedMessage('');setError('')}
  async function understand(){setBusy(true);setError('');try{const parsed=await interpretMessage(authSession,input,node);if(!parsed.answerValue||parsed.needsClarification)throw new Error('That answer is ambiguous. Choose an option or add detail.');setSuggestion({value:parsed.answerValue,text:input})}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function save(){setBusy(true);setSavedMessage('');setError('');try{const nextRevision=await saveSession(client,session,revision);setRevision(nextRevision);setSavedMessage('Session saved to your account.')}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <div className="diagnosticLayout"><section className="conversation" aria-label="Adaptive troubleshooting">
    <div className="incidentBanner"><div><span>{session.domain} · ADAPTIVE DIAGNOSIS</span><h2 style={{fontSize:"1.2rem"}}>{scenario.title}</h2></div></div>
    <div className="chatLog"><div className="userMsg first"><p>{reportedIssue}</p></div>
      {session.turns.map((turn,i)=><div className="assistantMsg" key={i}><div className="avatar">SQ</div><div><p>{turn.prompt}</p><strong>{turn.text||turn.value}</strong></div></div>)}
      <div className={node.terminal?'resultCard':'questionCard'}>
        <span>{node.terminal?(node.status==='resolved'?'USER-CONFIRMED OUTCOME':'ESCALATION PLAN'):'NEXT USEFUL CHECK'}</span>
        <h3 ref={heading} tabIndex={-1}>{node.prompt}</h3><p>{node.why}</p>
        <div className="choiceStack">{node.options.map(option=><button disabled={busy} key={option.value} onClick={()=>answer({value:option.value})}>{option.label}</button>)}</div>
        {!node.terminal&&<form onSubmit={event=>{event.preventDefault();if(input.trim())answer({text:input})}}>
          <label htmlFor="adaptive-answer">Answer in your own words</label>
          <textarea id="adaptive-answer" disabled={busy} className="evidenceInput" value={input} maxLength={4000} onChange={event=>setInput(event.target.value)} />
          <button className="primary submitEvidence" disabled={busy||!input.trim()} type="submit">Continue</button>
          {user&&<button type="button" disabled={busy||!input.trim()} onClick={understand}>Understand answer with AI</button>}
        </form>}
        {suggestion&&<div role="status"><p>Did you mean: {node.options.find(o=>o.value===suggestion.value)?.label}?</p><button disabled={busy} onClick={()=>answer(suggestion)}>Confirm interpretation</button><button onClick={()=>setSuggestion(null)}>Dismiss</button></div>}
        {error&&<p role="alert">{error}</p>}
        {session.turns.length>0&&<button disabled={busy} className="textLink" onClick={undo}>Change previous answer</button>}
      </div>
    </div></section><aside className="diagnosticSide"><div className="sidePanel"><span>SESSION EVIDENCE</span>
      <p role="status">{node.terminal?node.status==='resolved'?'Resolved by user confirmation':'Escalation needed':'In progress'} · {session.completedChecks.length} checks recorded</p>
      <dl>{Object.entries(session.entities).map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <p>Unavailable checks: {session.unavailableChecks.length}</p>
      <p>Your answers stay in this tab until you save them to your account. SupportQ cannot perform SAP transactions or verify system changes.</p>
      {user&&<button disabled={busy} onClick={save}>Save session</button>}{savedMessage&&<p role="status">{savedMessage}</p>}
    </div></aside></div>;
}

import React,{useState,useEffect,useRef} from 'react';
import {createSession,nextAction,respond,backtrack} from './adaptiveSession.js';

export default function AdaptiveDiagnostic({scenario,reportedIssue,onComplete}) {
  const storageKey=`supportq-adaptive:${scenario.id}:${reportedIssue}`;
  const [session,setSession]=useState(()=>{
    try {
      const saved=JSON.parse(sessionStorage.getItem(storageKey));
      if(saved?.version===1&&saved.scenarioId===scenario.id&&saved.evidence?.[0]?.text===reportedIssue&&Array.isArray(saved.turns)) {
        let rebuilt=createSession(reportedIssue,scenario.id,saved.sessionId);
        for(const turn of saved.turns)rebuilt=respond(rebuilt,{value:turn.value,text:turn.text});
        return rebuilt;
      }
    }catch{}
    return createSession(reportedIssue,scenario.id,crypto.randomUUID());
  });
  const [input,setInput]=useState(''),[error,setError]=useState('');
  const node=nextAction(session),heading=useRef(null),completed=useRef(false);
  useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(session))}catch{}},[storageKey,session]);
  useEffect(()=>{heading.current?.focus()},[node.id]);
  useEffect(()=>{
    if(node.terminal&&!completed.current){completed.current=true;onComplete?.({scenario:scenario.title,category:scenario.category,reportedIssue,status:node.status==='resolved'?'Resolved':'Escalated',cause:node.why,confidence:0,evidence:session.evidence,completedAt:new Date().toLocaleString(),priority:scenario.priority,outcomeSource:'user_reported',sessionId:session.sessionId});}
    if(!node.terminal)completed.current=false;
  },[node.terminal]);
  function answer(payload){try{setSession(s=>respond(s,payload));setInput('');setError('')}catch(e){setError(e.message)}}
  function undo(){onComplete?.({discardSessionId:session.sessionId});setSession(s=>backtrack(s));setInput('');setError('')}
  return <div className="diagnosticLayout"><section className="conversation" aria-label="Adaptive troubleshooting">
    <div className="incidentBanner"><div><span>{session.domain} · ADAPTIVE DIAGNOSIS</span><h2 style={{fontSize:"1.2rem"}}>{scenario.title}</h2></div></div>
    <div className="chatLog"><div className="userMsg first"><p>{reportedIssue}</p></div>
      {session.turns.map((turn,i)=><div className="assistantMsg" key={i}><div className="avatar">SQ</div><div><p>{turn.prompt}</p><strong>{turn.text||turn.value}</strong></div></div>)}
      <div className={node.terminal?'resultCard':'questionCard'}>
        <span>{node.terminal?(node.status==='resolved'?'USER-CONFIRMED OUTCOME':'ESCALATION PLAN'):'NEXT USEFUL CHECK'}</span>
        <h3 ref={heading} tabIndex={-1}>{node.prompt}</h3><p>{node.why}</p>
        <div className="choiceStack">{node.options.map(option=><button key={option.value} onClick={()=>answer({value:option.value})}>{option.label}</button>)}</div>
        {!node.terminal&&<form onSubmit={event=>{event.preventDefault();if(input.trim())answer({text:input})}}>
          <label htmlFor="adaptive-answer">Answer in your own words</label>
          <textarea id="adaptive-answer" className="evidenceInput" value={input} maxLength={4000} onChange={event=>setInput(event.target.value)} />
          <button className="primary submitEvidence" disabled={!input.trim()} type="submit">Continue</button>
        </form>}
        {error&&<p role="alert">{error}</p>}
        {session.turns.length>0&&<button className="textLink" onClick={undo}>Change previous answer</button>}
      </div>
    </div></section><aside className="diagnosticSide"><div className="sidePanel"><span>SESSION EVIDENCE</span>
      <p role="status">{node.terminal?node.status==='resolved'?'Resolved by user confirmation':'Escalation needed':'In progress'} · {session.completedChecks.length} checks recorded</p>
      <dl>{Object.entries(session.entities).map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <p>Unavailable checks: {session.unavailableChecks.length}</p>
      <p>Your answers are kept in this browser tab for this session. SupportQ cannot perform SAP transactions or verify system changes.</p>
    </div></aside></div>;
}

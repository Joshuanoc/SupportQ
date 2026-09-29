import React,{useMemo,useState,useEffect}from'react';
import{motion,AnimatePresence,useReducedMotion}from'framer-motion';
import{ArrowUpRight,Check,ChevronRight,Mail,Code2,Cloud,TestTube2,Wrench,Database,Network,Menu,X}from'lucide-react';
import{scenarios,categoryCounts}from'./data.js';
import{getActionGuide}from'./guidance.js';

const icons={Wifi:Network,Shield:TestTube2,KeyRound:Wrench,Mail,MonitorCog:Code2,Printer:Wrench,TriangleAlert:TestTube2,CloudOff:Cloud,AppWindow:Code2,VideoOff:Code2,CloudCog:Cloud,HardDrive:Database};
const pct=n=>`${Math.max(0,Math.min(100,Math.round(n)))}%`;
const now=()=>new Date().toLocaleString();

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

function inferContext(text){
 const q=text.toLowerCase();
 const ctx={device:'',os:'',environment:'',onset:'',previous:'',scope:'',recentChanges:'',impact:''};
 if(/macbook|mac\b/.test(q)){ctx.device='Laptop';ctx.os='macOS'}
 else if(/iphone/.test(q)){ctx.device='Phone';ctx.os='iOS / iPadOS'}
 else if(/ipad/.test(q)){ctx.device='Tablet';ctx.os='iOS / iPadOS'}
 else if(/android/.test(q)){ctx.device='Phone';ctx.os='Android'}
 else if(/windows 11|win11/.test(q)){ctx.device='Laptop';ctx.os='Windows 11'}
 else if(/windows 10|win10/.test(q)){ctx.device='Laptop';ctx.os='Windows 10'}
 else if(/linux|ubuntu|fedora/.test(q)){ctx.device='Laptop';ctx.os='Linux'}
 if(/vpn|remote/.test(q))ctx.environment='Remote / VPN';
 else if(/office|workplace|onsite/.test(q))ctx.environment='Office';
 else if(/home|wifi at home|home wifi/.test(q))ctx.environment='Home';
 if(/just now|suddenly|few minutes/.test(q))ctx.onset='Just now';
 else if(/today|this morning|this afternoon/.test(q))ctx.onset='Today';
 else if(/yesterday|few days|last few days/.test(q))ctx.onset='Last few days';
 else if(/after.*update|after.*restart|after.*change|since.*update/.test(q))ctx.onset='After a restart/update/change';
 if(/happened before|again|keeps happening|recurring|sometimes/.test(q))ctx.previous='Yes, occasionally';
 if(/only me|just me|my device/.test(q))ctx.scope='Only me / one device';
 else if(/everyone|whole office|site-wide|all users/.test(q))ctx.scope='Everyone / site-wide';
 else if(/team|department/.test(q))ctx.scope='Whole team / department';
 else if(/several|multiple users|others too/.test(q))ctx.scope='Several users';
 if(/can't work|cannot work|blocked|urgent|critical/.test(q))ctx.impact='Work is blocked';
 return ctx;
}

function classifyIssue(text){
 const q=text.toLowerCase().trim();
 const ranked=scenarios.map(s=>{
  let score=0;
  const words=keywordMap[s.id]||[];
  words.forEach(k=>{if(q.includes(k))score+=k.includes(' ')?4:2});
  if(q.includes(s.category.toLowerCase()))score+=2;
  s.symptoms.forEach(x=>{if(q.includes(x.toLowerCase()))score+=3});
  return{s,score};
 }).sort((a,b)=>b.score-a.score);
 return ranked.filter(x=>x.score>0);
}

function App(){
 const reduceMotion=useReducedMotion();
 const[view,setView]=useState('dashboard');
 const[scenario,setScenario]=useState(null);
 const[step,setStep]=useState(0);
 const[hypotheses,setHypotheses]=useState([]);
 const[answers,setAnswers]=useState([]);
 const[result,setResult]=useState(null);
 const[phase,setPhase]=useState('diagnose');
 const[actionIndex,setActionIndex]=useState(0);
 const[actionLog,setActionLog]=useState([]);
 const[supportContext,setSupportContext]=useState({device:'',os:'',environment:'',onset:'',previous:'',scope:'',recentChanges:'',impact:''});
 const[reportedIssue,setReportedIssue]=useState('');
 const[intake,setIntake]=useState('');
 const[suggestions,setSuggestions]=useState([]);
 const[history,setHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem('supportq-history')||'[]')}catch{return[]}});
 const[query,setQuery]=useState('');
 const[mobile,setMobile]=useState(false);

 useEffect(()=>localStorage.setItem('supportq-history',JSON.stringify(history.slice(0,25))),[history]);

 const filtered=useMemo(()=>scenarios.filter(s=>`${s.title} ${s.category}`.toLowerCase().includes(query.toLowerCase())),[query]);

 const start=(s,issue='')=>{
   setScenario(s);setStep(0);setAnswers([]);setResult(null);setActionIndex(0);setActionLog([]);const inferred=inferContext(issue||s.title);const hasEnough=Boolean(inferred.os&&inferred.environment&&inferred.scope);setSupportContext(inferred);setPhase(s.severity==='Critical'||hasEnough?'diagnose':'triage');
   setReportedIssue(issue||s.title);
   setHypotheses(s.hypotheses.map(([name,score])=>({name,score})).sort((a,b)=>b.score-a.score));
   setSuggestions([]);setView('diagnose');setMobile(false);
 };

 const submitIntake=()=>{
   const text=intake.trim(); if(!text)return;
   const inferred=inferContext(text);setSupportContext(x=>({...x,...Object.fromEntries(Object.entries(inferred).filter(([,v])=>v))}));
   const matches=classifyIssue(text);
   if(matches.length===0){setSuggestions(scenarios.slice(0,4));return;}
   if(matches.length===1||matches[0].score>=matches[1].score+3){start(matches[0].s,text);return;}
   setSuggestions(matches.slice(0,3).map(x=>x.s));
 };

 const beginDiagnosis=()=>{if(!supportContext.os||!supportContext.environment||!supportContext.scope)return;setPhase('diagnose');};

 const updateScores=(boost={})=>setHypotheses(h=>h.map(x=>({...x,score:Math.max(0,Math.min(100,x.score+(boost[x.name]||0)))})).sort((a,b)=>b.score-a.score));

 const finalize=(base,status,extra={})=>{
   const incident={id:Date.now(),...base,status,completedAt:now(),reportedIssue,supportContext,answers,actionLog,...extra};
   setHistory(h=>[incident,...h].slice(0,25));
   return incident;
 };

 const answer=(choice)=>{
   if(!scenario||phase!=='diagnose')return;
   const node=scenario.steps[step],path=node[choice];
   const nextAnswers=[...answers,{question:node.q,answer:choice==='yes'?'Yes':'No'}];
   setAnswers(nextAnswers);
   if(path.boost)updateScores(path.boost);
   if(path.result){
     const r={...path,scenario:scenario.title,category:scenario.category,severity:scenario.severity,priority:scenario.priority,answers:nextAnswers};
     setResult(r);setActionIndex(0);
     if(path.escalate){setPhase('escalated');finalize(r,'Escalated',{answers:nextAnswers});}
     else setPhase('resolve');
   }else setStep(path.next);
 };

 const resolutionResponse=(resolved)=>{
   if(!result||phase!=='resolve')return;
   const action=result.actions[actionIndex];
   const nextLog=[...actionLog,{action,outcome:resolved?'Resolved issue':'Did not resolve'}];
   setActionLog(nextLog);
   if(resolved){
     setPhase('resolved');
     const incident={id:Date.now(),...result,status:'Resolved',completedAt:now(),reportedIssue,supportContext,answers,actionLog:nextLog};
     setHistory(h=>[incident,...h].slice(0,25));
     return;
   }
   if(actionIndex<result.actions.length-1)setActionIndex(i=>i+1);
   else{
     setPhase('escalated');
     const incident={id:Date.now(),...result,status:'Escalated',escalate:true,completedAt:now(),reportedIssue,supportContext,answers,actionLog:nextLog};
     setHistory(h=>[incident,...h].slice(0,25));
   }
 };

 const reset=()=>scenario&&start(scenario,reportedIssue);

 const copyTicket=async()=>{
   if(!result)return;
   const status=phase==='resolved'?'Resolved':phase==='escalated'?'Escalated':'In progress';
   const txt=`INCIDENT
Reported issue: ${reportedIssue}
Device: ${supportContext.device}
OS: ${supportContext.os}
Environment: ${supportContext.environment}
Started: ${supportContext.onset}
Happened before: ${supportContext.previous}
Scope: ${supportContext.scope}
Recent changes: ${supportContext.recentChanges||'None reported'}
Business impact: ${supportContext.impact||'Not specified'}
Category: ${result.category}
Priority: ${result.priority}
Severity: ${result.severity}
Status: ${status}
Likely root cause: ${result.cause}
Confidence: ${result.confidence}%
Diagnostic evidence:
${answers.map(a=>`- ${a.question} → ${a.answer}`).join('\n')}
Actions attempted:
${actionLog.length?actionLog.map(a=>`- ${a.action} → ${a.outcome}`).join('\n'):'- None yet'}
Next action / resolution:
${result.actions.map(a=>`- ${a}`).join('\n')}`;
   try{await navigator.clipboard.writeText(txt)}catch{}
 };

 const topCause=hypotheses[0];

 return <div className="appShell">
   <aside className={mobile?'sidebar open':'sidebar'}>
    <div className="brand"><div className="brandMark"><TestTube2 size={22}/></div><div><strong>SupportQ</strong><span>IT Support Intelligence</span></div></div>
    <nav>
      <button className={view==='dashboard'?'active':''} onClick={()=>{setView('dashboard');setMobile(false)}}><Code2/>Dashboard</button>
      <button className={view==='scenarios'?'active':''} onClick={()=>{setView('scenarios');setMobile(false)}}><Network/>Scenario Library</button>
      <button className={view==='history'?'active':''} onClick={()=>{setView('history');setMobile(false)}}><Database/>Incident History</button>
      <button className={view==='analytics'?'active':''} onClick={()=>{setView('analytics');setMobile(false)}}><Database/>Analytics</button>
    </nav>
    <div className="sideNote"><TestTube2 size={17}/><div><b>Resolve, don’t just advise</b><span>Diagnose → action → verify → continue or escalate.</span></div></div>
   </aside>
   <div className="mainArea">
    <header className="topbar"><button className="mobileToggle" onClick={()=>setMobile(v=>!v)} aria-label="Toggle navigation">{mobile?<X/>:<Menu/>}</button><div><span className="crumb">SUPPORTQ / {view.toUpperCase()}</span><h1>{view==='diagnose'&&scenario?scenario.title:view==='scenarios'?'Scenario Library':view==='history'?'Incident History':view==='analytics'?'Support Analytics':'IT Support Command Center'}</h1></div><div className="status"><i/>Diagnostic engine ready</div></header>
    <main className="content">
      {view==='dashboard'&&<Dashboard intake={intake} setIntake={setIntake} submitIntake={submitIntake} suggestions={suggestions} onStart={start} setView={setView}/>}
      {view==='scenarios'&&<ScenarioLibrary query={query} setQuery={setQuery} filtered={filtered} onStart={start}/>}
      {view==='diagnose'&&scenario&&<Diagnostic scenario={scenario} step={step} answers={answers} result={result} phase={phase} actionIndex={actionIndex} actionLog={actionLog} hypotheses={hypotheses} topCause={topCause} answer={answer} resolutionResponse={resolutionResponse} reset={reset} copyTicket={copyTicket} reduceMotion={reduceMotion} reportedIssue={reportedIssue} supportContext={supportContext} setSupportContext={setSupportContext} beginDiagnosis={beginDiagnosis}/>}
      {view==='history'&&<HistoryView history={history} onStart={s=>start(scenarios.find(x=>x.title===s.scenario)||scenarios[0],s.reportedIssue)}/>}
      {view==='analytics'&&<Analytics history={history}/>}
    </main>
   </div>
 </div>
}

function Dashboard({intake,setIntake,submitIntake,suggestions,onStart,setView}){return <>
 <section className="heroPanel"><div><span className="eyebrow">INTERACTIVE IT SUPPORT</span><h2>Tell me the problem.<br/>We’ll troubleshoot it.</h2><p>SupportQ uses fast triage: it infers obvious context from what you type, skips redundant questions, asks only what changes the next decision, applies the safest high-value fix first, and keeps going until the issue is resolved or needs escalation.</p>
 <div className="intakeBox"><label htmlFor="issue">What is happening?</label><div><textarea id="issue" value={intake} onChange={e=>setIntake(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')submitIntake()}} placeholder="Example: My laptop says Wi-Fi is connected but no websites will load."/><button className="primary" onClick={submitIntake}>Start diagnosis <ArrowUpRight/></button></div><small>Describe the symptom in your own words. Ctrl/Cmd + Enter also starts.</small></div>
 {suggestions.length>0&&<div className="matchBox"><span>I need one more clue. Which issue is closest?</span><div>{suggestions.map(s=><button key={s.id} onClick={()=>onStart(s,intake)}>{s.title}<ChevronRight/></button>)}</div></div>}
 </div><div className="signalCard"><div className="signalHead"><Network/><span>Resolution workflow</span><b>READY</b></div><div className="signalGrid"><div><strong>{scenarios.length}</strong><span>Scenarios</span></div><div><strong>{Object.keys(categoryCounts).length}</strong><span>Domains</span></div><div><strong>P1–P4</strong><span>Priority</span></div><div><strong>VERIFY</strong><span>Every fix</span></div></div><div className="pulseRow"><i/><span>Symptom → Diagnose → Fix → Retest → Resolve</span></div></div></section>
 <section><div className="sectionTitle"><div><span>QUICK START</span><h3>Common support incidents</h3></div><button onClick={()=>setView('scenarios')}>View all <ChevronRight/></button></div><div className="scenarioGrid">{scenarios.slice(0,6).map(s=><ScenarioCard key={s.id} s={s} onStart={onStart}/>)}</div></section>
 </>}

function ScenarioCard({s,onStart}){const Icon=icons[s.icon]||Network;return <button className="scenarioCard" onClick={()=>onStart(s,s.title)}><div className="scenarioIcon"><Icon/></div><div className="scenarioMeta"><span>{s.category}</span><b className={`sev ${s.severity.toLowerCase()}`}>{s.severity}</b></div><h4>{s.title}</h4><p>{s.symptoms.join(' · ')}</p><div className="cardFoot"><span>{s.priority}</span><span>Diagnose <ChevronRight/></span></div></button>}

function ScenarioLibrary({query,setQuery,filtered,onStart}){return <><div className="libraryHead"><div className="search"><Code2/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Wi-Fi, VPN, Outlook, Azure..."/></div><span>{filtered.length} scenarios</span></div><div className="scenarioGrid">{filtered.map(s=><ScenarioCard key={s.id} s={s} onStart={onStart}/>)}</div></>}

function Diagnostic({scenario,step,answers,result,phase,actionIndex,actionLog,hypotheses,topCause,answer,resolutionResponse,reset,copyTicket,reduceMotion,reportedIssue,supportContext,setSupportContext,beginDiagnosis}){
 const actionGuide=result&&phase==='resolve'?getActionGuide(result.actions[actionIndex],supportContext.os,scenario.id):null;
 const node=scenario.steps[step];
 const progress=phase==='resolved'||phase==='escalated'?100:phase==='resolve'?80:phase==='triage'?15:Math.min(70,Math.round(((step+1)/scenario.steps.length)*65));
 return <div className="diagnosticLayout"><section className="conversation"><div className="incidentBanner"><div><span>{scenario.category}</span><h3>{scenario.title}</h3></div><div><b className={`sev ${scenario.severity.toLowerCase()}`}>{scenario.severity}</b><b className="priority">{scenario.priority}</b></div></div><div className="progress"><i style={{width:`${progress}%`}}/></div>
 <div className="chatLog"><div className="userMsg first"><p>{reportedIssue}</p></div><div className="assistantMsg"><div className="avatar">SQ</div><div><span>SupportQ</span><p>I’ll diagnose this systematically. I’ll ask one useful question at a time, then we’ll apply and verify corrective actions until it works or the evidence says it needs escalation.</p></div></div>
 {answers.map((a,i)=><React.Fragment key={i}><div className="assistantMsg"><div className="avatar">SQ</div><div><span>Diagnostic question</span><p>{a.question}</p></div></div><div className="userMsg"><p>{a.answer}</p></div></React.Fragment>)}
 <AnimatePresence mode="wait">
 {phase==='triage'&&<motion.div className="triageCard" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}}><span>BEFORE WE TROUBLESHOOT</span><h3>Let me understand your setup first.</h3><p>I already filled in anything I could infer from your description. Just confirm the missing details so we can move quickly.</p><div className="triageGrid"><label>Device<select value={supportContext.device} onChange={e=>setSupportContext(x=>({...x,device:e.target.value}))}><option value="">Select if known</option><option>Laptop</option><option>Desktop</option><option>Phone</option><option>Tablet</option><option>Thin client</option><option>Other</option></select></label><label>Operating system<select value={supportContext.os} onChange={e=>setSupportContext(x=>({...x,os:e.target.value}))}><option value="">Select</option><option>Windows 11</option><option>Windows 10</option><option>macOS</option><option>Linux</option><option>iOS / iPadOS</option><option>Android</option><option>Other / Unknown</option></select></label><label>Environment<select value={supportContext.environment} onChange={e=>setSupportContext(x=>({...x,environment:e.target.value}))}><option value="">Select</option><option>Office</option><option>Home</option><option>Remote / VPN</option><option>Hybrid</option><option>Public / Guest network</option><option>Cloud-only</option></select></label><label>When did it start?<select value={supportContext.onset} onChange={e=>setSupportContext(x=>({...x,onset:e.target.value}))}><option value="">Not sure / not important yet</option><option>Just now</option><option>Today</option><option>Last few days</option><option>More than a week ago</option><option>After a restart/update/change</option></select></label><label>Has this happened before?<select value={supportContext.previous} onChange={e=>setSupportContext(x=>({...x,previous:e.target.value}))}><option value="">Not sure</option><option>No, first time</option><option>Yes, occasionally</option><option>Yes, frequently</option><option>Yes, same issue was fixed before</option></select></label><label>Who is affected?<select value={supportContext.scope} onChange={e=>setSupportContext(x=>({...x,scope:e.target.value}))}><option value="">Select</option><option>Only me / one device</option><option>Several users</option><option>Whole team / department</option><option>Everyone / site-wide</option><option>Not sure</option></select></label></div><label className="wideField">Any recent change before the issue?<input value={supportContext.recentChanges} onChange={e=>setSupportContext(x=>({...x,recentChanges:e.target.value}))} placeholder="Example: Windows update, password change, new VPN, moved desks, installed software..."/></label><label className="wideField">How is this affecting your work?<input value={supportContext.impact} onChange={e=>setSupportContext(x=>({...x,impact:e.target.value}))} placeholder="Example: I cannot work, workaround available, only one app affected..."/></label><button className="primary startDiag" disabled={!supportContext.os||!supportContext.environment||!supportContext.scope} onClick={beginDiagnosis}>Continue to diagnosis <ArrowUpRight/></button></motion.div>}
 {phase==='diagnose'&&<motion.div key={step} className="questionCard" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}><span>NEXT BEST TEST</span><h4>{node.q}</h4><p>{node.help}</p><div><button onClick={()=>answer('yes')}><Check/>Yes</button><button onClick={()=>answer('no')}><X/>No</button></div></motion.div>}
 {phase==='resolve'&&result&&actionGuide&&<motion.div key={actionIndex} className="resolutionCard" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}}><span>CORRECTIVE ACTION {actionIndex+1} OF {result.actions.length}</span><h3>{actionGuide.title}</h3><p><b>Why:</b> {actionGuide.why}</p><div className="howTo"><b>How to do it on {supportContext.os||'your device'}</b><ol>{actionGuide.steps.map((s,i)=><li key={i}><code>{s}</code></li>)}</ol></div><div className="expected"><b>Expected result</b><p>{actionGuide.expected}</p></div>{actionGuide.warning&&<div className="warningBox"><TestTube2/><div><b>Important</b><span>{actionGuide.warning}</span></div></div>}<p className="retest">Now retest the original problem: <b>{reportedIssue}</b></p><div className="verifyButtons"><button className="resolvedBtn" onClick={()=>resolutionResponse(true)}><Check/>It works now</button><button className="secondary" onClick={()=>resolutionResponse(false)}><X/>Still not working</button></div>{actionLog.length>0&&<div className="attempts"><b>Previous attempts</b>{actionLog.map((a,i)=><span key={i}>✕ {a.action}</span>)}</div>}</motion.div>}
 {(phase==='resolved'||phase==='escalated')&&result&&<motion.div className={phase==='resolved'?'resultCard resolved':'resultCard escalated'} initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="resultIcon">{phase==='resolved'?<Check/>:<TestTube2/>}</div><span>{phase==='resolved'?'INCIDENT RESOLVED':'ESCALATION REQUIRED'}</span><h3>{phase==='resolved'?'Issue verified as resolved':result.result}</h3><p>{phase==='resolved'?`Likely root cause: ${result.cause}`:`${result.cause}. The collected evidence and attempted fixes should be attached to the escalation.`}</p><div className="confidence"><div><span>RCA confidence</span><b>{result.confidence}%</b></div><i><em style={{width:`${result.confidence}%`}}/></i></div><h5>{phase==='resolved'?'Actions attempted':'Recommended escalation / next actions'}</h5><ol>{(phase==='resolved'?actionLog.map(x=>x.action):result.actions).map(a=><li key={a}>{a}</li>)}</ol><div className="resultActions"><button className="primary" onClick={copyTicket}><Code2/>Copy incident</button><button className="secondary" onClick={reset}><ArrowUpRight/>Diagnose again</button></div></motion.div>}
 </AnimatePresence></div></section>
 <aside className="diagnosticSide"><div className="sidePanel"><span>INCIDENT STATE</span><dl><div><dt>Category</dt><dd>{scenario.category}</dd></div><div><dt>Severity</dt><dd>{scenario.severity}</dd></div><div><dt>Priority</dt><dd>{scenario.priority}</dd></div><div><dt>Status</dt><dd>{phase==='triage'?'Gathering context':phase==='diagnose'?'Diagnosing':phase==='resolve'?'Applying fix':phase==='resolved'?'Resolved':'Escalated'}</dd></div><div><dt>Device / OS</dt><dd>{supportContext.device||'—'}{supportContext.os?` · ${supportContext.os}`:''}</dd></div><div><dt>Environment</dt><dd>{supportContext.environment||'—'}</dd></div><div><dt>Scope</dt><dd>{supportContext.scope||'—'}</dd></div><div><dt>Checks</dt><dd>{answers.length}</dd></div><div><dt>Fix attempts</dt><dd>{actionLog.length}</dd></div></dl></div><div className="sidePanel"><span>LIKELY CAUSES</span><div className="hypotheses">{hypotheses.map((h,i)=><div key={h.name}><div><span>{h.name}</span><b>{pct(h.score)}</b></div><i><em style={{width:pct(h.score)}}/></i>{i===0&&phase==='diagnose'&&<small>Current lead</small>}</div>)}</div></div>{topCause&&phase==='diagnose'&&<div className="reasonPanel"><TestTube2/><div><b>Decision logic</b><p>Each answer changes the hypothesis ranking. The next question is chosen to separate the most likely causes.</p></div></div>}</aside></div>
}

function HistoryView({history,onStart}){if(!history.length)return <div className="empty"><Database/><h3>No completed incidents yet</h3><p>An incident is saved only after it is resolved or escalated.</p></div>;return <div className="historyList">{history.map(h=><article key={h.id}><div><span>{h.category} · {h.status}</span><h3>{h.scenario}</h3><p>{h.reportedIssue||h.cause}</p></div><div className="historyMeta"><b>{h.priority}</b><span>{h.confidence}% RCA confidence</span><span>{h.completedAt}</span><button onClick={()=>onStart(h)}>Re-run</button></div></article>)}</div>}

function Analytics({history}){const total=history.length,resolved=history.filter(x=>x.status==='Resolved').length,escalated=history.filter(x=>x.status==='Escalated').length,avg=total?Math.round(history.reduce((a,x)=>a+x.confidence,0)/total):0;const cats=history.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{});const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);return <><div className="metricGrid"><Metric title="Incidents completed" value={total}/><Metric title="Resolved" value={resolved}/><Metric title="Escalated" value={escalated}/><Metric title="Avg. RCA confidence" value={`${avg}%`}/></div><section className="analyticsPanel"><div><span className="eyebrow">ROOT CAUSE TRENDS</span><h3>Incident categories</h3></div>{sorted.length?sorted.map(([k,v])=><div className="barRow" key={k}><span>{k}</span><i><em style={{width:`${(v/Math.max(...sorted.map(x=>x[1])))*100}%`}}/></i><b>{v}</b></div>):<p className="muted">Resolve or escalate incidents to populate analytics.</p>}</section></>}
const Metric=({title,value})=><div className="metric"><span>{title}</span><strong>{value}</strong></div>;
export default App;
import React,{useMemo,useState,useEffect}from'react';
import{motion,AnimatePresence,useReducedMotion}from'framer-motion';
import{ArrowUpRight,Check,ChevronRight,Mail,Code2,Cloud,TestTube2,Wrench,Database,Network,Menu,X,Search,LifeBuoy,LayoutDashboard,Clock3,BarChart3}from'lucide-react';
import{scenarios,categoryCounts}from'./data.js';
import{classifyIssue}from'./classifyIssue.js';
import{diagnosticPath,resolutionProgress}from'./diagnosticTransitions.js';
import{getActionGuide}from'./guidance.js';
import{getNode,initialHypotheses,applyBoosts,parseDiagnosticText,calculatePriority}from'./diagnosticEngine.js';
import{profileFor,profileHypotheses,interpretGeneric}from'./scenarioEngines.js';
import{copySanitizedIncident}from'./incidentExport.js';

const icons={Wifi:Network,Shield:TestTube2,KeyRound:Wrench,Mail,MonitorCog:Code2,Printer:Wrench,TriangleAlert:TestTube2,CloudOff:Cloud,AppWindow:Code2,VideoOff:Code2,CloudCog:Cloud,HardDrive:Database};
const pct=n=>`${Math.max(0,Math.min(100,Math.round(n)))}%`;
const now=()=>new Date().toLocaleString();

// Small transform-only feedback; no continuous loops or additional dependencies.
function FeedbackButton({children,disabled,className='',...props}){
 const reduceMotion=useReducedMotion();
 const stationary=reduceMotion||disabled||className==='navBackdrop';
 return <motion.button {...props} className={className} disabled={disabled} whileHover={stationary?undefined:{y:-1}} whileTap={stationary?undefined:{scale:.97}} transition={{duration:reduceMotion?0:.12}}>{children}</motion.button>;
}

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
 const[copyStatus,setCopyStatus]=useState('');

 useEffect(()=>{
   if(!mobile)return;
   const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;
   const drawer=document.getElementById('primary-navigation');
   const buttons=()=>Array.from(drawer.querySelectorAll('button'));
   document.body.style.overflow='hidden';buttons()[0]?.focus();
   const close=e=>{
     if(e.key==='Escape')setMobile(false);
     if(e.key==='Tab'){const items=buttons(),first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
   };
   const resize=()=>{if(window.innerWidth>780)setMobile(false)};
   window.addEventListener('keydown',close);window.addEventListener('resize',resize);
   return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',close);window.removeEventListener('resize',resize);previousFocus?.focus()};
 },[mobile]);

 useEffect(()=>localStorage.setItem('supportq-history',JSON.stringify(history.slice(0,25))),[history]);

 const filtered=useMemo(()=>scenarios.filter(s=>`${s.title} ${s.category} ${s.symptoms.join(' ')}`.toLowerCase().includes(query.toLowerCase())),[query]);

 const start=(s,issue='')=>{
   setScenario(s);setStep(0);setAnswers([]);setResult(null);setActionIndex(0);setActionLog([]);const inferred=inferContext(issue||s.title);const hasEnough=Boolean(s.category.startsWith('SAP') || (inferred.os&&inferred.environment&&inferred.scope));setSupportContext(inferred);setPhase(s.severity==='Critical'||hasEnough?'diagnose':'triage');
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

 const beginDiagnosis=()=>{if(!scenario?.category.startsWith('SAP')&&(!supportContext.os||!supportContext.environment||!supportContext.scope))return;setPhase('diagnose');};

 const updateScores=(boost={})=>setHypotheses(h=>h.map(x=>({...x,score:Math.max(0,Math.min(100,x.score+(boost[x.name]||0)))})).sort((a,b)=>b.score-a.score));

 const finalize=(base,status,extra={})=>{
   const incident={id:Date.now(),...base,status,completedAt:now(),reportedIssue,supportContext,answers,actionLog,...extra};
   setHistory(h=>[incident,...h].slice(0,25));
   return incident;
 };

 const answer=(choice)=>{
   if(!scenario||phase!=='diagnose')return;
   const node=scenario.steps[step],path=diagnosticPath(scenario,step,choice);
   const nextAnswers=[...answers,{question:node.q,answer:choice==='unknown'?'Not sure':choice==='yes'?'Yes':'No'}];
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
   const progress=resolutionProgress(resolved,actionIndex,result.actions.length);
   if(progress.phase==='resolved'){
     setPhase('resolved');
     const incident={id:Date.now(),...result,status:'Resolved',completedAt:now(),reportedIssue,supportContext,answers,actionLog:nextLog};
     setHistory(h=>[incident,...h].slice(0,25));
     return;
   }
   if(progress.phase==='resolve')setActionIndex(progress.actionIndex);
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
   const copied=await copySanitizedIncident(txt);setCopyStatus(copied.message);
 };

 const topCause=hypotheses[0];

 return <div className="appShell">
   <a className="skipLink" href="#main-content">Skip to content</a>
   {mobile&&<FeedbackButton className="navBackdrop" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
   <aside id="primary-navigation" role={mobile?"dialog":undefined} aria-modal={mobile?true:undefined} aria-label="Workspace navigation" className={mobile?'sidebar open':'sidebar'}>
    <div className="brand"><div className="brandMark"><LifeBuoy size={22}/></div><div><strong>SupportQ</strong><span>Your troubleshooting workspace</span></div></div>
    <nav aria-label="Main navigation">
      <FeedbackButton aria-current={view==='dashboard'?'page':undefined} className={view==='dashboard'?'active':''} onClick={()=>{setView('dashboard');setMobile(false)}}>{view==='dashboard'&&<motion.span className="navSelection" layoutId="navigation-selection" transition={{duration:reduceMotion?0:.18}} aria-hidden="true"/>}<LayoutDashboard/>Overview</FeedbackButton>
      <FeedbackButton aria-current={view==='scenarios'?'page':undefined} className={view==='scenarios'?'active':''} onClick={()=>{setView('scenarios');setMobile(false)}}>{view==='scenarios'&&<motion.span className="navSelection" layoutId="navigation-selection" transition={{duration:reduceMotion?0:.18}} aria-hidden="true"/>}<Network/>Scenario Library</FeedbackButton>
      <FeedbackButton aria-current={view==='history'?'page':undefined} className={view==='history'?'active':''} onClick={()=>{setView('history');setMobile(false)}}>{view==='history'&&<motion.span className="navSelection" layoutId="navigation-selection" transition={{duration:reduceMotion?0:.18}} aria-hidden="true"/>}<Clock3/>Incident history</FeedbackButton>
      <FeedbackButton aria-current={view==='analytics'?'page':undefined} className={view==='analytics'?'active':''} onClick={()=>{setView('analytics');setMobile(false)}}>{view==='analytics'&&<motion.span className="navSelection" layoutId="navigation-selection" transition={{duration:reduceMotion?0:.18}} aria-hidden="true"/>}<BarChart3/>Analytics</FeedbackButton>
    </nav>
    <div className="sideNote"><TestTube2 size={17}/><div><b>Resolve, don’t just advise</b><span>Diagnose → action → verify → continue or escalate.</span></div></div>
   </aside>
   <div className="mainArea">
    <header className="topbar"><FeedbackButton className="mobileToggle" onClick={()=>setMobile(v=>!v)} aria-label={mobile?"Close navigation":"Open navigation"} aria-expanded={mobile} aria-controls="primary-navigation">{mobile?<X/>:<Menu/>}</FeedbackButton><div><span className="crumb">SUPPORTQ / {view.toUpperCase()}</span><h1>{view==='diagnose'&&scenario?scenario.title:view==='scenarios'?'Scenario Library':view==='history'?'Incident History':view==='analytics'?'Support Analytics':'Support workspace'}</h1></div><div className="status"><i/>Workspace ready</div></header>
    <main id="main-content" className="content" tabIndex={-1}>
     <AnimatePresence mode="wait" initial={false}><motion.div key={view} initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={reduceMotion?{opacity:1}:{opacity:0,y:-6}} transition={{duration:reduceMotion?0:.2}}>
      {view==='dashboard'&&<Dashboard intake={intake} setIntake={setIntake} submitIntake={submitIntake} suggestions={suggestions} onStart={start} setView={setView}/>}
      {view==='scenarios'&&<ScenarioLibrary query={query} setQuery={setQuery} filtered={filtered} onStart={start}/>}
      {view==='diagnose'&&scenario&&<Diagnostic scenario={scenario} step={step} answers={answers} result={result} phase={phase} actionIndex={actionIndex} actionLog={actionLog} hypotheses={hypotheses} topCause={topCause} answer={answer} resolutionResponse={resolutionResponse} reset={reset} copyTicket={copyTicket} copyStatus={copyStatus} reduceMotion={reduceMotion} reportedIssue={reportedIssue} supportContext={supportContext} setSupportContext={setSupportContext} beginDiagnosis={beginDiagnosis} onDeepComplete={incident=>setHistory(h=>[{id:Date.now(),...incident},...h].slice(0,25))}/>}
      {view==='history'&&<HistoryView history={history} onStart={s=>start(scenarios.find(x=>x.title===s.scenario)||scenarios[0],s.reportedIssue)}/>}
      {view==='analytics'&&<Analytics history={history}/>}
     </motion.div></AnimatePresence>
    </main>
   </div>
 </div>
}

function Dashboard({intake,setIntake,submitIntake,suggestions,onStart,setView}){
 const reduceMotion=useReducedMotion();
 const examples=['Wi-Fi connected but no internet','MIRO posting period closed','VPN will not connect'];
 const quickIds=['wifi-no-internet','sap-material-document-reversal','vpn-failure','sap-miro-blocked','locked-account','sap-account-assignment'];
 return <>
 <section className="heroPanel"><motion.div initial={reduceMotion?false:{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.28,ease:[.22,1,.36,1]}}><span className="eyebrow"><i/> A CLEARER PATH TO RESOLUTION</span><h2>Less guesswork.<br/><span>Better troubleshooting.</span></h2><p>Describe an IT or SAP issue. Work through focused checks, find the likely cause, and verify your next step.</p>
 <div className="intakeBox"><label htmlFor="issue">What do you need help with?</label><textarea id="issue" aria-describedby="intake-help" value={intake} onChange={e=>setIntake(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')submitIntake()}} placeholder="Describe the problem, including any error message…"/><div className="intakeFooter"><small id="intake-help">Include the exact error if you have it.</small><motion.button className="primary" disabled={!intake.trim()} whileHover={reduceMotion||!intake.trim()?undefined:{y:-2}} whileTap={reduceMotion||!intake.trim()?undefined:{scale:.97}} onClick={submitIntake}>Start diagnosis <ArrowUpRight/></motion.button></div></div>
 <div className="examplePrompts"><span>Try an example</span>{examples.map(text=><FeedbackButton key={text} onClick={()=>{setIntake(text);document.getElementById('issue')?.focus()}}>{text}<ArrowUpRight size={12}/></FeedbackButton>)}</div>
 {suggestions.length>0&&<div className="matchBox" role="status"><span>Which issue is closest?</span><div>{suggestions.map(s=><FeedbackButton key={s.id} onClick={()=>onStart(s,intake)}>{s.title}<ChevronRight/></FeedbackButton>)}</div></div>}
 </motion.div><motion.aside className="workflowCard" initial={reduceMotion?false:{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{duration:reduceMotion?0:.28,delay:reduceMotion?0:.06}}><div className="workflowHeader"><LifeBuoy size={22}/><span>One step at a time</span></div><h3>From symptom<br/>to a clear next step.</h3><ol>{[['Describe','Tell us what happened.'],['Diagnose','Check the evidence that matters.'],['Verify','Retest the fix or escalate with context.']].map(([title,description],i)=><motion.li key={title} initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.35,delay:reduceMotion?0:.1+i*.06}}><b>{String(i+1).padStart(2,'0')}</b><div><strong>{title}</strong><p>{description}</p></div></motion.li>)}</ol><div className="workflowFoot"><span><strong>{scenarios.length}</strong> scenarios</span><span>IT + SAP</span><Check size={16}/></div></motion.aside></section>
 <section aria-labelledby="quick-start-title"><div className="sectionTitle"><div><span>START WITH A KNOWN ISSUE</span><h3 id="quick-start-title">Common support incidents</h3></div><FeedbackButton onClick={()=>setView('scenarios')}>Browse all scenarios <ArrowUpRight/></FeedbackButton></div><motion.div className="scenarioGrid" initial="hidden" whileInView="visible" viewport={{once:true,amount:.1}} variants={{hidden:{},visible:{transition:{staggerChildren:0}}}}>{quickIds.map(id=>scenarios.find(s=>s.id===id)).filter(Boolean).map((s,i)=><ScenarioCard key={s.id} index={i} s={s} onStart={onStart}/>)}</motion.div></section>
 <div className="workspaceNote"><TestTube2 size={16}/><span>A guided support demo. Follow your organization’s approved procedures for system changes.</span></div>
 </>;
}

function ScenarioCard({s,onStart,index=0}){const reduceMotion=useReducedMotion();const Icon=icons[s.icon]||Network;return <motion.button custom={index} variants={{hidden:{opacity:reduceMotion?1:0,y:reduceMotion?0:16},visible:i=>({opacity:1,y:0,transition:{duration:reduceMotion?0:.22,delay:reduceMotion?0:Math.min(i,8)*.025}})}} whileHover={reduceMotion?undefined:{y:-3}} whileTap={reduceMotion?undefined:{scale:.98}} className="scenarioCard" onClick={()=>onStart(s,s.title)}><div className="scenarioIcon"><Icon/></div><div className="scenarioMeta"><span>{s.category}</span><b className={`sev ${s.severity.toLowerCase()}`}>{s.severity}</b></div><h4>{s.title}</h4><p>{s.symptoms.slice(0,3).join(' · ')}</p><div className="cardFoot"><span>{s.priority}</span><span>Diagnose <ChevronRight/></span></div></motion.button>}

function ScenarioLibrary({query,setQuery,filtered,onStart}){
 const reduceMotion=useReducedMotion();
 const [domain,setDomain]=useState('All');
 const visible=filtered.filter(s=>domain==='All'||(domain==='SAP'?s.category.startsWith('SAP'):!s.category.startsWith('SAP')));
 return <><div className="libraryIntro"><h2>Find your starting point.</h2><p>Browse IT and SAP workflows, or search by symptom, transaction, or error.</p></div><div className="libraryHead"><div className="search"><Search/><input aria-label="Search scenarios" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search symptoms, MIGO, Wi-Fi…"/>{query&&<FeedbackButton aria-label="Clear search" onClick={()=>setQuery('')}><X size={16}/></FeedbackButton>}</div><div className="domainTabs" aria-label="Filter scenario domain">{['All','IT','SAP'].map(value=><FeedbackButton key={value} aria-pressed={domain===value} onClick={()=>setDomain(value)}>{domain===value&&<motion.span className="filterSelection" layoutId="domain-selection" transition={{duration:reduceMotion?0:.16}} aria-hidden="true"/>}<span>{value}</span></FeedbackButton>)}</div></div><p className="resultCount" aria-live="polite">{visible.length} {visible.length===1?'scenario':'scenarios'}</p>{visible.length?<motion.div className="scenarioGrid" initial="hidden" animate="visible" variants={{hidden:{},visible:{transition:{staggerChildren:0}}}}>{visible.map((s,i)=><ScenarioCard key={s.id} index={i} s={s} onStart={onStart}/>)}</motion.div>:<div className="empty"><Search/><h3>No matching scenarios</h3><p>Try a transaction name or a shorter symptom.</p><FeedbackButton className="secondary" onClick={()=>{setQuery('');setDomain('All')}}>Clear filters</FeedbackButton></div>}</>;
}

function Diagnostic({scenario,step,answers,result,phase,actionIndex,actionLog,hypotheses,topCause,answer,resolutionResponse,reset,copyTicket,copyStatus,reduceMotion,reportedIssue,supportContext,setSupportContext,beginDiagnosis,onDeepComplete}){
 if(scenario.id==='wifi-no-internet')return <DeepWifiDiagnostic scenario={scenario} reportedIssue={reportedIssue} supportContext={supportContext} setSupportContext={setSupportContext} reduceMotion={reduceMotion} onComplete={onDeepComplete}/>;
 const deepProfile=profileFor(scenario.id);if(deepProfile)return <DeepScenarioDiagnostic scenario={scenario} profile={deepProfile} reportedIssue={reportedIssue} supportContext={supportContext} setSupportContext={setSupportContext} reduceMotion={reduceMotion} onComplete={onDeepComplete}/>;
 const actionGuide=result&&phase==='resolve'?getActionGuide(result.actions[actionIndex],supportContext.os,scenario.id):null;
 const node=scenario.steps[step];
 const progress=phase==='resolved'||phase==='escalated'?100:phase==='resolve'?80:phase==='triage'?15:Math.min(70,Math.round(((step+1)/scenario.steps.length)*65));
 return <div className="diagnosticLayout"><section className="conversation"><div className="incidentBanner"><div><span>{scenario.category}</span><h3>{scenario.title}</h3></div><div><b className={`sev ${scenario.severity.toLowerCase()}`}>{scenario.severity}</b><b className="priority">{scenario.priority}</b></div></div><div className="progress"><i style={{width:`${progress}%`}}/></div>
 <div className="chatLog"><div className="userMsg first"><p>{reportedIssue}</p></div><div className="assistantMsg"><div className="avatar">SQ</div><div><span>SupportQ</span><p>I’ll diagnose this systematically. I’ll ask one useful question at a time, then we’ll apply and verify corrective actions until it works or the evidence says it needs escalation.</p></div></div>
 {answers.map((a,i)=><React.Fragment key={i}><div className="assistantMsg"><div className="avatar">SQ</div><div><span>Diagnostic question</span><p>{a.question}</p></div></div><div className="userMsg"><p>{a.answer}</p></div></React.Fragment>)}
 <AnimatePresence mode="wait">
 {phase==='triage'&&<motion.div className="triageCard" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}}><span>BEFORE WE TROUBLESHOOT</span><h3>Let me understand your setup first.</h3><p>I already filled in anything I could infer from your description. Just confirm the missing details so we can move quickly.</p><div className="triageGrid"><label>Device<select value={supportContext.device} onChange={e=>setSupportContext(x=>({...x,device:e.target.value}))}><option value="">Select if known</option><option>Laptop</option><option>Desktop</option><option>Phone</option><option>Tablet</option><option>Thin client</option><option>Other</option></select></label><label>Operating system<select value={supportContext.os} onChange={e=>setSupportContext(x=>({...x,os:e.target.value}))}><option value="">Select</option><option>Windows 11</option><option>Windows 10</option><option>macOS</option><option>Linux</option><option>iOS / iPadOS</option><option>Android</option><option>Other / Unknown</option></select></label><label>Environment<select value={supportContext.environment} onChange={e=>setSupportContext(x=>({...x,environment:e.target.value}))}><option value="">Select</option><option>Office</option><option>Home</option><option>Remote / VPN</option><option>Hybrid</option><option>Public / Guest network</option><option>Cloud-only</option></select></label><label>When did it start?<select value={supportContext.onset} onChange={e=>setSupportContext(x=>({...x,onset:e.target.value}))}><option value="">Not sure / not important yet</option><option>Just now</option><option>Today</option><option>Last few days</option><option>More than a week ago</option><option>After a restart/update/change</option></select></label><label>Has this happened before?<select value={supportContext.previous} onChange={e=>setSupportContext(x=>({...x,previous:e.target.value}))}><option value="">Not sure</option><option>No, first time</option><option>Yes, occasionally</option><option>Yes, frequently</option><option>Yes, same issue was fixed before</option></select></label><label>Who is affected?<select value={supportContext.scope} onChange={e=>setSupportContext(x=>({...x,scope:e.target.value}))}><option value="">Select</option><option>Only me / one device</option><option>Several users</option><option>Whole team / department</option><option>Everyone / site-wide</option><option>Not sure</option></select></label></div><label className="wideField">Any recent change before the issue?<input value={supportContext.recentChanges} onChange={e=>setSupportContext(x=>({...x,recentChanges:e.target.value}))} placeholder="Example: Windows update, password change, new VPN, moved desks, installed software..."/></label><label className="wideField">How is this affecting your work?<input value={supportContext.impact} onChange={e=>setSupportContext(x=>({...x,impact:e.target.value}))} placeholder="Example: I cannot work, workaround available, only one app affected..."/></label><FeedbackButton className="primary startDiag" disabled={!scenario.category.startsWith('SAP')&&(!supportContext.os||!supportContext.environment||!supportContext.scope)} onClick={beginDiagnosis}>Continue to diagnosis <ArrowUpRight/></FeedbackButton></motion.div>}
 {phase==='diagnose'&&<motion.div key={step} className="questionCard" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}><span>NEXT BEST TEST</span><h4>{node.q}</h4><p>{node.help}</p><div><FeedbackButton onClick={()=>answer('yes')}><Check/>Yes</FeedbackButton><FeedbackButton onClick={()=>answer('no')}><X/>No</FeedbackButton>{scenario.category.startsWith('SAP')&&<FeedbackButton onClick={()=>answer('unknown')}>Not sure</FeedbackButton>}</div></motion.div>}
 {phase==='resolve'&&result&&actionGuide&&<motion.div key={actionIndex} className="resolutionCard" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}}><span>CORRECTIVE ACTION {actionIndex+1} OF {result.actions.length}</span><h3>{actionGuide.title}</h3><p><b>Why:</b> {actionGuide.why}</p><div className="howTo"><b>How to do it on {supportContext.os||'your device'}</b><ol>{actionGuide.steps.map((s,i)=><li key={i}><code>{s}</code></li>)}</ol></div><div className="expected"><b>Expected result</b><p>{actionGuide.expected}</p></div>{actionGuide.warning&&<div className="warningBox"><TestTube2/><div><b>Important</b><span>{actionGuide.warning}</span></div></div>}<p className="retest">Now retest the original problem: <b>{reportedIssue}</b></p><div className="verifyButtons"><FeedbackButton className="resolvedBtn" onClick={()=>resolutionResponse(true)}><Check/>It works now</FeedbackButton><FeedbackButton className="secondary" onClick={()=>resolutionResponse(false)}><X/>Still not working</FeedbackButton></div>{actionLog.length>0&&<div className="attempts"><b>Previous attempts</b>{actionLog.map((a,i)=><span key={i}>✕ {a.action}</span>)}</div>}</motion.div>}
 {(phase==='resolved'||phase==='escalated')&&result&&<motion.div className={phase==='resolved'?'resultCard resolved':'resultCard escalated'} initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="resultIcon">{phase==='resolved'?<Check/>:<TestTube2/>}</div><span>{phase==='resolved'?'INCIDENT RESOLVED':'ESCALATION REQUIRED'}</span><h3>{phase==='resolved'?'Issue verified as resolved':result.result}</h3><p>{phase==='resolved'?`Likely root cause: ${result.cause}`:`${result.cause}. The collected evidence and attempted fixes should be attached to the escalation.`}</p><div className="confidence"><div><span>RCA confidence</span><b>{result.confidence}%</b></div><i><em style={{width:`${result.confidence}%`}}/></i></div><h5>{phase==='resolved'?'Actions attempted':'Recommended escalation / next actions'}</h5><ol>{(phase==='resolved'?actionLog.map(x=>x.action):result.actions).map(a=><li key={a}>{a}</li>)}</ol><div className="resultActions"><FeedbackButton className="primary" onClick={copyTicket}><Code2/>Copy incident</FeedbackButton><p role="status" aria-live="polite" aria-atomic="true">{copyStatus}</p><FeedbackButton className="secondary" onClick={reset}><ArrowUpRight/>Diagnose again</FeedbackButton></div></motion.div>}
 </AnimatePresence></div></section>
 <aside className="diagnosticSide"><div className="sidePanel"><span>INCIDENT STATE</span><dl><div><dt>Category</dt><dd>{scenario.category}</dd></div><div><dt>Severity</dt><dd>{scenario.severity}</dd></div><div><dt>Priority</dt><dd>{scenario.priority}</dd></div><div><dt>Status</dt><dd>{phase==='triage'?'Gathering context':phase==='diagnose'?'Diagnosing':phase==='resolve'?'Applying fix':phase==='resolved'?'Resolved':'Escalated'}</dd></div><div><dt>Device / OS</dt><dd>{supportContext.device||'—'}{supportContext.os?` · ${supportContext.os}`:''}</dd></div><div><dt>Environment</dt><dd>{supportContext.environment||'—'}</dd></div><div><dt>Scope</dt><dd>{supportContext.scope||'—'}</dd></div><div><dt>Checks</dt><dd>{answers.length}</dd></div><div><dt>Fix attempts</dt><dd>{actionLog.length}</dd></div></dl></div><div className="sidePanel"><span>LIKELY CAUSES</span><div className="hypotheses">{hypotheses.map((h,i)=><div key={h.name}><div><span>{h.name}</span><b>{pct(h.score)}</b></div><i><em style={{width:pct(h.score)}}/></i>{i===0&&phase==='diagnose'&&<small>Current lead</small>}</div>)}</div></div>{topCause&&phase==='diagnose'&&<div className="reasonPanel"><TestTube2/><div><b>Decision logic</b><p>Each answer changes the hypothesis ranking. The next question is chosen to separate the most likely causes.</p></div></div>}</aside></div>
}

function DeepWifiDiagnostic({scenario,reportedIssue,supportContext,setSupportContext,reduceMotion,onComplete}){
 const[nodeId,setNodeId]=useState('start');
 const[hypotheses,setHypotheses]=useState(initialHypotheses());
 const[evidence,setEvidence]=useState([]);
 const[attempts,setAttempts]=useState([]);
 const[input,setInput]=useState('');
 const[status,setStatus]=useState('diagnosing');
 const[finalResult,setFinalResult]=useState(null);
 const[showHelp,setShowHelp]=useState(false);
 const[copyStatus,setCopyStatus]=useState('');
 const node=getNode(nodeId);
 const priority=calculatePriority(supportContext,scenario.category);
 const family=(supportContext.os||'').toLowerCase().includes('windows')?'windows':(supportContext.os||'').toLowerCase().includes('mac')?'macos':'windows';

 const record=(summary,raw='')=>setEvidence(e=>[...e,{time:now(),summary,raw}]);
 const go=(next,boosts)=>{if(boosts)setHypotheses(h=>applyBoosts(h,boosts));setInput('');setShowHelp(false);setNodeId(next)};

 const finishResolve=(r,summary='')=>{
   if(summary)record(summary);
   const out={scenario:scenario.title,category:scenario.category,status:'Resolved',priority:priority.priority,severity:priority.severity,reportedIssue,supportContext,cause:r.cause,confidence:r.confidence,evidence,actionLog:attempts,completedAt:now()};
   setStatus('resolved');setFinalResult(out);onComplete?.(out);
 };
 const finishEscalate=(r,summary='')=>{
   if(summary)record(summary);
   const out={scenario:scenario.title,category:scenario.category,status:'Escalated',priority:priority.priority,severity:priority.severity,reportedIssue,supportContext,cause:r.reason,confidence:hypotheses[0]?.score||70,assignment:r.team,evidence,actionLog:attempts,completedAt:now()};
   setStatus('escalated');setFinalResult(out);onComplete?.(out);
 };
 const choose=(opt)=>{
   record(`${node.prompt} → ${opt.label}`);
   if(opt.boosts)setHypotheses(h=>applyBoosts(h,opt.boosts));
   if(opt.resolve)return finishResolve(opt.resolve,`Resolution evidence: ${opt.label}`);
   if(opt.escalate)return finishEscalate(opt.escalate,`Escalation trigger: ${opt.label}`);
   go(opt.next);
 };
 const submitText=()=>{
   if(!input.trim())return;
   const parsed=parseDiagnosticText(node.id,input);
   record(parsed.summary,input);
   if(parsed.boosts)setHypotheses(h=>applyBoosts(h,parsed.boosts));
   if(parsed.resolve)return finishResolve(parsed.resolve,parsed.summary);
   if(parsed.escalate)return finishEscalate(parsed.escalate,parsed.summary);
   go(parsed.next);
 };
 const actionOutcome=(out)=>{
   const log={action:node.action,outcome:out.label,time:now()};
   setAttempts(a=>[...a,log]);
   record(`${node.action} → ${out.label}`);
   if(out.boosts)setHypotheses(h=>applyBoosts(h,out.boosts));
   if(out.resolve)return finishResolve(out.resolve,`${node.action} fixed the issue`);
   if(out.escalate)return finishEscalate(out.escalate,`${node.action}: ${out.label}`);
   go(out.next);
 };
 const guide=node.type==='action'?getActionGuide(node.action,supportContext.os,scenario.id):null;
 const copyDeep=async()=>{
   if(!finalResult)return;
   const txt=`INCIDENT
Issue: ${reportedIssue}
Device/OS: ${supportContext.device||'Unknown'} / ${supportContext.os||'Unknown'}
Environment: ${supportContext.environment||'Unknown'}
Scope: ${supportContext.scope||'Unknown'}
Priority: ${finalResult.priority}
Status: ${finalResult.status}
Root cause / escalation reason: ${finalResult.cause}
Assignment: ${finalResult.assignment||'N/A'}
Evidence:
${evidence.map(x=>'- '+x.summary+(x.raw?' | '+x.raw.replace(/\n/g,' '):'')).join('\n')}
Actions:
${attempts.map(x=>'- '+x.action+' → '+x.outcome).join('\n')||'- None'}`;
   const copied=await copySanitizedIncident(txt);setCopyStatus(copied.message);
 };
 if(status!=='diagnosing')return <div className="diagnosticLayout"><section className="conversation"><div className="chatLog"><div className={status==='resolved'?'resultCard resolved':'resultCard escalated'}><div className="resultIcon">{status==='resolved'?<Check/>:<TestTube2/>}</div><span>{status==='resolved'?'VERIFIED RESOLUTION':'JUSTIFIED ESCALATION'}</span><h3>{status==='resolved'?'Issue resolved':`Escalate to ${finalResult.assignment||'specialist support'}`}</h3><p>{finalResult.cause}</p><div className="confidence"><div><span>Evidence confidence</span><b>{finalResult.confidence}%</b></div><i><em style={{width:pct(finalResult.confidence)}}/></i></div><h5>Evidence collected</h5><ol>{evidence.map((e,i)=><li key={i}>{e.summary}</li>)}</ol><div className="resultActions"><FeedbackButton className="primary" onClick={copyDeep}><Code2/>Copy incident</FeedbackButton><p role="status" aria-live="polite" aria-atomic="true">{copyStatus}</p></div></div></div></section><aside className="diagnosticSide"><DeepContext supportContext={supportContext} priority={priority} hypotheses={hypotheses} evidence={evidence} attempts={attempts}/></aside></div>;

 return <div className="diagnosticLayout"><section className="conversation"><div className="incidentBanner"><div><span>CONTINUOUS DIAGNOSIS · {priority.priority}</span><h3>{scenario.title}</h3></div><div><b className={`sev ${priority.severity.toLowerCase()}`}>{priority.severity}</b></div></div><div className="progress"><i style={{width:`${Math.min(92,18+evidence.length*9)}%`}}/></div><div className="chatLog"><div className="userMsg first"><p>{reportedIssue}</p></div><div className="assistantMsg"><div className="avatar">SQ</div><div><span>SupportQ</span><p>I’ll use the evidence you give me to choose the next test. I won’t run through a fixed checklist or escalate just because a list ended.</p></div></div>
 {!supportContext.os||!supportContext.environment||!supportContext.scope?<div className="triageCard"><span>FAST CONTEXT</span><h3>I only need the details that change the diagnosis.</h3><div className="triageGrid"><label>Operating system<select value={supportContext.os} onChange={e=>setSupportContext(x=>({...x,os:e.target.value}))}><option value="">Select</option><option>Windows 11</option><option>Windows 10</option><option>macOS</option><option>Linux</option><option>iOS / iPadOS</option><option>Android</option></select></label><label>Environment<select value={supportContext.environment} onChange={e=>setSupportContext(x=>({...x,environment:e.target.value}))}><option value="">Select</option><option>Office</option><option>Home</option><option>Remote / VPN</option><option>Public / Guest network</option></select></label><label>Who is affected?<select value={supportContext.scope} onChange={e=>setSupportContext(x=>({...x,scope:e.target.value}))}><option value="">Select</option><option>Only me / one device</option><option>Several users</option><option>Whole team / department</option><option>Everyone / site-wide</option><option>Not sure</option></select></label><label>Work impact<input value={supportContext.impact||''} onChange={e=>setSupportContext(x=>({...x,impact:e.target.value}))} placeholder="Optional: blocked, workaround available..."/></label></div></div>:null}
 {supportContext.os&&supportContext.environment&&supportContext.scope&&<AnimatePresence mode="wait"><motion.div key={nodeId} className={node.type==='action'?'resolutionCard':'questionCard'} initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}}>
   <span>{node.type==='action'?'NEXT CORRECTIVE ACTION':'NEXT BEST TEST'}</span><h4>{node.prompt}</h4>{node.why&&<p>{node.why}</p>}
   {node.type==='choice'&&<div className="choiceStack">{node.options.map(o=><FeedbackButton key={o.value} onClick={()=>choose(o)}>{o.label}<ChevronRight/></FeedbackButton>)}</div>}
   {node.type==='text'&&<><textarea className="evidenceInput" value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste the exact output or describe what happened..."/>{node.help&&<FeedbackButton className="textLink" onClick={()=>setShowHelp(v=>!v)}>{showHelp?'Hide instructions':'Show me how to check'}</FeedbackButton>}{showHelp&&node.help&&<div className="howTo"><b>How to collect this evidence</b><ol>{(node.help[family]||node.help.windows||[]).map((s,i)=><li key={i}><code>{s}</code></li>)}</ol></div>}<FeedbackButton className="primary submitEvidence" onClick={submitText}>Analyze this result <ArrowUpRight/></FeedbackButton></>}
   {node.type==='action'&&guide&&<><div className="howTo"><b>How to do it on {supportContext.os}</b><ol>{guide.steps.map((s,i)=><li key={i}><code>{s}</code></li>)}</ol></div><div className="expected"><b>Expected result</b><p>{node.expected||guide.expected}</p></div>{guide.warning&&<div className="warningBox"><TestTube2/><div><b>Important</b><span>{guide.warning}</span></div></div>}<div className="choiceStack">{node.outcomes.map(o=><FeedbackButton key={o.value} onClick={()=>actionOutcome(o)}>{o.label}<ChevronRight/></FeedbackButton>)}</div></>}
 </motion.div></AnimatePresence>}
 </div></section><aside className="diagnosticSide"><DeepContext supportContext={supportContext} priority={priority} hypotheses={hypotheses} evidence={evidence} attempts={attempts}/></aside></div>
}

function DeepContext({supportContext,priority,hypotheses,evidence,attempts}){return <><div className="sidePanel"><span>LIVE INCIDENT</span><dl><div><dt>Priority</dt><dd>{priority.priority}</dd></div><div><dt>Reason</dt><dd>{priority.reason}</dd></div><div><dt>OS</dt><dd>{supportContext.os||'—'}</dd></div><div><dt>Environment</dt><dd>{supportContext.environment||'—'}</dd></div><div><dt>Scope</dt><dd>{supportContext.scope||'—'}</dd></div><div><dt>Evidence</dt><dd>{evidence.length}</dd></div><div><dt>Fix attempts</dt><dd>{attempts.length}</dd></div></dl></div><div className="sidePanel"><span>HYPOTHESIS MODEL</span><div className="hypotheses">{hypotheses.map((h,i)=><div key={h.name}><div><span>{h.name}</span><b>{pct(h.score)}</b></div><i><em style={{width:pct(h.score)}}/></i>{i===0&&<small>Current lead</small>}</div>)}</div></div>{evidence.length>0&&<div className="sidePanel"><span>RECENT EVIDENCE</span><div className="evidenceMini">{evidence.slice(-4).reverse().map((e,i)=><p key={i}>{e.summary}</p>)}</div></div>}</>}

function DeepScenarioDiagnostic({scenario,profile,reportedIssue,supportContext,setSupportContext,reduceMotion,onComplete}){
 const[nodeId,setNodeId]=useState(profile.start);
 const[hypotheses,setHypotheses]=useState(profileHypotheses(scenario.id));
 const[evidence,setEvidence]=useState([]);
 const[attempts,setAttempts]=useState([]);
 const[input,setInput]=useState('');
 const[status,setStatus]=useState('diagnosing');
 const[finalResult,setFinalResult]=useState(null);
 const[showHelp,setShowHelp]=useState(false);
 const[copyStatus,setCopyStatus]=useState('');
 const node=profile.nodes[nodeId];
 const priority=calculatePriority(supportContext,scenario.category);
 const family=(supportContext.os||'').toLowerCase().includes('windows')?'windows':(supportContext.os||'').toLowerCase().includes('mac')?'macos':'windows';

 const record=(summary,raw='')=>setEvidence(e=>[...e,{time:now(),summary,raw}]);
 const boost=(b)=>{if(b)setHypotheses(h=>applyBoosts(h,b))};
 const go=(next,b)=>{boost(b);setInput('');setShowHelp(false);setNodeId(next||profile.start)};
 const finishResolve=(r,summary='')=>{if(summary)record(summary);const out={scenario:scenario.title,category:scenario.category,status:'Resolved',priority:priority.priority,severity:priority.severity,reportedIssue,supportContext,cause:r.cause,confidence:r.confidence,evidence,actionLog:attempts,completedAt:now()};setStatus('resolved');setFinalResult(out);onComplete?.(out)};
 const finishEscalate=(r,summary='')=>{if(summary)record(summary);const out={scenario:scenario.title,category:scenario.category,status:'Escalated',priority:priority.priority,severity:priority.severity,reportedIssue,supportContext,cause:r.reason,confidence:hypotheses[0]?.score||70,assignment:r.team,evidence,actionLog:attempts,completedAt:now()};setStatus('escalated');setFinalResult(out);onComplete?.(out)};

 const choose=(opt)=>{record(`${node.prompt} → ${opt.label}`);boost(opt.boosts);if(opt.resolve)return finishResolve(opt.resolve,`Resolution evidence: ${opt.label}`);if(opt.escalate)return finishEscalate(opt.escalate,`Escalation trigger: ${opt.label}`);go(opt.next)};
 const submitText=()=>{if(!input.trim())return;const parsed=interpretGeneric(scenario.id,nodeId,input);record(parsed.summary,input);boost(parsed.boosts);if(parsed.resolve)return finishResolve(parsed.resolve,parsed.summary);if(parsed.escalate)return finishEscalate(parsed.escalate,parsed.summary);go(parsed.next||nodeId)};
 const actionOutcome=(out)=>{const log={action:node.action,outcome:out.label,time:now()};setAttempts(a=>[...a,log]);record(`${node.action} → ${out.label}`);boost(out.boosts);if(out.resolve)return finishResolve(out.resolve,`${node.action} resolved the incident`);if(out.escalate)return finishEscalate(out.escalate,`${node.action}: ${out.label}`);go(out.next)};
 const guide=node?.type==='action'?getActionGuide(node.action,supportContext.os,scenario.id):null;

 const copyDeep=async()=>{if(!finalResult)return;const txt=`INCIDENT
Issue: ${reportedIssue}
Category: ${scenario.category}
Device/OS: ${supportContext.device||'Unknown'} / ${supportContext.os||'Unknown'}
Environment: ${supportContext.environment||'Unknown'}
Scope: ${supportContext.scope||'Unknown'}
Priority: ${finalResult.priority}
Status: ${finalResult.status}
Root cause / escalation reason: ${finalResult.cause}
Assignment: ${finalResult.assignment||'N/A'}
Evidence:
${evidence.map(x=>'- '+x.summary+(x.raw?' | '+x.raw.replace(/\n/g,' '):'')).join('\n')}
Actions:
${attempts.map(x=>'- '+x.action+' → '+x.outcome).join('\n')||'- None'}`;const copied=await copySanitizedIncident(txt);setCopyStatus(copied.message)};

 if(status!=='diagnosing')return <div className="diagnosticLayout"><section className="conversation"><div className="chatLog"><div className={status==='resolved'?'resultCard resolved':'resultCard escalated'}><div className="resultIcon">{status==='resolved'?<Check/>:<TestTube2/>}</div><span>{status==='resolved'?'VERIFIED RESOLUTION':'JUSTIFIED ESCALATION'}</span><h3>{status==='resolved'?'Issue resolved':`Escalate to ${finalResult.assignment||'specialist support'}`}</h3><p>{finalResult.cause}</p><div className="confidence"><div><span>Evidence confidence</span><b>{finalResult.confidence}%</b></div><i><em style={{width:pct(finalResult.confidence)}}/></i></div><h5>Evidence collected</h5><ol>{evidence.map((e,i)=><li key={i}>{e.summary}</li>)}</ol><div className="resultActions"><FeedbackButton className="primary" onClick={copyDeep}><Code2/>Copy incident</FeedbackButton><p role="status" aria-live="polite" aria-atomic="true">{copyStatus}</p></div></div></div></section><aside className="diagnosticSide"><DeepContext supportContext={supportContext} priority={priority} hypotheses={hypotheses} evidence={evidence} attempts={attempts}/></aside></div>;

 if(!node)return <div className="empty"><TestTube2/><h3>Diagnostic node unavailable</h3><p>This scenario needs a profile update.</p></div>;

 return <div className="diagnosticLayout"><section className="conversation"><div className="incidentBanner"><div><span>CONTINUOUS DIAGNOSIS · {priority.priority}</span><h3>{scenario.title}</h3></div><div><b className={`sev ${priority.severity.toLowerCase()}`}>{priority.severity}</b></div></div><div className="progress"><i style={{width:`${Math.min(92,18+evidence.length*9)}%`}}/></div><div className="chatLog"><div className="userMsg first"><p>{reportedIssue}</p></div><div className="assistantMsg"><div className="avatar">SQ</div><div><span>SupportQ</span><p>I’ll use your answers, exact errors, and test results to choose the next step. I’ll stop asking questions once the evidence is strong enough.</p></div></div>
 {!supportContext.os||!supportContext.environment||!supportContext.scope?<div className="triageCard"><span>FAST CONTEXT</span><h3>Just the details that change the next decision.</h3><div className="triageGrid"><label>Operating system<select value={supportContext.os} onChange={e=>setSupportContext(x=>({...x,os:e.target.value}))}><option value="">Select</option><option>Windows 11</option><option>Windows 10</option><option>macOS</option><option>Linux</option><option>iOS / iPadOS</option><option>Android</option></select></label><label>Environment<select value={supportContext.environment} onChange={e=>setSupportContext(x=>({...x,environment:e.target.value}))}><option value="">Select</option><option>Office</option><option>Home</option><option>Remote / VPN</option><option>Public / Guest network</option><option>Cloud-only</option></select></label><label>Who is affected?<select value={supportContext.scope} onChange={e=>setSupportContext(x=>({...x,scope:e.target.value}))}><option value="">Select</option><option>Only me / one device</option><option>Several users</option><option>Whole team / department</option><option>Everyone / site-wide</option><option>Not sure</option></select></label><label>Work impact<input value={supportContext.impact||''} onChange={e=>setSupportContext(x=>({...x,impact:e.target.value}))} placeholder="Optional: blocked, workaround available..."/></label></div></div>:null}
 {supportContext.os&&supportContext.environment&&supportContext.scope&&<AnimatePresence mode="wait"><motion.div key={nodeId} className={node.type==='action'?'resolutionCard':'questionCard'} initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}}>
 <span>{node.type==='action'?'NEXT CORRECTIVE ACTION':'NEXT BEST TEST'}</span><h4>{node.prompt}</h4>{node.why&&<p>{node.why}</p>}
 {node.type==='choice'&&<div className="choiceStack">{node.options.map(o=><FeedbackButton key={o.value} onClick={()=>choose(o)}>{o.label}<ChevronRight/></FeedbackButton>)}</div>}
 {node.type==='text'&&<><textarea className="evidenceInput" value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste the exact error/output or describe what happened..."/>{node.help&&<FeedbackButton className="textLink" onClick={()=>setShowHelp(v=>!v)}>{showHelp?'Hide instructions':'Show me how to collect this'}</FeedbackButton>}{showHelp&&<div className="howTo"><b>How to collect this evidence</b><ol>{(node.help[family]||node.help.windows||[]).map((s,i)=><li key={i}><code>{s}</code></li>)}</ol></div>}<FeedbackButton className="primary submitEvidence" onClick={submitText}>Analyze this result <ArrowUpRight/></FeedbackButton></>}
 {node.type==='action'&&guide&&<><div className="howTo"><b>How to do it on {supportContext.os}</b><ol>{guide.steps.map((s,i)=><li key={i}><code>{s}</code></li>)}</ol></div><div className="expected"><b>Expected result</b><p>{node.expected||guide.expected}</p></div>{guide.warning&&<div className="warningBox"><TestTube2/><div><b>Important</b><span>{guide.warning}</span></div></div>}<div className="choiceStack">{node.outcomes.map(o=><FeedbackButton key={o.value} onClick={()=>actionOutcome(o)}>{o.label}<ChevronRight/></FeedbackButton>)}</div></>}
 </motion.div></AnimatePresence>}
 </div></section><aside className="diagnosticSide"><DeepContext supportContext={supportContext} priority={priority} hypotheses={hypotheses} evidence={evidence} attempts={attempts}/></aside></div>
}

function HistoryView({history,onStart}){if(!history.length)return <div className="empty"><Database/><h3>No completed incidents yet</h3><p>An incident is saved only after it is resolved or escalated.</p></div>;return <div className="historyList">{history.map(h=><article key={h.id}><div><span>{h.category} · {h.status}</span><h3>{h.scenario}</h3><p>{h.reportedIssue||h.cause}</p></div><div className="historyMeta"><b>{h.priority}</b><span>{h.confidence}% RCA confidence</span><span>{h.completedAt}</span><FeedbackButton onClick={()=>onStart(h)}>Re-run</FeedbackButton></div></article>)}</div>}

function Analytics({history}){const total=history.length,resolved=history.filter(x=>x.status==='Resolved').length,escalated=history.filter(x=>x.status==='Escalated').length,avg=total?Math.round(history.reduce((a,x)=>a+x.confidence,0)/total):0;const cats=history.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{});const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);return <><div className="metricGrid"><Metric title="Incidents completed" value={total}/><Metric title="Resolved" value={resolved}/><Metric title="Escalated" value={escalated}/><Metric title="Avg. RCA confidence" value={`${avg}%`}/></div><section className="analyticsPanel"><div><span className="eyebrow">ROOT CAUSE TRENDS</span><h3>Incident categories</h3></div>{sorted.length?sorted.map(([k,v])=><div className="barRow" key={k}><span>{k}</span><i><em style={{width:`${(v/Math.max(...sorted.map(x=>x[1])))*100}%`}}/></i><b>{v}</b></div>):<p className="muted">Resolve or escalate incidents to populate analytics.</p>}</section></>}
const Metric=({title,value})=><div className="metric"><span>{title}</span><strong>{value}</strong></div>;
export default App;
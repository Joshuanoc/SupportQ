import React,{useMemo,useState,useEffect}from'react';
import{motion,AnimatePresence,useReducedMotion}from'framer-motion';
import{ArrowUpRight,Check,ChevronRight,Mail,Code2,Cloud,TestTube2,Wrench,Database,Network,Menu,X}from'lucide-react';
import{scenarios,categoryCounts}from'./data.js';

const icons={Wifi:Network,Shield:TestTube2,KeyRound:Wrench,Mail,MonitorCog:Code2,Printer:Wrench,TriangleAlert:TestTube2,CloudOff:Cloud,AppWindow:Code2,VideoOff:Code2,CloudCog:Cloud,HardDrive:Database};
const pct=n=>`${Math.max(0,Math.min(100,Math.round(n)))}%`;
const now=()=>new Date().toLocaleString();

function App(){
 const reduceMotion=useReducedMotion();
 const[view,setView]=useState('dashboard');
 const[scenario,setScenario]=useState(null);
 const[step,setStep]=useState(0);
 const[hypotheses,setHypotheses]=useState([]);
 const[answers,setAnswers]=useState([]);
 const[result,setResult]=useState(null);
 const[history,setHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem('supportiq-history')||'[]')}catch{return[]}});
 const[query,setQuery]=useState('');
 const[mobile,setMobile]=useState(false);
 useEffect(()=>localStorage.setItem('supportiq-history',JSON.stringify(history.slice(0,20))),[history]);
 const filtered=useMemo(()=>scenarios.filter(s=>`${s.title} ${s.category}`.toLowerCase().includes(query.toLowerCase())),[query]);
 const start=(s)=>{setScenario(s);setStep(0);setAnswers([]);setResult(null);setHypotheses(s.hypotheses.map(([name,score])=>({name,score})).sort((a,b)=>b.score-a.score));setView('diagnose');setMobile(false)};
 const updateScores=(boost={})=>setHypotheses(h=>h.map(x=>({...x,score:Math.max(0,Math.min(100,x.score+(boost[x.name]||0)))})).sort((a,b)=>b.score-a.score));
 const answer=(choice)=>{if(!scenario||result)return;const node=scenario.steps[step];const path=node[choice];const nextAnswers=[...answers,{question:node.q,answer:choice==='yes'?'Yes':'No'}];setAnswers(nextAnswers);if(path.boost)updateScores(path.boost);if(path.result){const r={...path,scenario:scenario.title,category:scenario.category,severity:scenario.severity,priority:scenario.priority,completedAt:now(),answers:nextAnswers};setResult(r);setHistory(h=>[{id:Date.now(),...r},...h].slice(0,20));}else setStep(path.next);};
 const reset=()=>scenario&&start(scenario);
 const copyTicket=async()=>{if(!result)return;const txt=`INCIDENT
Category: ${result.category}
Priority: ${result.priority}
Severity: ${result.severity}
Issue: ${result.scenario}
Root cause: ${result.cause}
Confidence: ${result.confidence}%
Resolution actions:
- ${result.actions.join('\n- ')}
Escalation: ${result.escalate?'Required':'Not required'}
Completed: ${result.completedAt}`;try{await navigator.clipboard.writeText(txt)}catch{}};
 const topCause=hypotheses[0];
 return <div className="appShell">
   <aside className={mobile?'sidebar open':'sidebar'}>
    <div className="brand"><div className="brandMark"><TestTube2 size={22}/></div><div><strong>SupportIQ</strong><span>IT Support Intelligence</span></div></div>
    <nav>
      <button className={view==='dashboard'?'active':''} onClick={()=>{setView('dashboard');setMobile(false)}}><Code2/>Dashboard</button>
      <button className={view==='scenarios'?'active':''} onClick={()=>{setView('scenarios');setMobile(false)}}><Network/>Scenario Library</button>
      <button className={view==='history'?'active':''} onClick={()=>{setView('history');setMobile(false)}}><Database/>Incident History</button>
      <button className={view==='analytics'?'active':''} onClick={()=>{setView('analytics');setMobile(false)}}><Database/>Analytics</button>
    </nav>
    <div className="sideNote"><TestTube2 size={17}/><div><b>Decision support</b><span>Evidence-driven RCA with escalation rules.</span></div></div>
   </aside>
   <div className="mainArea">
    <header className="topbar"><button className="mobileToggle" onClick={()=>setMobile(v=>!v)} aria-label="Toggle navigation">{mobile?<X/>:<Menu/>}</button><div><span className="crumb">SUPPORTIQ / {view.toUpperCase()}</span><h1>{view==='diagnose'&&scenario?scenario.title:view==='scenarios'?'Scenario Library':view==='history'?'Incident History':view==='analytics'?'Support Analytics':'IT Support Command Center'}</h1></div><div className="status"><i/>System operational</div></header>
    <main className="content">
      {view==='dashboard'&&<Dashboard onStart={start} setView={setView}/>}
      {view==='scenarios'&&<ScenarioLibrary query={query} setQuery={setQuery} filtered={filtered} onStart={start}/>}
      {view==='diagnose'&&scenario&&<Diagnostic scenario={scenario} step={step} answers={answers} result={result} hypotheses={hypotheses} topCause={topCause} answer={answer} reset={reset} copyTicket={copyTicket} reduceMotion={reduceMotion}/>}
      {view==='history'&&<HistoryView history={history} onStart={s=>start(scenarios.find(x=>x.title===s.scenario)||scenarios[0])}/>}
      {view==='analytics'&&<Analytics history={history}/>}
    </main>
   </div>
 </div>
}

function Dashboard({onStart,setView}){return <>
 <section className="heroPanel"><div><span className="eyebrow">IT SUPPORT DECISION ENGINE</span><h2>Diagnose smarter.<br/>Resolve with evidence.</h2><p>SupportIQ guides Tier 1/Tier 2 troubleshooting using structured decision trees, hypothesis scoring, root-cause analysis, severity classification and escalation logic.</p><div className="heroActions"><button className="primary" onClick={()=>onStart(scenarios[0])}>Run a demo incident <ArrowUpRight/></button><button className="secondary" onClick={()=>setView('scenarios')}>Browse scenarios</button></div></div><div className="signalCard"><div className="signalHead"><Network/><span>Diagnostic model</span><b>READY</b></div><div className="signalGrid"><div><strong>{scenarios.length}</strong><span>Scenarios</span></div><div><strong>{Object.keys(categoryCounts).length}</strong><span>Domains</span></div><div><strong>P1–P4</strong><span>Priority</span></div><div><strong>RCA</strong><span>Engine</span></div></div><div className="pulseRow"><i/><span>Evidence → Hypothesis → Test → Root cause</span></div></div></section>
 <section><div className="sectionTitle"><div><span>START HERE</span><h3>Common support incidents</h3></div><button onClick={()=>setView('scenarios')}>View all <ChevronRight/></button></div><div className="scenarioGrid">{scenarios.slice(0,6).map(s=><ScenarioCard key={s.id} s={s} onStart={onStart}/>)}</div></section>
 <section className="framework"><div><span className="eyebrow">DECISION MODEL</span><h3>How SupportIQ works</h3></div><div className="flow"><div><b>01</b><span>Classify symptom</span></div><ArrowUpRight/><div><b>02</b><span>Form hypotheses</span></div><ArrowUpRight/><div><b>03</b><span>Run highest-value test</span></div><ArrowUpRight/><div><b>04</b><span>Identify root cause</span></div><ArrowUpRight/><div><b>05</b><span>Resolve or escalate</span></div></div></section>
 </>}

function ScenarioCard({s,onStart}){const Icon=icons[s.icon]||Network;return <button className="scenarioCard" onClick={()=>onStart(s)}><div className="scenarioIcon"><Icon/></div><div className="scenarioMeta"><span>{s.category}</span><b className={`sev ${s.severity.toLowerCase()}`}>{s.severity}</b></div><h4>{s.title}</h4><p>{s.symptoms.join(' · ')}</p><div className="cardFoot"><span>{s.priority}</span><span>Start diagnosis <ChevronRight/></span></div></button>}

function ScenarioLibrary({query,setQuery,filtered,onStart}){return <><div className="libraryHead"><div className="search"><Code2/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Wi‑Fi, VPN, Outlook, Azure..."/></div><span>{filtered.length} scenarios</span></div><div className="scenarioGrid">{filtered.map(s=><ScenarioCard key={s.id} s={s} onStart={onStart}/>)}</div></>}

function Diagnostic({scenario,step,answers,result,hypotheses,topCause,answer,reset,copyTicket,reduceMotion}){const node=scenario.steps[step];const progress=result?100:Math.round(((step+1)/scenario.steps.length)*75);return <div className="diagnosticLayout"><section className="conversation"><div className="incidentBanner"><div><span>{scenario.category}</span><h3>{scenario.title}</h3></div><div><b className={`sev ${scenario.severity.toLowerCase()}`}>{scenario.severity}</b><b className="priority">{scenario.priority}</b></div></div><div className="progress"><i style={{width:`${progress}%`}}/></div><div className="chatLog"><div className="assistantMsg"><div className="avatar">SI</div><div><span>SupportIQ</span><p>I’ll narrow this down with the safest, highest-value checks first. I’ll update the likely causes as evidence comes in.</p></div></div>{answers.map((a,i)=><React.Fragment key={i}><div className="assistantMsg"><div className="avatar">SI</div><div><span>Diagnostic question</span><p>{a.question}</p></div></div><div className="userMsg"><p>{a.answer}</p></div></React.Fragment>)}<AnimatePresence mode="wait">{!result&&<motion.div key={step} className="questionCard" initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}><span>NEXT BEST TEST</span><h4>{node.q}</h4><p>{node.help}</p><div><button onClick={()=>answer('yes')}><Check/>Yes</button><button onClick={()=>answer('no')}><X/>No</button></div></motion.div>}{result&&<motion.div className="resultCard" initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="resultIcon"><Check/></div><span>ROOT CAUSE ANALYSIS</span><h3>{result.result}</h3><p>{result.cause}</p><div className="confidence"><div><span>Confidence</span><b>{result.confidence}%</b></div><i><em style={{width:`${result.confidence}%`}}/></i></div><h5>Recommended actions</h5><ol>{result.actions.map(a=><li key={a}>{a}</li>)}</ol><div className={result.escalate?'escalation warn':'escalation'}>{result.escalate?<TestTube2/>:<Check/>}<div><b>{result.escalate?'Escalation recommended':'No escalation required yet'}</b><span>{result.escalate?'Route to the appropriate specialist team with collected evidence.':'Verify the fix and monitor for recurrence.'}</span></div></div><div className="resultActions"><button className="primary" onClick={copyTicket}><Code2/>Copy incident</button><button className="secondary" onClick={reset}><ArrowUpRight/>Run again</button></div></motion.div>}</AnimatePresence></div></section><aside className="diagnosticSide"><div className="sidePanel"><span>DIAGNOSTIC CONTEXT</span><dl><div><dt>Category</dt><dd>{scenario.category}</dd></div><div><dt>Severity</dt><dd>{scenario.severity}</dd></div><div><dt>Priority</dt><dd>{scenario.priority}</dd></div><div><dt>Checks completed</dt><dd>{answers.length}</dd></div></dl></div><div className="sidePanel"><span>LIKELY CAUSES</span><div className="hypotheses">{hypotheses.map((h,i)=><div key={h.name}><div><span>{h.name}</span><b>{pct(h.score)}</b></div><i><em style={{width:pct(h.score)}}/></i>{i===0&&!result&&<small>Current lead</small>}</div>)}</div></div>{topCause&&!result&&<div className="reasonPanel"><TestTube2/><div><b>Why this question?</b><p>The engine is testing evidence that best separates the current leading hypotheses.</p></div></div>}</aside></div>}

function HistoryView({history,onStart}){if(!history.length)return <div className="empty"><Database/><h3>No incidents yet</h3><p>Complete a diagnostic and it will appear here.</p></div>;return <div className="historyList">{history.map(h=><article key={h.id}><div><span>{h.category}</span><h3>{h.scenario}</h3><p>{h.cause}</p></div><div className="historyMeta"><b>{h.priority}</b><span>{h.confidence}% confidence</span><span>{h.completedAt}</span><button onClick={()=>onStart(h)}>Re-run</button></div></article>)}</div>}

function Analytics({history}){const resolved=history.length;const escalated=history.filter(x=>x.escalate).length;const avg=resolved?Math.round(history.reduce((a,x)=>a+x.confidence,0)/resolved):0;const cats=history.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{});const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);return <><div className="metricGrid"><Metric title="Incidents analyzed" value={resolved}/><Metric title="Avg. confidence" value={`${avg}%`}/><Metric title="Escalations" value={escalated}/><Metric title="Scenario coverage" value={scenarios.length}/></div><section className="analyticsPanel"><div><span className="eyebrow">ROOT CAUSE TRENDS</span><h3>Incident categories</h3></div>{sorted.length?sorted.map(([k,v])=><div className="barRow" key={k}><span>{k}</span><i><em style={{width:`${(v/Math.max(...sorted.map(x=>x[1])))*100}%`}}/></i><b>{v}</b></div>):<p className="muted">Run a few incidents to populate analytics.</p>}</section></>}
const Metric=({title,value})=><div className="metric"><span>{title}</span><strong>{value}</strong></div>;
export default App;
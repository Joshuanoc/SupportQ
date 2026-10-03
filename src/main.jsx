import React,{useEffect} from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { scenarios, categoryCounts } from './data.js';
import { sapScenarios } from './sapData.js';
import { extendedItScenarios, extendedSapScenarios } from './coverageScenarios.js';
import { routingScenarios } from './routingScenarios.js';
import './styles.css';
import './studio-ui.css';
import './professional-ui.css';
import './sap-flow.css';
import './reference-home.css';

[...sapScenarios,...extendedItScenarios,...extendedSapScenarios,...routingScenarios].forEach((scenario) => {
  if (!scenarios.some((existing) => existing.id === scenario.id)) {
    scenarios.push(scenario);
    categoryCounts[scenario.category] = (categoryCounts[scenario.category] || 0) + 1;
  }
});

function setNativeValue(element,value){
  if(!element||element.value===value)return;
  const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element),'value');
  descriptor?.set?.call(element,value);
  element.dispatchEvent(new Event('change',{bubbles:true}));
}

function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
function setHtml(el,value){if(el&&el.innerHTML!==value)el.innerHTML=value}

function UiBridge(){
  useEffect(()=>{
    let timer;
    let syncing=false;

    const sync=()=>{
      if(syncing)return;
      syncing=true;
      try{
        const isHome=Boolean(document.querySelector('.heroPanel'));
        document.body.classList.toggle('support-home-mode',isHome);

        if(isHome){
          const eyebrow=document.querySelector('.heroPanel .eyebrow');
          const title=document.querySelector('.heroPanel h2');
          const intro=document.querySelector('.heroPanel>div:first-child>p');
          const input=document.querySelector('.intakeBox textarea');
          const quick=document.querySelector('.sectionTitle h3');
          const quickTag=document.querySelector('.sectionTitle span');
          setText(eyebrow,'SUPPORTQ · IT + SAP SUPPORT');
          setHtml(title,'How can we <span>help?</span>');
          setText(intro,'Describe an IT or SAP issue and SupportQ will guide you through diagnosis, corrective actions, verification, and escalation when needed.');
          if(input&&input.placeholder!=='Describe your IT or SAP issue...')input.placeholder='Describe your IT or SAP issue...';
          setText(quick,'Common issues');
          setText(quickTag,'QUICK START');
        }

        const category=[...document.querySelectorAll('.incidentBanner span')].find(el=>el.textContent.trim().startsWith('SAP'));
        const isSap=Boolean(category);
        document.body.classList.toggle('sap-diagnostic-mode',isSap);
        if(!isSap)return;

        document.querySelectorAll('.sidePanel dl div').forEach(row=>{
          const label=row.querySelector('dt')?.textContent?.trim();
          if(['Device / OS','Environment','Scope'].includes(label)&&!row.classList.contains('sap-hide-context'))row.classList.add('sap-hide-context');
        });

        const card=document.querySelector('.triageCard');
        if(!card||card.dataset.sapProcessed==='true')return;
        card.dataset.sapProcessed='true';

        const fields=[...card.querySelectorAll('label')];
        const choose=(labelText,value)=>{
          const label=fields.find(x=>x.textContent.includes(labelText));
          setNativeValue(label?.querySelector('select'),value);
        };
        choose('Device','Other');
        choose('Operating system','Other / Unknown');
        choose('Environment','Cloud-only');
        choose('Who is affected?','Only me / one device');

        clearTimeout(timer);
        timer=setTimeout(()=>{
          const button=[...card.querySelectorAll('button')].find(b=>b.textContent.includes('Continue to diagnosis'));
          if(button&&!button.disabled)button.click();
        },120);
      }finally{
        syncing=false;
      }
    };

    const root=document.getElementById('root');
    const observer=new MutationObserver(()=>queueMicrotask(sync));
    if(root)observer.observe(root,{childList:true,subtree:true});
    sync();
    return()=>{observer.disconnect();clearTimeout(timer);document.body.classList.remove('sap-diagnostic-mode','support-home-mode')};
  },[]);
  return null;
}

class AppErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return{error}}
  componentDidCatch(error,info){console.error('SupportQ render error',error,info)}
  render(){
    if(this.state.error){
      return <main style={{fontFamily:'Inter,system-ui,sans-serif',maxWidth:760,margin:'80px auto',padding:'24px'}}><h1>SupportQ could not load.</h1><p>Please refresh the page. If the problem continues, the application logged a render error for diagnosis.</p><pre style={{whiteSpace:'pre-wrap',background:'#f6f8fc',padding:16,borderRadius:12}}>{String(this.state.error?.message||this.state.error)}</pre></main>
    }
    return this.props.children;
  }
}

function Root(){return <AppErrorBoundary><UiBridge/><App/></AppErrorBoundary>}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root/></React.StrictMode>
);
import React,{useEffect} from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { scenarios, categoryCounts } from './data.js';
import { sapScenarios } from './sapData.js';
import { extendedItScenarios, extendedSapScenarios } from './coverageScenarios.js';
import './styles.css';
import './studio-ui.css';
import './professional-ui.css';
import './sap-flow.css';
import './reference-home.css';

[...sapScenarios,...extendedItScenarios,...extendedSapScenarios].forEach((scenario) => {
  if (!scenarios.some((existing) => existing.id === scenario.id)) {
    scenarios.push(scenario);
    categoryCounts[scenario.category] = (categoryCounts[scenario.category] || 0) + 1;
  }
});

function setNativeValue(element,value){
  const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element),'value');
  descriptor?.set?.call(element,value);
  element.dispatchEvent(new Event('change',{bubbles:true}));
}

function UiBridge(){
  useEffect(()=>{
    let timer;
    const sync=()=>{
      const isHome=Boolean(document.querySelector('.heroPanel'));
      document.body.classList.toggle('support-home-mode',isHome);

      if(isHome){
        const eyebrow=document.querySelector('.heroPanel .eyebrow');
        const title=document.querySelector('.heroPanel h2');
        const intro=document.querySelector('.heroPanel>div:first-child>p');
        const input=document.querySelector('.intakeBox textarea');
        const quick=document.querySelector('.sectionTitle h3');
        const quickTag=document.querySelector('.sectionTitle span');
        if(eyebrow)eyebrow.textContent='SUPPORTQ · IT + SAP SUPPORT';
        if(title)title.innerHTML='How can we <span>help?</span>';
        if(intro)intro.textContent='Describe an IT or SAP issue and SupportQ will guide you through diagnosis, corrective actions, verification, and escalation when needed.';
        if(input)input.placeholder='Describe your IT or SAP issue...';
        if(quick)quick.textContent='Common issues';
        if(quickTag)quickTag.textContent='QUICK START';
      }

      const category=[...document.querySelectorAll('.incidentBanner span')].find(el=>el.textContent.trim().startsWith('SAP'));
      const isSap=Boolean(category);
      document.body.classList.toggle('sap-diagnostic-mode',isSap);
      if(!isSap)return;

      document.querySelectorAll('.sidePanel dl div').forEach(row=>{
        const label=row.querySelector('dt')?.textContent?.trim();
        if(['Device / OS','Environment','Scope'].includes(label))row.classList.add('sap-hide-context');
      });

      const card=document.querySelector('.triageCard');
      if(!card||card.dataset.sapProcessed==='true')return;
      card.dataset.sapProcessed='true';

      const fields=[...card.querySelectorAll('label')];
      const choose=(labelText,value)=>{
        const label=fields.find(x=>x.textContent.includes(labelText));
        const select=label?.querySelector('select');
        if(select)setNativeValue(select,value);
      };
      choose('Device','Other');
      choose('Operating system','Other / Unknown');
      choose('Environment','Cloud-only');
      choose('Who is affected?','Only me / one device');

      timer=setTimeout(()=>{
        const button=[...card.querySelectorAll('button')].find(b=>b.textContent.includes('Continue to diagnosis'));
        if(button&&!button.disabled)button.click();
      },120);
    };

    const observer=new MutationObserver(sync);
    observer.observe(document.getElementById('root'),{childList:true,subtree:true,attributes:true});
    sync();
    return()=>{observer.disconnect();clearTimeout(timer);document.body.classList.remove('sap-diagnostic-mode','support-home-mode')};
  },[]);
  return null;
}

function Root(){return <><UiBridge/><App/></>}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root/></React.StrictMode>
);
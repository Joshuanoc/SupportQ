import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { scenarios, categoryCounts } from './data.js';
import { sapScenarios } from './sapData.js';
import { extendedItScenarios, extendedSapScenarios } from './coverageScenarios.js';
import { routingScenarios } from './routingScenarios.js';
import './styles.css';
import './enterprise-ui.css';

[...sapScenarios,...extendedItScenarios,...extendedSapScenarios,...routingScenarios].forEach((scenario) => {
  if (!scenarios.some((existing) => existing.id === scenario.id)) {
    scenarios.push(scenario);
    categoryCounts[scenario.category] = (categoryCounts[scenario.category] || 0) + 1;
  }
});

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

createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><App/></AppErrorBoundary></React.StrictMode>
);

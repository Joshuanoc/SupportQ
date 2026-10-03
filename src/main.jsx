import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { scenarios, categoryCounts } from './data.js';
import { sapScenarios } from './sapData.js';
import './styles.css';
import './studio-ui.css';
import './sap-capability.css';

sapScenarios.forEach((scenario) => {
  if (!scenarios.some((existing) => existing.id === scenario.id)) {
    scenarios.push(scenario);
    categoryCounts[scenario.category] = (categoryCounts[scenario.category] || 0) + 1;
  }
});

function SupportQRoot(){
  return <>
    <section className="sapCapabilityBanner" aria-label="SAP troubleshooting capability">
      <div className="sapCapabilityInner">
        <div className="sapCapabilityBadge">SAP</div>
        <div className="sapCapabilityCopy">
          <strong>SupportQ can troubleshoot SAP MM & Procure-to-Pay errors</strong>
          <span>Describe the SAP error or choose a SAP scenario to diagnose likely causes, corrective actions, verification steps, and when escalation is required.</span>
        </div>
        <div className="sapCapabilityTags" aria-label="Supported SAP issue types">
          <span>PO / PR</span><span>MIGO / GR</span><span>MIRO</span><span>GR/IR</span><span>Vendor</span><span>Material</span><span>OBYC</span><span>Authorization</span><span>Ariba</span>
        </div>
      </div>
    </section>
    <App />
  </>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><SupportQRoot /></React.StrictMode>
);
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { scenarios, categoryCounts } from './data.js';
import { sapScenarios } from './sapData.js';
import './styles.css';
import './studio-ui.css';
import './professional-ui.css';

sapScenarios.forEach((scenario) => {
  if (!scenarios.some((existing) => existing.id === scenario.id)) {
    scenarios.push(scenario);
    categoryCounts[scenario.category] = (categoryCounts[scenario.category] || 0) + 1;
  }
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
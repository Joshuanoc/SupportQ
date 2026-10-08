import {scenarios as itScenarios} from './itData.js';
import {sapScenarios} from './sapData.js';
import {sapReversalScenarios} from './sapReversalData.js';

import { extendedItScenarios, extendedSapScenarios } from './coverageScenarios.js';
import { routingScenarios } from './routingScenarios.js';
import { sapFunctionalScenarios } from './sapFunctionalScenarios.js';

// One registry for both the application and tests; detailed flows take precedence.
export const scenarios = [...sapFunctionalScenarios, ...sapReversalScenarios, ...sapScenarios, ...itScenarios, ...extendedItScenarios, ...extendedSapScenarios, ...routingScenarios].filter((s,i,all)=>all.findIndex(x=>x.id===s.id)===i);
export const categoryCounts = scenarios.reduce((acc,s)=>{acc[s.category]=(acc[s.category]||0)+1;return acc;},{});

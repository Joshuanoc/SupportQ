import {scenarios as itScenarios} from './itData.js';
import {sapScenarios} from './sapData.js';
import {sapReversalScenarios} from './sapReversalData.js';

export const scenarios = [...sapReversalScenarios, ...sapScenarios, ...itScenarios];
export const categoryCounts = scenarios.reduce((acc,s)=>{acc[s.category]=(acc[s.category]||0)+1;return acc;},{});

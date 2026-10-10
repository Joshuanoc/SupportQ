import { classifyIssue } from './classifyIssue.js';

// Shared by the UI and regression tests so tests exercise the actual intake decision.
export function intakeDecision(text) {
  const matches = classifyIssue(text);
  if (!matches.length) return { type: 'clarify', suggestions: [], message: 'Which application or business process is affected? Describe what you tried and the exact error, without passwords or tokens.' };
  if (matches.length === 1 || matches[0].score >= matches[1].score + 3) {
    return { type: 'start', scenario: matches[0].s };
  }
  return { type: 'choose', suggestions: matches.slice(0, 3).map(x => x.s) };
}

export function initialPhase(scenario, context) {
  return scenario.category.startsWith('SAP') || scenario.severity === 'Critical' ||
    (context.os && context.environment && context.scope) ? 'diagnose' : 'triage';
}

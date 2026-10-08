export function diagnosticPath(scenario, step, choice){
 if(choice==='unknown')return {result:'More evidence required',cause:'The diagnostic check has not been confirmed; root cause remains unknown.',confidence:0,escalate:true,assignment:`${scenario.category} Support`,actions:['Capture the exact error and relevant document or object identifiers','Ask the responsible support team to verify this check before changing data or configuration']};
 const path=scenario.steps[step]?.[choice];
 if(!path)throw new Error('Invalid diagnostic answer');
 return path;
}
export function resolutionProgress(resolved, actionIndex, actionCount){
 if(resolved)return {phase:'resolved',actionIndex};
 return actionIndex<actionCount-1?{phase:'resolve',actionIndex:actionIndex+1}:{phase:'escalated',actionIndex};
}

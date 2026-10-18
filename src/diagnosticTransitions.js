export function diagnosticPath(scenario, step, choice){
 const current=scenario?.steps?.[step];
 if(!current)throw new Error('Invalid diagnostic step');
 if(choice==='unknown'){
  if(current.unknown)return current.unknown;
  if(step+1<scenario.steps.length)return {next:step+1,unknown:true};
  return {result:'More evidence required',cause:'The diagnostic check has not been confirmed; root cause remains unknown.',confidence:0,escalate:true,assignment:`${scenario.category} Support`,actions:['Capture the exact error and relevant document or object identifiers','Ask the responsible support team to verify this check before changing data or configuration']};
 }
 const path=current[choice];
 if(!path)throw new Error('Invalid diagnostic answer');
 return path;
}
export function resolutionProgress(resolved, actionIndex, actionCount){
 if(resolved)return {phase:'resolved',actionIndex};
 return actionIndex<actionCount-1?{phase:'resolve',actionIndex:actionIndex+1}:{phase:'escalated',actionIndex};
}

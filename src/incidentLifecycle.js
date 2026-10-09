export const incidentStates=Object.freeze(['Reported','In progress','Resolved','Escalated']);

const allowedTransitions=Object.freeze({
  Reported:Object.freeze(['In progress']),
  'In progress':Object.freeze(['Resolved','Escalated']),
  Resolved:Object.freeze([]),
  Escalated:Object.freeze([]),
});

function normalizedTimestamp(value){
  const milliseconds=Date.parse(value);
  return Number.isFinite(milliseconds)?new Date(milliseconds).toISOString():null;
}

function invalid(error,lifecycle=[]){
  return {ok:false,error,lifecycle};
}

export function validateIncidentLifecycle(lifecycle){
  if(!Array.isArray(lifecycle)||lifecycle.length===0)return invalid('Lifecycle must contain at least one event.');
  let previousTime=-Infinity;
  for(let index=0;index<lifecycle.length;index+=1){
    const event=lifecycle[index];
    if(!event||!incidentStates.includes(event.status))return invalid('Lifecycle contains an unknown status.',lifecycle);
    const at=normalizedTimestamp(event.at);
    if(!at||event.at!==at)return invalid('Lifecycle timestamps must use canonical ISO 8601 UTC format.',lifecycle);
    const time=Date.parse(at);
    if(time<previousTime)return invalid('Lifecycle timestamps must be chronological.',lifecycle);
    if(index===0&&event.status!=='Reported')return invalid('Lifecycle must begin with Reported.',lifecycle);
    if(index>0&&!allowedTransitions[lifecycle[index-1].status]?.includes(event.status))return invalid('Lifecycle contains an invalid transition.',lifecycle);
    previousTime=time;
  }
  return {ok:true,lifecycle};
}

export function startIncidentLifecycle(at=new Date().toISOString()){
  const timestamp=normalizedTimestamp(at);
  if(!timestamp)return invalid('Incident start timestamp is invalid.');
  return {
    ok:true,
    lifecycle:[
      {status:'Reported',at:timestamp},
      {status:'In progress',at:timestamp},
    ],
  };
}

export function transitionIncident(lifecycle,status,at=new Date().toISOString()){
  const validation=validateIncidentLifecycle(lifecycle);
  if(!validation.ok)return validation;
  if(!incidentStates.includes(status))return invalid('Target status is unknown.',lifecycle);
  const current=lifecycle.at(-1);
  if(!allowedTransitions[current.status].includes(status))return invalid('Invalid incident transition: '+current.status+' to '+status+'.',lifecycle);
  const timestamp=normalizedTimestamp(at);
  if(!timestamp)return invalid('Transition timestamp is invalid.',lifecycle);
  if(Date.parse(timestamp)<Date.parse(current.at))return invalid('Transition timestamp cannot precede the current state.',lifecycle);
  return {ok:true,lifecycle:[...lifecycle,{status,at:timestamp}]};
}

export function completeIncidentLifecycle(lifecycle,status,at=new Date().toISOString()){
  if(status!=='Resolved'&&status!=='Escalated')return invalid('Completion status must be Resolved or Escalated.',lifecycle);
  return transitionIncident(lifecycle,status,at);
}

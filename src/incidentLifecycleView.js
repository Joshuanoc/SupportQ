import React from 'react';

export function IncidentLifecycleTimeline({lifecycle=[]}){
  if(!Array.isArray(lifecycle)||lifecycle.length===0)return null;
  return React.createElement(
    'details',
    {className:'incidentLifecycle'},
    React.createElement('summary',null,'Lifecycle'),
    React.createElement(
      'ol',
      {'aria-label':'Incident lifecycle'},
      ...lifecycle.map((event,index)=>React.createElement(
        'li',
        {key:event.status+'-'+event.at+'-'+index},
        React.createElement('span',null,event.status),
        ' ',
        React.createElement('time',{dateTime:event.at},new Date(event.at).toLocaleString()),
      )),
    ),
  );
}

import React from'react';

export function boundedProgress(value){
 if(typeof value!=='number'||!Number.isFinite(value))return 0;
 return Math.max(0,Math.min(100,Math.round(value)));
}

export function DiagnosticProgress({value,label='Diagnostic progress'}){
 const current=boundedProgress(value);
 return React.createElement('div',{
  className:'progress',
  role:'progressbar',
  'aria-label':label,
  'aria-valuemin':0,
  'aria-valuemax':100,
  'aria-valuenow':current
 },React.createElement('i',{'aria-hidden':true,style:{width:`${current}%`}}));
}

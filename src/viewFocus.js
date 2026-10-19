export const VIEW_HEADING_ID='view-heading';

export function headingForView(view,scenarioTitle=''){
 if(view==='diagnose')return typeof scenarioTitle==='string'&&scenarioTitle.trim()?scenarioTitle:'Diagnosis';
 if(view==='scenarios')return'Scenario Library';
 if(view==='history')return'Incident History';
 if(view==='analytics')return'Support Analytics';
 return'Support workspace';
}

export function focusViewHeading(doc=globalThis.document){
 try{
  const heading=doc?.getElementById?.(VIEW_HEADING_ID);
  if(typeof heading?.focus!=='function')return false;
  heading.focus({preventScroll:true});
  return true;
 }catch{return false;}
}

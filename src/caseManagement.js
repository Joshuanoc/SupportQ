const sapPattern=/^SAP\b/i;

export function verificationPlan(scenario={}){
 const id=scenario.id||'', cat=scenario.category||'';
 if(id==='sap-material-document-reversal') return [
  'Confirm SAP created the reversal/cancellation document',
  'Confirm the original material document shows the reversal relationship',
  'Verify material stock quantity and stock type are correct',
  'Verify FI/accounting impact where the movement is valuated',
  'Confirm no unintended follow-on document or business-process impact'
 ];
 if(sapPattern.test(cat)) return [
  'Repeat the failed SAP business transaction using the approved process',
  'Confirm the original SAP error no longer occurs',
  'Verify document/status/master-data results are correct',
  'Confirm downstream document flow or integration is healthy where applicable',
  'Confirm the affected business process can continue'
 ];
 return [
  'Repeat the original user action',
  'Confirm the original symptom no longer occurs',
  'Verify the dependent service/application still works',
  'Confirm the user can continue normal work'
 ];
}

export function escalationPackage({scenario={},reportedIssue='',context={},sapContext={},answers=[],actions=[],cause='',priority='',severity=''}) {
 const sap=sapPattern.test(scenario.category||'');
 return {
  assignmentGroup: sap?`${scenario.category} Support`:'IT Support',
  issue: reportedIssue||scenario.title||'',
  category: scenario.category||'',
  priority: priority||scenario.priority||'',
  severity: severity||scenario.severity||'',
  businessImpact: sap?(sapContext.impact||'Not specified'):(context.impact||'Not specified'),
  system: sap?sapContext.system:(context.environment||''),
  transaction: sap?sapContext.transaction:'',
  documentNumber: sap?sapContext.documentNumber:'',
  sapMessage: sap?[sapContext.messageClass,sapContext.messageNumber,sapContext.message].filter(Boolean).join(' '):'',
  likelyCause:cause||'Not confirmed',
  checksPerformed:answers.map(a=>`${a.question}: ${a.answer}`),
  actionsAttempted:actions.map(a=>`${a.action}: ${a.outcome}`)
 };
}

export function formatEscalationTicket(pkg){
 return [
  `Assignment group: ${pkg.assignmentGroup}`,`Issue: ${pkg.issue}`,`Category: ${pkg.category}`,
  `Priority / Severity: ${pkg.priority} / ${pkg.severity}`,`Business impact: ${pkg.businessImpact}`,
  pkg.system&&`System: ${pkg.system}`,pkg.transaction&&`Transaction: ${pkg.transaction}`,
  pkg.documentNumber&&`Document: ${pkg.documentNumber}`,pkg.sapMessage&&`SAP message: ${pkg.sapMessage}`,
  `Likely cause: ${pkg.likelyCause}`,'Checks performed:',...(pkg.checksPerformed.length?pkg.checksPerformed.map(x=>`- ${x}`):['- None recorded']),
  'Actions attempted:',...(pkg.actionsAttempted.length?pkg.actionsAttempted.map(x=>`- ${x}`):['- None recorded'])
 ].filter(Boolean).join('\n');
}

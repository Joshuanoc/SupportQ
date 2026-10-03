const make=(id,category,title,symptoms,cause,actions)=>({
 id,category,title,icon:'AppWindow',priority:'P3',severity:'Medium',symptoms,
 hypotheses:[[cause,80],['Configuration or authorization issue',20]],
 steps:[{q:'Can you capture the exact error message or status shown by the system?',help:'The exact message confirms the correct troubleshooting path.',yes:{result:title,cause,confidence:92,actions,escalate:false},no:{result:`${title} needs exact evidence`,cause:'More evidence is required before making a safe change.',confidence:70,actions:[...actions,'Capture the exact message and relevant log/status before escalation'],escalate:true}}]
});

export const routingScenarios=[
 make('it-azure-specific','Cloud','Azure PIM role activation issue',['PIM role not active','PIM role inactive','Azure PIM activation failed'],'Azure RBAC, PIM, or resource-scope authorization is preventing access.',['Verify the signed-in tenant and account','Check assigned RBAC role and scope','Activate the approved PIM role if required','Use the normal access-request process for missing permissions']),
 make('sap-printer-output-specific','SAP Basis','SAP printer/output generation failure',['Printer output not generated from SAP','Printer output not generated from SAP','Printer output not generated from SAP','Printer output not generated from SAP','SAP printer output','SAP spool output'],'SAP spool, output device, form, or output determination is preventing document output.',['Capture spool request/output type and timestamp','Check SP01/spool status if authorized','Verify output device and form/output determination','Escalate Basis/form configuration with evidence'])
];

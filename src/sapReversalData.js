export const sapReversalScenarios = [
  {
    id:'sap-material-document-reversal',
    category:'SAP MM',
    title:'Material document cannot be cancelled / reversed',
    icon:'HardDrive',
    priority:'P2',
    severity:'High',
    symptoms:[
      'material document cannot be cancelled',
      'material document cannot be canceled',
      'material document cannot be reversed',
      'cancel material document',
      'reverse material document',
      'MIGO reversal',
      'MBST reversal',
      'cancel goods receipt',
      'reverse goods receipt',
      'movement 102',
      'movement 162',
      'movement 344'
    ],
    hypotheses:[
      ['Subsequent document prevents reversal',30],
      ['Stock or quantity no longer available',25],
      ['Posting period closed',15],
      ['Document already reversed',10],
      ['Authorization issue',10],
      ['Account assignment / WBS validation',10]
    ],
    steps:[
      {
        q:'Does SAP show that the material document is already cancelled/reversed, or does document history show a reversal document?',
        help:'First confirm whether the original material document has already been reversed so we do not attempt a duplicate cancellation.',
        yes:{
          result:'Material document already reversed',
          cause:'A reversal document already exists for the original posting.',
          confidence:95,
          actions:['Review the material document history and reversal document number','Verify the reversal movement and posting date','Do not create a duplicate reversal','Use the reversal document as the audit reference'],
          escalate:false
        },
        no:{next:1,boost:{'Document already reversed':-10}}
      },
      {
        q:'Is there a subsequent document or downstream posting after this material document, such as an invoice receipt, transfer, consumption, delivery, or another goods movement?',
        help:'SAP can block reversal when later business documents depend on the original posting.',
        yes:{
          result:'Subsequent document prevents reversal',
          cause:'A later business transaction depends on the material document and must be handled in the correct reverse sequence.',
          confidence:90,
          actions:['Review PO/material document history','Identify the exact downstream document created after the posting','Reverse or correct downstream documents only through the approved business process','Retry the material document reversal after dependencies are cleared'],
          escalate:false
        },
        no:{next:2,boost:{'Subsequent document prevents reversal':-15}}
      },
      {
        q:'Is the stock quantity created by the original movement still available in the required plant, storage location, batch, special stock, and stock type?',
        help:'A reversal can fail when the original stock has since been consumed, transferred, issued, or changed to another stock type.',
        yes:{next:3,boost:{'Stock or quantity no longer available':-15}},
        no:{
          result:'Original stock state is no longer available',
          cause:'The quantity or stock type needed to reverse the original movement is no longer available in the original stock context.',
          confidence:90,
          actions:['Check current stock and material document history','Identify subsequent consumption or transfer postings','Restore/correct the business document flow only if operationally valid and authorized','Retry reversal after the stock dependency is resolved'],
          escalate:false
        }
      },
      {
        q:'Does the SAP error mention a closed posting period, posting date, MM period, or FI period?',
        help:'Material document cancellation posts a new reversal document and therefore requires an open posting period.',
        yes:{
          result:'Posting period blocks reversal',
          cause:'The reversal posting date is not allowed in the relevant MM or FI posting period.',
          confidence:92,
          actions:['Confirm the intended reversal posting date','Check the applicable MM and FI posting periods','Use an allowed posting date only if business policy permits','Request period handling from authorized Finance/MM support when required'],
          escalate:true
        },
        no:{next:4,boost:{'Posting period closed':-10}}
      },
      {
        q:'Does the error mention authorization, missing authorization, SU53, or that you are not authorized for the reversal action?',
        help:'Separates an access-control problem from a logistics or accounting validation.',
        yes:{
          result:'Authorization blocks material document reversal',
          cause:'The user lacks authorization for the transaction, movement type, plant, or organizational level required for reversal.',
          confidence:93,
          actions:['Capture the exact authorization error','Run the approved authorization check such as SU53 immediately after the failure','Request least-privilege access through the approved process','Retest after authorized access correction'],
          escalate:true
        },
        no:{next:5,boost:{'Authorization issue':-10}}
      },
      {
        q:'Does the error reference WBS, account assignment, cost object, valuation/account determination, or an accounting object?',
        help:'Project/account-assigned material documents may fail reversal when the referenced object status or accounting setup has changed.',
        yes:{
          result:'Account assignment or WBS validation blocks reversal',
          cause:'The reversal cannot repost the accounting impact because the original account assignment or project object is no longer valid for posting.',
          confidence:86,
          actions:['Capture the exact SAP error and message number','Review the original PO/material document account assignment','Check WBS/project status and posting validity','Engage SAP MM/PS/FI support for controlled correction if the object cannot accept reversal'],
          escalate:true
        },
        no:{next:6,boost:{'Account assignment / WBS validation':-10}}
      },
      {
        q:'Are you reversing the correct original material document and fiscal year with the appropriate reversal process for its movement type?',
        help:'Typical pairs include 101→102, 161→162 and 343→344, but the original business process and document flow must always be verified.',
        yes:{
          result:'Reversal requires exact SAP error analysis',
          cause:'The common document-flow, stock, period, authorization and account-assignment blockers were not confirmed.',
          confidence:65,
          actions:['Capture the complete SAP error text and message class/number','Record original material document, fiscal year, movement type, plant and posting date','Review the document flow and material document details','Escalate with evidence to SAP MM support if the message remains unexplained'],
          escalate:true
        },
        no:{
          result:'Incorrect reversal reference or process',
          cause:'The selected material document, fiscal year, or reversal process does not match the original goods movement.',
          confidence:88,
          actions:['Confirm the original material document and fiscal year','Identify the original movement type','Use the corresponding approved cancellation/reversal process','Retry using the correct reference document'],
          escalate:false
        }
      }
    ]
  }
];

import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios as itScenarios } from '../src/data.js';
import { sapScenarios } from '../src/sapData.js';
import { extendedItScenarios, extendedSapScenarios } from '../src/coverageScenarios.js';

const scenarios=[...itScenarios,...sapScenarios,...extendedItScenarios,...extendedSapScenarios];
const keywordMap={
 'wifi-no-internet':['wifi','wi-fi','internet','dns','website','websites','connected no internet','network'],
 'vpn-failure':['vpn','remote access','tunnel','internal resource'],
 'locked-account':['locked','password','sign in','login','mfa','account','authentication','sso'],
 'outlook-send':['outlook','email','mail','outbox','send email','exchange'],
 'slow-pc':['slow','lag','performance','cpu','memory','windows slow','computer slow','pc slow'],
 'printer-offline':['printer','printing','print','spooler'],
 'phishing':['phishing','suspicious email','scam','malware','mfa prompt','clicked link'],
 'onedrive-sync':['onedrive','sync','files not syncing'],
 'app-crash':['app crash','application crash','crashes',"won't open",'will not open','software'],
 'camera-teams':['teams camera','camera','webcam','video'],
 'azure-access':['azure','rbac','403','cloud access','permission denied'],
 'disk-full':['disk full','storage full','low disk','drive full','space']
};

function classify(text){
 const q=text.toLowerCase().trim();
 return scenarios.map(s=>{
  let score=0;
  (keywordMap[s.id]||[]).forEach(k=>{if(q.includes(k))score+=k.includes(' ')?4:2});
  if(q.includes(s.category.toLowerCase()))score+=2;
  s.symptoms.forEach(x=>{if(q.includes(x.toLowerCase()))score+=3});
  return{s,score};
 }).sort((a,b)=>b.score-a.score).filter(x=>x.score>0);
}

const isSap=s=>s.category.startsWith('SAP');

const itCases=[
'Wi-Fi connected but no internet','Laptop cannot connect to office Wi-Fi','DNS lookup fails for websites','Internet works on phone but not laptop','No IP address from DHCP','VPN will not connect','VPN connects but internal resources unavailable','Remote access tunnel keeps dropping','Cannot reach company network from home','VPN authentication fails after password change','User account locked','Password reset required','MFA code not received','SSO login fails','Account says invalid credentials','Outlook cannot send email','Email stuck in Outbox','Outlook keeps asking for password','Exchange mailbox not syncing','Email delivery delayed','Computer is very slow','High CPU usage','Memory usage is constantly high','Windows freezes randomly','Laptop takes too long to start','Printer shows offline','Print jobs stuck in queue','Cannot print to network printer','Printer spooler keeps stopping','Wrong printer is selected','Suspicious phishing email received','Clicked a phishing link','Repeated MFA prompts not initiated by user','Possible malware infection','Browser redirects to suspicious sites','OneDrive not syncing files','OneDrive stuck on processing changes','Files missing from OneDrive','OneDrive sign-in error','Cloud files show sync conflict','Application crashes at launch','Software will not open','Application closes unexpectedly','Program freezes during use','Application update caused crashes','Teams camera not working','Webcam not detected','Camera is black in Teams','Microphone works but camera does not','Camera permission denied','Azure resource access denied','Azure 403 authorization error','Missing Azure RBAC permission','Cannot access Azure storage account','PIM role not active','System disk critically full','C drive has no free space','Low disk warning','Temporary files consuming disk','Logs filling system drive','Bluetooth device will not pair','USB device not recognized','External monitor not detected','Keyboard stopped working','Mouse disconnects randomly','Blue screen error on Windows','Windows update failed','Windows stuck on restart','PC will not boot','BitLocker recovery screen appears','RDP connection fails','Remote Desktop black screen','Domain join fails','Cannot access shared network drive','File share permission denied','Mapped drive disappeared','Browser cannot open one specific site','Chrome keeps crashing','Certificate warning in browser','Proxy settings block internet','Firewall blocks application traffic','Teams microphone not working','Teams calls keep dropping','Zoom audio not working','Cannot install approved software','Software installation fails with permissions error','Windows service will not start','Device driver error in Device Manager','Laptop battery not charging','Docking station not detected','Ethernet says unidentified network','Network adapter missing','DNS cache appears corrupted','Default gateway unreachable','Office application activation failed','Excel file will not open','PowerPoint crashes','Cannot open PDF file','User profile is corrupted','Local admin rights missing'
];

const sapCases=[
'MIGO goods receipt cannot be posted','Cannot cancel material document in MIGO','Material document reversal is blocked','Posting period is closed for goods movement','Movement type is not allowed','Purchase order not released','PO approval workflow is stuck','Release strategy not triggered for purchase order','Approver cannot release purchase order','Purchase order blocked by authorization error','Purchase requisition source not determined','PR cannot find source of supply','Source list missing for material','Purchasing info record missing','Contract source is not selected','MIRO invoice blocked for payment','MIRO quantity variance','MIRO price variance','Invoice cannot be posted because GR is missing','Duplicate vendor invoice detected','GR IR balance not clearing','GR IR quantity mismatch','GR IR value difference remains open','Missing invoice receipt in PO history','Missing goods receipt in PO history','Vendor blocked for purchasing','Business partner blocked','Supplier purchasing organization data missing','Vendor master incomplete','Partner function missing for vendor','Material master missing purchasing view','Material master missing accounting view','Valuation class missing','Unit of measure conversion error','Material not extended to plant','Automatic account determination error','OBYC account determination failed','G L account cannot be determined','Valuation class not linked correctly','Transaction key configuration error','User not authorized for MIGO','User not authorized for MIRO','User not authorized to release PO','SU53 shows missing authorization','SAP authorization check failed','Ariba purchase order integration failed','Ariba supplier sync failed','Ariba requisition not reaching S4','Ariba invoice integration error','CIG integration message failed','IDoc stuck in status 51','IDoc not processed','RFC destination connection failed','ALE distribution error','Inbound IDoc posting failed','SAP GUI logon failed','SAP session terminated unexpectedly','SAP short dump in ST22','Background job cancelled','SM37 job failed','Spool request error','Printer output not generated from SAP','Smart Form output failed','Adobe form not generated','Output determination failed','Sales order cannot be created','Delivery cannot be created','Billing document blocked','Pricing condition missing in sales order','ATP check gives no confirmed quantity','Customer master data incomplete','Credit block on sales order','PGI cannot be posted','Delivery quantity mismatch','SD account determination error','FI document cannot be posted','Posting period closed in FI','Balance not zero in accounting document','Cost center blocked','Profit center missing','Tax code not valid','Vendor payment proposal error','F110 payment run failed','Bank determination missing','Asset posting error','Internal order budget exceeded','Production order cannot be released','Material shortage in production order','MRP not creating purchase requisition','Planned order not converting','BOM explosion error','Routing missing for production order','Warehouse transfer order cannot be confirmed','Storage bin does not exist','EWM delivery not distributed','Handling unit error','Batch determination failed','Serial number error','Stock type mismatch','Quality inspection lot blocking stock'
];

test('audit contains exactly top 100 IT and 100 SAP problems',()=>{
 assert.equal(itCases.length,100);
 assert.equal(sapCases.length,100);
});

test('top 100 IT problems are recognized as IT scenarios',()=>{
 const unmatched=[];const misrouted=[];
 for(const prompt of itCases){const matches=classify(prompt);if(!matches.length)unmatched.push(prompt);else if(isSap(matches[0].s))misrouted.push(`${prompt} -> ${matches[0].s.title}`)}
 assert.equal(unmatched.length,0,`Unmatched IT (${unmatched.length}/100):\n${unmatched.join('\n')}`);
 assert.equal(misrouted.length,0,`Misrouted IT (${misrouted.length}/100):\n${misrouted.join('\n')}`);
});

test('top 100 SAP problems are recognized as SAP scenarios',()=>{
 const unmatched=[];const misrouted=[];
 for(const prompt of sapCases){const matches=classify(prompt);if(!matches.length)unmatched.push(prompt);else if(!isSap(matches[0].s))misrouted.push(`${prompt} -> ${matches[0].s.category}: ${matches[0].s.title}`)}
 assert.equal(unmatched.length,0,`Unmatched SAP (${unmatched.length}/100):\n${unmatched.join('\n')}`);
 assert.equal(misrouted.length,0,`Misrouted SAP (${misrouted.length}/100):\n${misrouted.join('\n')}`);
});

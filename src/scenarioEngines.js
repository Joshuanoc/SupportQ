const c=(label,value,next,extra={})=>({label,value,next,...extra});
const act=(action,prompt,expected,outcomes)=>({type:'action',action,prompt,expected,outcomes});
const choice=(prompt,why,options)=>({type:'choice',prompt,why,options});
const text=(prompt,why,help,next='interpret')=>({type:'text',prompt,why,help,next});

export const scenarioProfiles={
 'vpn-failure':{
  hypotheses:[['Credential/MFA issue',30],['VPN client issue',25],['Network path issue',20],['Firewall/security agent',15],['Service outage',10]],
  start:'internet',
  nodes:{
   internet:choice('Does normal internet work before connecting the VPN?','VPN cannot work reliably until the underlying connection is healthy.',[
    c('Yes','yes','auth',{boosts:{'Network path issue':-10}}),c('No','no','base_network',{boosts:{'Network path issue':30}}),c('Intermittent','intermittent','base_network')
   ]),
   base_network:act('Verify base internet connection','Reconnect Wi‑Fi/Ethernet and confirm a normal website loads without VPN.','Normal internet should work before continuing.',[
    c('Internet works now','ok','auth'),c('Still no internet','fail',null,{escalate:{team:'Network Support',reason:'Underlying internet connectivity is unavailable'}})
   ]),
   auth:choice('When you connect, are your username/password and MFA accepted?','This separates identity failure from tunnel creation.',[
    c('Yes','yes','tunnel',{boosts:{'Credential/MFA issue':-20,'VPN client issue':10}}),c('No','no','auth_error',{boosts:{'Credential/MFA issue':35}}),c('I get a specific error','error','vpn_error')
   ]),
   auth_error:act('Validate MFA / account state','Verify the account is active, password is current, and retry the expected MFA challenge.','Authentication should complete without lockout or unexpected MFA.',[
    c('Authentication works','ok','tunnel'),c('Still rejected','fail','vpn_error'),c('Account locked/disabled','locked',null,{escalate:{team:'Identity Support',reason:'Account state requires identity administration'}})
   ]),
   tunnel:choice('Does the VPN show Connected?','A connected tunnel with unusable resources is a routing/DNS/access problem, not a connection problem.',[
    c('Yes','yes','internal_test'),c('No','no','client_restart',{boosts:{'VPN client issue':25}}),c('Connects then drops','drops','client_restart')
   ]),
   client_restart:act('Restart VPN client','Fully exit the VPN client, reopen it, reconnect and complete MFA.','The tunnel should remain connected.',[
    c('Connected and stable','ok','internal_test'),c('Still fails','fail','client_version'),c('Different error','error','vpn_error')
   ]),
   client_version:act('Check client version','Compare the installed VPN client version with the organization-approved version.','The client should be current and supported.',[
    c('Updated/fixed','ok','internal_test'),c('Already current','current','vpn_error'),c('Admin required','admin',null,{escalate:{team:'Desktop Support',reason:'VPN client repair/update requires admin access'}})
   ]),
   internal_test:choice('Can you reach an internal IP address but not an internal hostname?','That pattern strongly indicates VPN DNS rather than routing.',[
    c('Yes','yes','vpn_dns',{boosts:{'Network path issue':10}}),c('No, neither works','no','route_check',{boosts:{'Network path issue':20}}),c('Both work','both',null,{resolve:{cause:'VPN tunnel and internal access verified',confidence:88}})
   ]),
   vpn_dns:act('Flush DNS cache','Flush local DNS, reconnect VPN, then test the internal hostname again.','Internal names should resolve through corporate DNS.',[
    c('Resolved','ok',null,{resolve:{cause:'Stale or incorrect VPN DNS state',confidence:94}}),c('Still fails','fail','split_dns')
   ]),
   split_dns:act('Verify DNS server settings','Check which DNS servers are assigned while VPN is connected.','Corporate DNS/split-DNS should be assigned as designed.',[
    c('Corrected and resolved','ok',null,{resolve:{cause:'VPN DNS assignment issue',confidence:96}}),c('Still wrong/unreachable','fail',null,{escalate:{team:'Network/VPN Support',reason:'Corporate VPN DNS assignment is unavailable or misconfigured'}})
   ]),
   route_check:act('Check route table','Inspect routes while VPN is connected and verify an internal-network route exists.','Internal destinations should have a route through the VPN adapter.',[
    c('Missing route','missing',null,{escalate:{team:'Network/VPN Support',reason:'Required VPN route is missing'}}),c('Route exists but access denied','denied',null,{escalate:{team:'Network/Identity Support',reason:'VPN route exists; ACL/group policy likely blocks access'}}),c('Works after reconnect','ok',null,{resolve:{cause:'Stale VPN route/tunnel state',confidence:91}})
   ]),
   vpn_error:text('Paste the exact VPN error message or code.','Exact client/gateway wording is the fastest route to the failing layer.',{windows:['Copy the full VPN error dialog or code.'],macos:['Copy the full VPN error dialog or code.']})
  }
 },
 'locked-account':{
  hypotheses:[['Account lockout',35],['Expired password',25],['MFA issue',20],['Disabled account',10],['SSO outage',10]],start:'scope',
  nodes:{
   scope:choice('Can the user sign in to any other company service?','This tells us whether the failure is account-wide or application-specific.',[
    c('Nothing works','none','account_state',{boosts:{'Account lockout':20,'Expired password':15}}),c('Some services work','some','mfa_or_app'),c('Not sure','unknown','account_state')
   ]),
   account_state:choice('Does the identity portal/admin tool show Locked, Disabled, or Password expired?','The authoritative account state is the highest-value check.',[
    c('Locked','locked','unlock'),c('Disabled','disabled',null,{escalate:{team:'Identity/HR',reason:'Account is administratively disabled'}}),c('Password expired','expired','password'),c('No','no','mfa_or_app')
   ]),
   unlock:act('Unlock account','Verify identity, unlock using the approved identity tool, then test one sign-in.','The account should remain unlocked after a correct sign-in.',[
    c('Resolved','ok',null,{resolve:{cause:'Account lockout',confidence:98}}),c('Locks again','again','stale_creds'),c('Cannot unlock','admin',null,{escalate:{team:'Identity Support',reason:'Account unlock requires identity administration'}})
   ]),
   password:act('Reset/update password','Use the approved password reset process, then update saved credentials.','The new password should authenticate consistently.',[
    c('Resolved','ok',null,{resolve:{cause:'Expired or invalid password',confidence:97}}),c('Still fails','fail','mfa_or_app')
   ]),
   stale_creds:act('Remove stale saved credentials','Update old passwords stored in VPN, Outlook, mobile mail, mapped drives or credential manager.','The account should stop relocking after cached credentials are removed.',[
    c('Resolved','ok',null,{resolve:{cause:'Stale saved credentials repeatedly locking account',confidence:96}}),c('Still locks','fail','signin_logs')
   ]),
   mfa_or_app:choice('Is the failure happening at MFA, SSO redirect, or after sign-in inside one app?','This separates factor, federation and application permission issues.',[
    c('MFA','mfa','mfa'),c('SSO redirect','sso','signin_logs'),c('One app only','app','signin_logs'),c('Not sure','unknown','signin_logs')
   ]),
   mfa:act('Validate MFA method','Retry only an expected MFA challenge and confirm the registered factor/device is available.','Expected MFA should complete successfully.',[
    c('Resolved','ok',null,{resolve:{cause:'MFA factor/session issue',confidence:92}}),c('Unexpected prompts','unexpected',null,{escalate:{team:'Security/Identity',reason:'Unexpected MFA prompts may indicate account compromise'}}),c('Still fails','fail','signin_logs')
   ]),
   signin_logs:text('Paste the most recent sign-in error, failure reason, or code from the identity portal.','The sign-in log usually identifies Conditional Access, MFA, bad password, disabled user or application policy.',{windows:['Copy the failure reason/error code from the sign-in log.'],macos:['Copy the failure reason/error code from the sign-in log.']})
  }
 },
 'outlook-send':{
  hypotheses:[['Outlook profile/cache',28],['Mailbox quota',20],['Authentication',18],['Connectivity',17],['Service issue',17]],start:'web',
  nodes:{
   web:choice('Can you send the same test email from Outlook on the web?','This immediately separates the desktop client from Exchange Online/mailbox issues.',[
    c('Yes','yes','restart_outlook',{boosts:{'Outlook profile/cache':30,'Service issue':-15}}),c('No','no','quota',{boosts:{'Mailbox quota':10,'Service issue':15}}),c('Cannot sign in','signin','reauth')
   ]),
   restart_outlook:act('Restart Outlook','Close Outlook fully, reopen it, then send a small test email.','The message should leave Outbox and appear in Sent Items.',[
    c('Resolved','ok',null,{resolve:{cause:'Stuck Outlook client/session',confidence:90}}),c('Still stuck','fail','safe_mode')
   ]),
   safe_mode:act('Run Outlook in safe mode','Start Outlook without normal add-ins and test sending.','If sending works in safe mode, an add-in is likely involved.',[
    c('Works in safe mode','ok','addins'),c('Still fails','fail','profile'),c('Cannot start safe mode','error','outlook_error')
   ]),
   addins:act('Check add-ins','Disable non-essential third-party add-ins one at a time and retest.','Sending should work after the problematic add-in is disabled.',[
    c('Resolved','ok',null,{resolve:{cause:'Outlook add-in conflict',confidence:94}}),c('Still fails','fail','profile')
   ]),
   profile:act('Repair/recreate Outlook profile','Create or repair the local Outlook profile after confirming webmail works.','The new profile should sync and send normally.',[
    c('Resolved','ok',null,{resolve:{cause:'Corrupt Outlook profile/cache',confidence:95}}),c('Still fails','fail','outlook_error'),c('Admin required','admin',null,{escalate:{team:'Microsoft 365/Desktop Support',reason:'Profile repair requires administrative support'}})
   ]),
   quota:choice('Is the mailbox at or near its storage quota?','A full mailbox can block send/receive independently of the desktop client.',[
    c('Yes','yes','mailbox_cleanup',{boosts:{'Mailbox quota':40}}),c('No','no','multi_user'),c('Not sure','unknown','multi_user')
   ]),
   mailbox_cleanup:act('Archive/delete mail','Reduce mailbox usage according to retention policy, then retry sending.','Mailbox usage should fall below quota and sending should resume.',[
    c('Resolved','ok',null,{resolve:{cause:'Mailbox quota exceeded',confidence:98}}),c('Still fails','fail','multi_user')
   ]),
   multi_user:choice('Are other users unable to send mail right now?','Multi-user impact suggests a service/tenant incident.',[
    c('Yes','yes','service_health',{boosts:{'Service issue':40}}),c('No','no','reauth'),c('Not sure','unknown','reauth')
   ]),
   service_health:act('Check Microsoft 365 service health','Check Exchange Online advisories matching the symptom.','An active advisory should explain broad impact.',[
    c('Active incident found','incident',null,{escalate:{team:'Microsoft 365 Operations',reason:'Active Exchange Online service incident'}}),c('No incident','none','reauth')
   ]),
   reauth:act('Reauthenticate account','Sign out/in or refresh the Outlook/Microsoft 365 session, then retest.','Authentication should refresh and sending should work.',[
    c('Resolved','ok',null,{resolve:{cause:'Expired or stale authentication session',confidence:90}}),c('Still fails','fail','outlook_error')
   ]),
   outlook_error:text('Paste the exact Outlook error, NDR/bounce code, or message from the Send/Receive window.','Error codes distinguish transport, authentication, policy and mailbox-specific failures.',{windows:['Copy the exact error code or NDR text.'],macos:['Copy the exact error code or NDR text.']})
  }
 },
 'slow-pc':{
  hypotheses:[['High CPU/memory',30],['Low disk space',22],['Startup/background apps',18],['Disk health',15],['Update/security activity',15]],start:'resources',
  nodes:{
   resources:text('Open Task Manager/Activity Monitor and paste the top CPU and memory usage, or describe what is above 80–90%.','Resource data is more useful than guessing at “slowness.”',{windows:['Press Ctrl + Shift + Esc','Sort Processes by CPU, then Memory','Copy the top few processes and percentages'],macos:['Open Activity Monitor','Check CPU and Memory tabs','Copy the top few processes']}),
   disk:choice('Is the system drive above 90% used or nearly full?','Low free space can slow paging, updates and applications.',[
    c('Yes','yes','cleanup',{boosts:{'Low disk space':40}}),c('No','no','restart'),c('Not sure','unknown','disk_check')
   ]),
   disk_check:act('Review largest folders','Use the OS storage view to check free space and largest categories.','You should know whether storage pressure is significant.',[
    c('Disk is nearly full','full','cleanup'),c('Disk has plenty of space','ok','restart')
   ]),
   cleanup:act('Clear temporary files','Remove only approved temporary/cache content and retest performance.','Free space should increase and performance may improve.',[
    c('Resolved','ok',null,{resolve:{cause:'Low system disk space',confidence:95}}),c('Still slow','fail','restart')
   ]),
   restart:choice('Has the device had a clean restart since the issue began?','This clears transient processes and completes pending updates.',[
    c('Yes','yes','health'),c('No','no','do_restart')
   ]),
   do_restart:act('Restart the device','Save work, perform a normal restart, then retest before opening many apps.','Baseline performance should be tested after a clean boot.',[
    c('Resolved','ok',null,{resolve:{cause:'Transient process/update resource contention',confidence:84}}),c('Still slow','fail','health')
   ]),
   health:act('Check disk health','Run approved storage/hardware diagnostics and review OS event logs for disk errors.','No storage or hardware errors should be present.',[
    c('Disk/hardware error found','error',null,{escalate:{team:'Desktop/Hardware Support',reason:'Hardware/storage diagnostic failure'}}),c('No errors','ok','startup')
   ]),
   startup:act('Review startup/background apps','Disable only non-essential approved startup items and retest.','Reduced startup load should improve responsiveness if background apps were the cause.',[
    c('Resolved','ok',null,{resolve:{cause:'Excessive startup/background workload',confidence:89}}),c('Still slow','fail','perf_error')
   ]),
   perf_error:text('Paste any Event Viewer, diagnostic, or process error you found.','Exact evidence is needed before deeper OS or hardware escalation.',{windows:['Copy Event Viewer error ID/message or diagnostic code.'],macos:['Copy the relevant Console/diagnostic message.']})
  }
 },
 'printer-offline':{
  hypotheses:[['Local queue/spooler',30],['Printer offline',25],['Network path',20],['Driver issue',15],['Permissions',10]],start:'others',
  nodes:{
   others:choice('Can another user print to the same printer right now?','This separates local workstation issues from shared printer/print-server issues.',[
    c('Yes','yes','queue',{boosts:{'Local queue/spooler':30,'Printer offline':-15}}),c('No','no','printer_state',{boosts:{'Printer offline':25,'Network path':20}}),c('Not sure','unknown','printer_state')
   ]),
   queue:choice('Is there a stuck job in your local print queue?','One corrupt job can block everything behind it.',[
    c('Yes','yes','spooler'),c('No','no','readd'),c('Queue will not open','error','printer_error')
   ]),
   spooler:act('Restart Print Spooler','Cancel stuck jobs, restart the spooler, then print a small test page.','Queue should clear and the test page should print.',[
    c('Resolved','ok',null,{resolve:{cause:'Stuck/corrupt print queue',confidence:97}}),c('Still fails','fail','readd')
   ]),
   readd:act('Remove/re-add printer','Rebuild the printer mapping using the approved printer/print-server entry.','Printer should show Ready and print a test page.',[
    c('Resolved','ok',null,{resolve:{cause:'Corrupt printer mapping/driver configuration',confidence:92}}),c('Still fails','fail','printer_error')
   ]),
   printer_state:choice('Is the physical printer powered on, free of errors/jams, and connected to the network?','Shared failures often start with the device itself.',[
    c('Yes','yes','ping_printer'),c('No / error shown','no',null,{escalate:{team:'Printer/Facilities Support',reason:'Printer hardware/paper/device error requires physical attention'}}),c('Not sure','unknown','ping_printer')
   ]),
   ping_printer:act('Ping printer IP','Test the printer IP or print-server path from the workstation.','Printer/print server should be reachable on the network.',[
    c('Reachable','ok','server_queue'),c('Unreachable','fail',null,{escalate:{team:'Network/Print Support',reason:'Shared printer is unreachable over the network'}})
   ]),
   server_queue:act('Check print server queue','Review shared queue status and stuck jobs if authorized.','Shared queue should be online and processing jobs.',[
    c('Resolved','ok',null,{resolve:{cause:'Shared print queue blockage',confidence:93}}),c('Server/queue unavailable','fail',null,{escalate:{team:'Print Server Support',reason:'Shared print service unavailable'}})
   ]),
   printer_error:text('Paste the printer, driver, or spooler error message/code.','Exact error wording can identify driver, permission, port, or spooler failure.',{windows:['Copy the full printer/spooler error.'],macos:['Copy the full printer error.']})
  }
 },
 'phishing':{
  hypotheses:[['Phishing attempt',60],['Account compromise',25],['Malware execution',10],['Legitimate message',5]],start:'interaction',
  nodes:{
   interaction:choice('Did you click a link, open an attachment, enter credentials, or approve an unexpected MFA prompt?','This determines containment urgency.',[
    c('No interaction','none','report_only'),c('Clicked/opened only','clicked','isolate',{boosts:{'Malware execution':25}}),c('Entered credentials / approved MFA','creds','credential_containment',{boosts:{'Account compromise':45}})
   ]),
   report_only:act('Report message to Security','Use the approved phishing-report channel and preserve the original message/headers.','Security should receive the message without additional interaction.',[
    c('Reported','ok',null,{escalate:{team:'Security Operations',reason:'Suspected phishing requires analysis and blocking'}})
   ]),
   isolate:act('Escalate the suspected security event','Stop interaction, preserve evidence, and disconnect the endpoint from the network if active compromise is suspected and policy directs it.','Potential malicious activity should be contained before further use.',[
    c('Contained/reported','ok',null,{escalate:{team:'Security Operations',reason:'User interacted with suspected phishing payload'}})
   ]),
   credential_containment:act('Escalate the suspected security event','Immediately report that credentials/MFA were exposed; follow Security direction for password reset, session revocation and device containment.','Identity and endpoint containment should begin immediately.',[
    c('Security notified','ok',null,{escalate:{team:'Security Operations',reason:'Potential credential compromise from phishing'}})
   ])
  }
 },
 'onedrive-sync':{
  hypotheses:[['Client paused/stuck',28],['Authentication',20],['Invalid path/file',20],['Storage quota',17],['Service issue',15]],start:'web',
  nodes:{
   web:choice('Can you open the same files in OneDrive on the web?','This separates cloud availability/permissions from local sync-client problems.',[
    c('Yes','yes','client_state',{boosts:{'Client paused/stuck':25,'Service issue':-15}}),c('No','no','account_access'),c('Some files only','some','specific_error')
   ]),
   client_state:choice('Does the OneDrive icon show Paused, Signing in, Processing changes, or an error badge?','Client state often points directly to the next check.',[
    c('Paused','paused','resume'),c('Sign-in problem','signin','reauth'),c('Error badge','error','specific_error'),c('Looks normal','normal','restart')
   ]),
   resume:act('Resume OneDrive sync','Resume sync from the OneDrive menu and allow it to process.','Sync should progress and pending file count should decrease.',[
    c('Resolved','ok',null,{resolve:{cause:'OneDrive sync was paused',confidence:98}}),c('Still stuck','fail','restart')
   ]),
   restart:act('Restart OneDrive','Quit the client completely, reopen it, and observe sync status.','Client should sign in and resume processing changes.',[
    c('Resolved','ok',null,{resolve:{cause:'Stuck OneDrive client/session',confidence:91}}),c('Still stuck','fail','specific_error')
   ]),
   reauth:act('Reauthenticate OneDrive','Sign out/in using the approved account and retry sync.','OneDrive should authenticate and resume synchronization.',[
    c('Resolved','ok',null,{resolve:{cause:'Expired OneDrive authentication session',confidence:92}}),c('Still fails','fail','specific_error')
   ]),
   account_access:choice('Is the user denied access, out of storage, or seeing a service error on the web?','Web failure means the issue is not only the desktop sync client.',[
    c('Access denied','denied',null,{escalate:{team:'Microsoft 365/SharePoint Support',reason:'Cloud permission/access issue'}}),c('Storage full','quota','quota'),c('Service error','service','service_health'),c('Other','other','specific_error')
   ]),
   quota:act('Free storage or request quota','Reduce OneDrive usage according to policy or request approved quota capacity.','Storage should fall below the limit and sync should resume.',[
    c('Resolved','ok',null,{resolve:{cause:'OneDrive storage quota exceeded',confidence:97}}),c('Still fails','fail','specific_error')
   ]),
   service_health:act('Check Microsoft 365 service health','Look for an active OneDrive/SharePoint advisory.','An active incident should explain broad cloud failures.',[
    c('Incident found','yes',null,{escalate:{team:'Microsoft 365 Operations',reason:'Active OneDrive/SharePoint service incident'}}),c('No incident','no','specific_error')
   ]),
   specific_error:text('Paste the exact OneDrive sync error, file name, or status message.','Invalid names, path length, locks and specific error codes need targeted handling.',{windows:['Open OneDrive → View sync problems and copy the message.'],macos:['Open OneDrive sync status and copy the exact message.']})
  }
 },
 'app-crash':{
  hypotheses:[['Corrupt cache/profile',28],['Version/update issue',22],['Missing dependency',18],['Permissions',17],['Backend outage',15]],start:'others',
  nodes:{
   others:choice('Does the same application work for another user or device?','This separates endpoint-specific faults from shared backend/release incidents.',[
    c('Yes','yes','recent_change',{boosts:{'Corrupt cache/profile':25,'Backend outage':-15}}),c('No','no','service',{boosts:{'Backend outage':35}}),c('Not sure','unknown','logs')
   ]),
   service:choice('Did this start after a deployment/update and are multiple users affected?','Correlated timing strongly suggests a release or backend problem.',[
    c('Yes','yes',null,{escalate:{team:'Application Support',reason:'Multi-user application failure after release/update'}}),c('No','no','logs'),c('Not sure','unknown','logs')
   ]),
   recent_change:choice('Did the crash begin after an app/OS update, plugin change, or configuration change?','Recent changes are high-value causal evidence.',[
    c('Yes','yes','repair'),c('No','no','clean_profile'),c('Not sure','unknown','logs')
   ]),
   clean_profile:act('Clear/rebuild local application cache/profile','Use the approved method to test with a clean local profile/cache.','The application should start normally if local state was corrupt.',[
    c('Resolved','ok',null,{resolve:{cause:'Corrupt local application state',confidence:95}}),c('Still crashes','fail','logs')
   ]),
   repair:act('Repair/reinstall app','Use the approved repair/reinstall process and verify required dependencies.','Application should launch without crash after repair.',[
    c('Resolved','ok',null,{resolve:{cause:'Damaged application install/version mismatch',confidence:92}}),c('Still crashes','fail','logs'),c('Admin required','admin',null,{escalate:{team:'Desktop/Application Support',reason:'Application repair requires administrative access'}})
   ]),
   logs:text('Paste the crash error, event log entry, application log message, or error code.','Crash signatures identify missing DLL/runtime, permissions, version mismatch or backend failure.',{windows:['Open Event Viewer → Windows Logs → Application and copy the error for the crash time.'],macos:['Open Console and copy the crash/error entry.']})
  }
 },
 'camera-teams':{
  hypotheses:[['OS privacy permission',30],['Camera used by another app',24],['Teams settings',20],['Driver/hardware',16],['Browser permission',10]],start:'os_camera',
  nodes:{
   os_camera:choice('Does the camera work in the built-in Camera/Photo Booth app?','This separates hardware/OS issues from Teams-only configuration.',[
    c('Yes','yes','teams_device',{boosts:{'Teams settings':25,'Driver/hardware':-15}}),c('No','no','privacy',{boosts:{'OS privacy permission':20,'Driver/hardware':20}}),c('Camera missing','missing','device_health')
   ]),
   privacy:act('Check camera privacy permissions','Allow camera access for the affected app, then retest the OS camera app.','The camera preview should work at OS level.',[
    c('Resolved','ok','teams_device'),c('Still no camera','fail','device_health')
   ]),
   device_health:act('Verify Device Manager/System Information','Confirm the camera hardware is present, enabled, and has no driver warning.','Camera should be detected and healthy.',[
    c('Device error/missing','error',null,{escalate:{team:'Desktop/Hardware Support',reason:'Camera hardware/driver failure suspected'}}),c('Looks normal','ok','resource_conflict')
   ]),
   teams_device:act('Select correct camera','Choose the physical camera in Teams Settings → Devices and confirm preview.','A live preview should appear.',[
    c('Resolved','ok',null,{resolve:{cause:'Incorrect Teams camera selection/permission',confidence:97}}),c('Still black/unavailable','fail','resource_conflict')
   ]),
   resource_conflict:act('Close other video apps','Close Zoom/browser/camera utilities, restart Teams, and test again.','Only Teams should hold the camera device.',[
    c('Resolved','ok',null,{resolve:{cause:'Camera resource conflict or stale Teams client',confidence:91}}),c('Still fails','fail','teams_error')
   ]),
   teams_error:text('Paste the Teams camera error or describe exactly what the preview shows.','Specific device errors distinguish permissions, driver, virtual camera and client faults.',{windows:['Copy any Teams camera error from Settings → Devices.'],macos:['Copy any Teams camera error from Settings → Devices.']})
  }
 },
 'azure-access':{
  hypotheses:[['Missing RBAC role',40],['Wrong tenant/subscription',22],['PIM role inactive',20],['Policy/Conditional Access',18]],start:'tenant',
  nodes:{
   tenant:choice('Are you in the correct Azure tenant and subscription for this resource?','Wrong directory/subscription is a fast, common cause of apparent access denial.',[
    c('Yes','yes','rbac'),c('No','no','switch_tenant'),c('Not sure','unknown','switch_tenant')
   ]),
   switch_tenant:act('Switch directory/subscription','Switch to the expected tenant/subscription and retry the resource.','The target resource should appear in the correct context.',[
    c('Resolved','ok',null,{resolve:{cause:'Wrong Azure tenant/subscription context',confidence:99}}),c('Still denied','fail','rbac')
   ]),
   rbac:choice('Do you have the required RBAC role at the correct scope?','Azure authorization is role + scope; subscription access does not imply resource permissions.',[
    c('Yes','yes','pim'),c('No','no',null,{escalate:{team:'Cloud/IAM Support',reason:'Required Azure RBAC role is missing; least-privilege approval needed'}}),c('Not sure','unknown','activity_log')
   ]),
   pim:choice('If the role is eligible through PIM, is it currently activated and are MFA/compliance requirements satisfied?','Eligible roles do not grant access until activated.',[
    c('Yes','yes','activity_log'),c('No','no','activate_pim'),c('Not applicable','na','activity_log')
   ]),
   activate_pim:act('Activate eligible PIM role','Activate the required role, satisfy MFA/justification, refresh the session and retest.','Role should show Active and access should be granted if no other policy blocks it.',[
    c('Resolved','ok',null,{resolve:{cause:'PIM role was not activated',confidence:97}}),c('Still denied','fail','activity_log')
   ]),
   activity_log:act('Review Activity Log authorization failure','Open the failed Azure operation and capture the authorization/error details.','The event should identify action, scope, principal and policy/authorization reason.',[
    c('Deny assignment/policy shown','deny',null,{escalate:{team:'Cloud/IAM Support',reason:'Azure policy or deny assignment blocks the operation'}}),c('Conditional Access shown','ca',null,{escalate:{team:'Identity/Cloud Support',reason:'Conditional Access requirement blocks Azure access'}}),c('Other error','other','azure_error')
   ]),
   azure_error:text('Paste the Azure 403/error details, operation name, and authorization message.','The exact action/scope/error code is required for safe IAM diagnosis.',{windows:['Copy the portal error details or Activity Log authorization message.'],macos:['Copy the portal error details or Activity Log authorization message.']})
  }
 },
 'disk-full':{
  hypotheses:[['User data growth',30],['Temp/cache growth',25],['Logs',20],['Application data',15],['Unusual growth',10]],start:'capacity',
  nodes:{
   capacity:choice('Is free space below about 5–10% on the system drive?','This determines whether storage is urgent enough to affect OS/app stability.',[
    c('Yes','yes','largest',{boosts:{'Temp/cache growth':10,'User data growth':10}}),c('No','no','largest'),c('Not sure','unknown','largest')
   ]),
   largest:act('Review largest folders','Use the OS storage view or approved disk analysis to identify the largest categories/folders.','You should know what is consuming the space before deleting anything.',[
    c('Temporary/cache files dominate','temp','cleanup'),c('User files dominate','user','archive'),c('Logs/app data dominate','logs','owner'),c('Unexpected/unknown growth','unknown','unusual')
   ]),
   cleanup:act('Clear temporary files','Remove approved temporary/cache content only, then recheck free space.','Free space should increase without deleting business records.',[
    c('Resolved','ok',null,{resolve:{cause:'Temporary/cache storage growth',confidence:95}}),c('Space immediately fills again','again','unusual'),c('Not enough space recovered','fail','owner')
   ]),
   archive:act('Archive/move large user files','Move or archive approved large files to supported storage, then recheck capacity.','System drive should regain healthy free space.',[
    c('Resolved','ok',null,{resolve:{cause:'User data growth on system drive',confidence:94}}),c('Still critically full','fail','owner')
   ]),
   owner:choice('Can you identify the application/service responsible for the large logs or data?','Ownership determines whether cleanup, retention or application support is appropriate.',[
    c('Yes','yes','retention'),c('No','no','unusual')
   ]),
   retention:act('Configure storage cleanup / retention','Use the approved application/log retention policy and clean only safe historical data.','Growth should stabilize and free space remain available.',[
    c('Resolved','ok',null,{resolve:{cause:'Application/log retention growth',confidence:92}}),c('Growth continues','fail','unusual')
   ]),
   unusual:text('Paste the folder/path, process, or tool output showing the unexpected storage growth.','Rapid unexplained growth can indicate runaway logs, application defects or security concerns.',{windows:['Copy the largest path/process and approximate size.'],macos:['Copy the largest path/process and approximate size.']})
  }
 }
};

export function profileFor(id){return scenarioProfiles[id]||null}
export function profileHypotheses(id){const p=profileFor(id);return p?p.hypotheses.map(([name,score])=>({name,score})):[]}

export function interpretGeneric(id,nodeId,input){
 const q=(input||'').toLowerCase();
 if(!q.trim())return {summary:'No evidence provided',next:nodeId};
 if(id==='slow-pc'){
  const cpu=q.match(/cpu[^0-9]*(\d{2,3})%/)||q.match(/(\d{2,3})%[^\n]*cpu/);
  const mem=q.match(/memory[^0-9]*(\d{2,3})%/)||q.match(/(\d{2,3})%[^\n]*memory/);
  if((cpu&&+cpu[1]>=80)||(mem&&+mem[1]>=85))return {summary:'Sustained high CPU/memory detected',next:'disk',boosts:{'High CPU/memory':35}};
  return {summary:'No obvious CPU/memory saturation in pasted data',next:'disk'};
 }
 if(id==='outlook-send'&&/5\.[0-9]\.[0-9]|ndr|bounce/.test(q))return {summary:'Mail transport/NDR evidence captured',escalate:{team:'Microsoft 365 Support',reason:'Mail transport/NDR error requires mailbox/transport investigation'}};
 if(id==='onedrive-sync'){
  if(/invalid.*name|path.*long/.test(q))return {summary:'OneDrive content/path blocker detected',next:'specific_error'};
  const storageLimit=/\bstorage\s+(?:is\s+)?full\b|\bout of storage\b|\bquota\s+(?:is\s+)?(?:exceeded|full|reached)\b|\b(?:exceeded|reached)\s+(?:the\s+)?(?:storage\s+)?quota\b|\bstorage\s+(?:quota|limit)\s+(?:is\s+)?(?:exceeded|full|reached)\b/.test(q);
  if(storageLimit)return {summary:'OneDrive storage/quota blocker detected',next:'quota'};
 }
 if(id==='app-crash'&&/(?:dll|module).*(?:not found|missing|failed|fault)|(?:not found|missing|failed|fault).*(?:dll|module)|faulting (?:application|module)|runtime (?:error|exception|failure)|(?:error|exception|failure).*runtime/.test(q))return {summary:'Application dependency/module crash signature detected',escalate:{team:'Application/Desktop Support',reason:'Crash log indicates dependency/module failure'}};
 if(id==='camera-teams'&&/0xa00f|camera.*not found|no camera/.test(q))return {summary:'Camera device-not-found signature detected',next:'device_health'};
 if(id==='azure-access'&&/role assignment|authorizationfailed|does not have authorization/.test(q))return {summary:'Azure RBAC authorization failure detected',escalate:{team:'Cloud/IAM Support',reason:'Azure error confirms missing/insufficient RBAC at requested scope'}};
 if(id==='disk-full'&&/\b(?:temp|temporary|cache)\b/.test(q))return {summary:'Temporary/cache growth identified',next:'cleanup'};
 if(id==='disk-full'&&/\blogs?\b/.test(q))return {summary:'Log growth identified',next:'retention'};
 if(id==='locked-account'&&/mfa|multi-factor|authentication method/.test(q))return {summary:'MFA-related sign-in failure detected',next:'mfa'};
 if(/access denied|permission denied|403|forbidden/.test(q)){
  if(id==='azure-access')return {summary:'Authorization failure detected',next:'azure_error'};
  if(id==='locked-account')return {summary:'Access/authentication denial detected',next:'signin_logs'};
 }
 if(/0x800|error code|exception|failed|failure|cannot|unable|timed out|timeout/.test(q))return {summary:'Error output captured for diagnosis',next:nodeId};
 return {summary:'Evidence captured but not yet conclusive. Keep the incident in diagnosis and collect the exact error/code, what happened immediately before it, and one comparison result before escalating.',next:nodeId};
}

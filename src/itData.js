export const scenarios = [
  {
    id:'wifi-no-internet', category:'Network', title:'Connected to Wi‑Fi, no internet', icon:'Wifi', priority:'P3', severity:'Medium',
    symptoms:['Wi‑Fi connected','Websites unavailable'],
    hypotheses:[['DNS resolution failure',35],['Local IP/DHCP issue',25],['VPN/proxy interference',20],['Gateway/router issue',15],['ISP outage',5]],
    steps:[
      {q:'Can another device use the same Wi‑Fi?', help:'Separates endpoint issues from network-wide issues.', yes:{next:1,boost:{'DNS resolution failure':10,'Local IP/DHCP issue':10,'Gateway/router issue':-15,'ISP outage':-5}}, no:{result:'Network-wide connectivity issue',cause:'Gateway/router or upstream internet outage',confidence:86,actions:['Check router/AP status','Verify WAN/ISP status','Test gateway reachability','Escalate to Network Operations if multiple users are affected'],escalate:true}},
      {q:'Can you reach a public IP address such as 1.1.1.1?', help:'Tests connectivity without relying on DNS.', yes:{next:2,boost:{'DNS resolution failure':35,'Local IP/DHCP issue':-10,'Gateway/router issue':-10}}, no:{next:3,boost:{'Local IP/DHCP issue':25,'DNS resolution failure':-15}}},
      {q:'Does nslookup or dig fail for a normal domain?', help:'Confirms whether name resolution is failing.', yes:{result:'DNS resolution failure',cause:'Endpoint DNS configuration, resolver outage, or VPN DNS override',confidence:94,actions:['Flush local DNS cache','Renew DHCP lease','Verify DNS server settings','Disable/reconnect VPN if it overrides DNS','Retest name resolution'],escalate:false}, no:{result:'Application or proxy-specific issue',cause:'Browser cache, proxy configuration, security agent, or application-specific networking',confidence:76,actions:['Test another browser','Review proxy settings','Check security agent/firewall logs','Clear browser cache'],escalate:false}},
      {q:'Does the device have a valid private IP (not 169.254.x.x)?', help:'APIPA usually indicates DHCP failure.', yes:{result:'Routing, firewall, or endpoint network stack issue',cause:'Gateway route, firewall, VPN, or adapter stack',confidence:81,actions:['Ping default gateway','Check route table','Temporarily disconnect VPN','Reset network adapter','Escalate if gateway is unreachable for multiple users'],escalate:false}, no:{result:'DHCP lease failure',cause:'Device failed to obtain a valid IP address',confidence:96,actions:['Renew DHCP lease','Reconnect to Wi‑Fi','Restart network adapter','Check DHCP scope if multiple devices are affected'],escalate:false}}
    ]
  },
  {
    id:'vpn-failure', category:'Network', title:'VPN will not connect', icon:'Shield', priority:'P3', severity:'Medium',
    symptoms:['VPN connection fails'], hypotheses:[['Credential/MFA issue',30],['VPN client issue',25],['Network path issue',20],['Firewall/security agent',15],['Service outage',10]],
    steps:[
      {q:'Can the user access normal internet sites without the VPN?', help:'Validates basic connectivity first.', yes:{next:1,boost:{'Network path issue':-10}}, no:{result:'Underlying internet connectivity issue',cause:'Local network or ISP connectivity',confidence:91,actions:['Restore internet access first','Verify Wi‑Fi/Ethernet','Test gateway and DNS'],escalate:false}},
      {q:'Are credentials and MFA accepted?', help:'Separates identity failure from tunnel creation.', yes:{next:2,boost:{'Credential/MFA issue':-25,'VPN client issue':10}}, no:{result:'VPN authentication failure',cause:'Invalid credentials, locked account, expired password, or MFA problem',confidence:93,actions:['Verify account state','Check password expiry','Retry MFA','Reset authentication if authorized'],escalate:false}},
      {q:'Does the VPN create a tunnel but internal resources still fail?', help:'Distinguishes tunnel creation from routing/DNS.', yes:{next:3,boost:{'VPN client issue':-5,'Network path issue':15}}, no:{result:'VPN client or security control blocking tunnel creation',cause:'Client configuration, firewall, endpoint security, or service outage',confidence:80,actions:['Restart VPN client','Check client version','Review firewall/security agent','Check VPN service status'],escalate:false}},
      {q:'Can the user reach an internal IP but not an internal hostname?', help:'Tests internal DNS over VPN.', yes:{result:'VPN DNS resolution issue',cause:'Internal DNS not being applied through VPN',confidence:95,actions:['Review VPN DNS assignment','Flush DNS cache','Reconnect tunnel','Verify split-DNS policy'],escalate:true}, no:{result:'VPN routing or access-policy issue',cause:'Missing route, ACL, group policy, or network segmentation',confidence:89,actions:['Inspect route table','Confirm user VPN group/policy','Check ACL/firewall rules','Escalate to Network Operations'],escalate:true}}
    ]
  },
  {
    id:'locked-account', category:'Identity', title:'Account locked / sign-in denied', icon:'KeyRound', priority:'P3', severity:'Medium',
    symptoms:['User cannot sign in'], hypotheses:[['Account lockout',40],['Expired password',25],['MFA issue',20],['Disabled account',10],['SSO outage',5]],
    steps:[
      {q:'Does the identity system show the account as locked or disabled?', help:'Checks the authoritative account state.', yes:{next:1,boost:{'Account lockout':35,'Disabled account':20}}, no:{next:2,boost:{'Account lockout':-20}}},
      {q:'Was the account disabled intentionally or by policy?', help:'Determines whether unlocking is appropriate.', yes:{result:'Administrative account disablement',cause:'Policy, offboarding, risk control, or admin action',confidence:98,actions:['Do not bypass policy','Verify user identity and business approval','Escalate to Identity/HR as appropriate'],escalate:true}, no:{result:'Account lockout',cause:'Repeated failed sign-ins, stale saved credentials, or password mismatch',confidence:96,actions:['Unlock account if authorized','Reset password if required','Remove stale saved credentials','Review sign-in logs for repeated failures'],escalate:false}},
      {q:'Is the password expired or recently changed?', help:'Stale credentials commonly cause repeated lockouts.', yes:{result:'Expired or stale credentials',cause:'Password lifecycle or cached old password',confidence:93,actions:['Reset/update password','Update saved credentials on mobile/VPN/Outlook','Retest SSO'],escalate:false}, no:{result:'MFA or SSO authentication issue',cause:'MFA registration, token problem, or identity-provider error',confidence:78,actions:['Validate MFA method','Check SSO status','Review sign-in logs','Escalate if multiple users are affected'],escalate:false}}
    ]
  },
  {
    id:'outlook-send', category:'Microsoft 365', title:'Outlook cannot send email', icon:'Mail', priority:'P3', severity:'Medium',
    symptoms:['Messages remain in Outbox'], hypotheses:[['Connectivity',20],['Mailbox quota',20],['Authentication',20],['Outlook profile/cache',25],['Service issue',15]],
    steps:[
      {q:'Can the user send mail successfully from Outlook on the web?', help:'Separates desktop-client issues from mailbox/service issues.', yes:{result:'Outlook desktop client issue',cause:'Profile, local cache, add-in, or client configuration',confidence:90,actions:['Restart Outlook','Run in safe mode','Check add-ins','Repair/recreate Outlook profile'],escalate:false}, no:{next:1,boost:{'Outlook profile/cache':-20,'Mailbox quota':10,'Service issue':10}}},
      {q:'Is the mailbox at or near its storage quota?', help:'Full mailboxes can block sending.', yes:{result:'Mailbox quota exceeded',cause:'Mailbox storage limit reached',confidence:97,actions:['Archive/delete mail','Empty Deleted Items','Request quota increase if policy allows','Retest sending'],escalate:false}, no:{next:2}},
      {q:'Are other users reporting the same Microsoft 365 mail issue?', help:'Detects tenant-wide service impact.', yes:{result:'Microsoft 365 service incident',cause:'Shared Exchange Online or tenant service degradation',confidence:88,actions:['Check Microsoft 365 service health','Communicate impact','Track service restoration'],escalate:true}, no:{result:'Mailbox authentication or configuration issue',cause:'Account token, transport rule, connector, or mailbox-specific configuration',confidence:76,actions:['Reauthenticate account','Review mailbox settings','Check message trace','Escalate to Microsoft 365 admin if unresolved'],escalate:false}}
    ]
  },
  {
    id:'slow-pc', category:'Endpoint', title:'Windows PC is very slow', icon:'MonitorCog', priority:'P4', severity:'Low',
    symptoms:['Slow performance'], hypotheses:[['High CPU/memory',30],['Low disk space',20],['Startup/background apps',20],['Disk health',15],['Malware/update activity',15]],
    steps:[
      {q:'Does Task Manager show sustained CPU or memory above 90%?', help:'Identifies resource pressure.', yes:{result:'Resource saturation',cause:'High-impact process, memory pressure, or background workload',confidence:88,actions:['Identify top process','Restart or update affected app','Reduce startup workload','Check for update/security scan activity'],escalate:false}, no:{next:1}},
      {q:'Is the system drive more than 90% full?', help:'Low free space can significantly degrade performance.', yes:{result:'Low disk space',cause:'Insufficient free storage on system drive',confidence:95,actions:['Clear temporary files','Remove unnecessary applications','Move/archive large files','Maintain adequate free space'],escalate:false}, no:{next:2}},
      {q:'Is the issue still present after a clean restart?', help:'Eliminates transient process and update states.', yes:{result:'Persistent endpoint performance issue',cause:'Disk health, driver, OS, security agent, or hardware issue',confidence:72,actions:['Check disk health','Review Event Viewer','Run endpoint diagnostics','Check drivers/updates','Escalate for hardware testing if needed'],escalate:false}, no:{result:'Transient background process issue',cause:'Temporary resource contention or pending update',confidence:80,actions:['Monitor recurrence','Review startup apps','Complete pending updates'],escalate:false}}
    ]
  },
  {
    id:'printer-offline', category:'Peripheral', title:'Network printer shows offline', icon:'Printer', priority:'P4', severity:'Low',
    symptoms:['Cannot print'], hypotheses:[['Local queue/spooler',30],['Printer offline',25],['Network path',20],['Driver issue',15],['Permissions',10]],
    steps:[
      {q:'Can another user print to the same printer?', help:'Separates local workstation issues from printer/network issues.', yes:{next:1,boost:{'Local queue/spooler':25,'Printer offline':-20,'Network path':-15}}, no:{result:'Shared printer or network issue',cause:'Printer offline, network path, print server, or printer hardware',confidence:87,actions:['Check printer power/status','Ping printer IP','Check print server queue','Restart printer if authorized'],escalate:false}},
      {q:'Is there a stuck job in the local print queue?', help:'A failed job can block everything behind it.', yes:{result:'Print queue blockage',cause:'Stuck/corrupt print job',confidence:96,actions:['Cancel stuck jobs','Restart Print Spooler','Retry a small test page'],escalate:false}, no:{result:'Local printer driver or mapping issue',cause:'Driver, port, mapping, or workstation print configuration',confidence:82,actions:['Remove/re-add printer','Verify correct TCP/IP port','Update driver','Print test page'],escalate:false}}
    ]
  },
  {
    id:'phishing', category:'Security', title:'Suspicious email / phishing report', icon:'TriangleAlert', priority:'P1', severity:'Critical',
    symptoms:['Potential malicious email'], hypotheses:[['Phishing attempt',65],['Legitimate but suspicious message',20],['Account compromise',15]],
    steps:[
      {q:'Did the user click a link, open an attachment, enter credentials, or approve an unexpected MFA prompt?', help:'Determines whether this is only a report or a possible compromise.', yes:{result:'Potential security compromise',cause:'User interacted with a suspected phishing payload',confidence:92,actions:['Stop further interaction','Disconnect endpoint if active compromise is suspected','Preserve evidence','Reset credentials if directed by Security','Notify Security Operations immediately'],escalate:true}, no:{result:'Suspected phishing message',cause:'Untrusted message requiring security analysis',confidence:84,actions:['Do not click or reply','Report message using approved channel','Preserve headers/message','Block sender/domain only if directed by Security'],escalate:true}}
    ]
  },
  {
    id:'onedrive-sync', category:'Microsoft 365', title:'OneDrive not syncing', icon:'CloudOff', priority:'P4', severity:'Low',
    symptoms:['Files not syncing'], hypotheses:[['Client paused/stuck',30],['Authentication',20],['Invalid filename/path',20],['Storage quota',15],['Service issue',15]],
    steps:[
      {q:'Does OneDrive show a visible sync error or paused state?', help:'Uses client status as the first high-value signal.', yes:{next:1}, no:{next:2}},
      {q:'Is the error tied to a specific filename/path or storage quota?', help:'Common deterministic sync blockers.', yes:{result:'OneDrive content/quota sync blocker',cause:'Invalid path/name, file lock, or storage limit',confidence:91,actions:['Correct invalid filename/path','Close locked file','Free storage or request quota','Resume sync'],escalate:false}, no:{result:'OneDrive client or authentication issue',cause:'Client cache/session or sign-in state',confidence:80,actions:['Restart OneDrive','Sign out/in','Reset OneDrive client if approved','Retest sync'],escalate:false}},
      {q:'Can the user access the same files in OneDrive on the web?', help:'Separates cloud availability from local sync.', yes:{result:'Local OneDrive client issue',cause:'Desktop sync client state or configuration',confidence:90,actions:['Restart client','Check account','Reset client','Review sync exclusions'],escalate:false}, no:{result:'Account, permission, or service issue',cause:'Cloud access, permissions, or service availability',confidence:77,actions:['Check account access','Verify folder permissions','Check Microsoft 365 service health'],escalate:false}}
    ]
  },
  {
    id:'app-crash', category:'Application', title:'Business application crashes on launch', icon:'AppWindow', priority:'P3', severity:'Medium',
    symptoms:['App crash'], hypotheses:[['Corrupt cache/profile',30],['Missing dependency',20],['Version/update issue',20],['Permissions',15],['Backend outage',15]],
    steps:[
      {q:'Does the application work for another user or device?', help:'Separates local client issues from shared backend issues.', yes:{next:1,boost:{'Backend outage':-15,'Corrupt cache/profile':20}}, no:{result:'Shared application or backend incident',cause:'Service outage, release defect, or shared dependency failure',confidence:85,actions:['Check service health','Review recent deployments','Collect error IDs/logs','Escalate to application support'],escalate:true}},
      {q:'Does the app open after clearing local cache/profile or using a clean profile?', help:'Tests local state corruption.', yes:{result:'Corrupt local application state',cause:'Damaged cache/profile configuration',confidence:95,actions:['Rebuild local cache/profile','Retest core workflow','Document recurrence'],escalate:false}, no:{result:'Local application installation, dependency, or permission issue',cause:'Broken install, missing dependency, policy, or version mismatch',confidence:78,actions:['Check application logs','Repair/reinstall app','Verify required runtime/dependencies','Check permissions'],escalate:false}}
    ]
  },
  {
    id:'camera-teams', category:'Collaboration', title:'Teams camera not working', icon:'VideoOff', priority:'P4', severity:'Low',
    symptoms:['Camera unavailable in Teams'], hypotheses:[['OS privacy permission',30],['Camera used by another app',25],['Teams settings',20],['Driver/hardware',15],['Browser permission',10]],
    steps:[
      {q:'Does the camera work in the operating system camera app?', help:'Separates hardware/driver issues from Teams-only issues.', yes:{next:1,boost:{'Driver/hardware':-15,'Teams settings':20}}, no:{result:'Device, driver, or OS privacy issue',cause:'Camera hardware/driver disabled or OS permission denied',confidence:89,actions:['Check camera privacy settings','Verify Device Manager/System Information','Close apps using camera','Update/re-enable camera driver'],escalate:false}},
      {q:'Is the correct camera selected and permitted in Teams?', help:'Checks the application-specific configuration.', yes:{result:'Camera resource conflict or Teams client issue',cause:'Another app using camera, stale Teams state, or client bug',confidence:78,actions:['Close other video apps','Restart Teams','Clear Teams cache if approved','Update Teams'],escalate:false}, no:{result:'Teams camera configuration issue',cause:'Incorrect device selection or application permission',confidence:96,actions:['Select correct camera','Enable Teams camera permission','Restart meeting/client'],escalate:false}}
    ]
  },
  {
    id:'azure-access', category:'Cloud', title:'Azure resource access denied', icon:'CloudCog', priority:'P3', severity:'Medium',
    symptoms:['403 / authorization failure'], hypotheses:[['Missing RBAC role',45],['Wrong tenant/subscription',20],['PIM role inactive',20],['Policy/conditional access',15]],
    steps:[
      {q:'Is the user in the correct tenant and subscription?', help:'Prevents diagnosing access in the wrong scope.', yes:{next:1}, no:{result:'Wrong Azure tenant or subscription context',cause:'User authenticated to the wrong directory/subscription',confidence:98,actions:['Switch directory/subscription','Retest target resource'],escalate:false}},
      {q:'Does the user have an appropriate RBAC role at the required scope?', help:'Azure authorization is scope-based.', yes:{next:2}, no:{result:'Missing Azure RBAC permission',cause:'Required role assignment is absent at resource/resource-group/subscription scope',confidence:97,actions:['Request least-privilege role through approved process','Confirm assignment scope','Allow propagation and retest'],escalate:true}},
      {q:'Is the required PIM role activated and Conditional Access satisfied?', help:'Eligible roles may require activation.', yes:{result:'Azure policy or resource-specific authorization issue',cause:'Resource policy, deny assignment, or application-level permissions',confidence:75,actions:['Review Activity Log authorization failure','Check deny assignments/policies','Escalate to cloud admin'],escalate:true}, no:{result:'PIM / Conditional Access requirement not satisfied',cause:'Eligible role inactive or session does not meet access policy',confidence:94,actions:['Activate eligible PIM role','Complete MFA/compliant-device requirements','Refresh session'],escalate:false}}
    ]
  },
  {
    id:'disk-full', category:'Endpoint', title:'System disk critically full', icon:'HardDrive', priority:'P3', severity:'Medium',
    symptoms:['Low disk warning'], hypotheses:[['User data growth',35],['Temp/cache growth',25],['Logs',20],['Application data',15],['Malware/unusual growth',5]],
    steps:[
      {q:'Is free space below 5% or is the OS reporting critical storage warnings?', help:'Determines urgency and risk of application/OS failures.', yes:{next:1}, no:{result:'Non-critical storage pressure',cause:'Normal data growth approaching capacity',confidence:86,actions:['Review largest folders','Archive old data','Configure storage cleanup'],escalate:false}},
      {q:'Is one folder/process consuming unexpectedly large space?', help:'Locates the dominant source before deleting anything.', yes:{result:'Runaway storage consumption',cause:'Log/cache/application/user-data growth',confidence:91,actions:['Identify owner/application','Clean only approved data','Configure retention','Monitor recurrence'],escalate:false}, no:{result:'General storage exhaustion',cause:'Cumulative files, applications, updates, and user data',confidence:83,actions:['Run approved disk cleanup','Remove unused applications','Archive user data','Consider storage expansion'],escalate:false}}
    ]
  }
];
export const categoryCounts = scenarios.reduce((acc,s)=>{acc[s.category]=(acc[s.category]||0)+1;return acc;},{});

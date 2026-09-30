export const wifiFlow = {
  start: {
    id:'scope',
    type:'choice',
    prompt:'Before we touch settings, is the same Wi‑Fi working on another device right now?',
    why:'This immediately separates a device-specific fault from a network-wide outage.',
    options:[
      {label:'Yes, other devices work', value:'others_work', next:'ip_check', evidence:{scope:'device-specific'}, boosts:{'DNS resolution failure':10,'Local IP/DHCP issue':10,'Gateway/router issue':-20,'ISP outage':-10}},
      {label:'No, other devices also fail', value:'others_fail', next:'network_outage', evidence:{scope:'multi-device'}, boosts:{'Gateway/router issue':35,'ISP outage':30,'DNS resolution failure':-10}},
      {label:'Not sure', value:'unknown', next:'gateway_test', evidence:{scope:'unknown'}}
    ]
  },
  ip_check:{
    id:'ip_check',type:'text',
    prompt:'Let’s check the IP configuration. Paste the IPv4 address and Default Gateway, or paste the relevant lines from ipconfig / ifconfig.',
    why:'A 169.254.x.x address or missing gateway points to DHCP/network configuration before DNS is even considered.',
    help:{
      windows:['Press Windows + R','Type cmd and press Enter','Run: ipconfig','Copy IPv4 Address and Default Gateway'],
      macos:['Open System Settings → Network → active connection → Details → TCP/IP','Or open Terminal and run: ifconfig','Copy the IPv4 address and router/gateway']
    },
    nextByParser:true
  },
  dhcp_failure:{
    id:'dhcp_failure',type:'choice',
    prompt:'Your device appears not to have a valid DHCP lease. Is the IP address starting with 169.254, or is the Default Gateway missing?',
    why:'That confirms the device did not receive normal network settings.',
    options:[
      {label:'Yes',value:'confirmed',next:'renew_dhcp', boosts:{'Local IP/DHCP issue':45,'DNS resolution failure':-20}},
      {label:'No',value:'not_confirmed',next:'gateway_test'}
    ]
  },
  renew_dhcp:{
    id:'renew_dhcp',type:'action',
    action:'Renew DHCP lease',
    prompt:'Renew the DHCP lease, then tell me exactly what happened.',
    expected:'The device should receive a private IP such as 192.168.x.x or 10.x.x.x and a Default Gateway.',
    outcomes:[
      {label:'It received a normal IP',value:'success',next:'gateway_test'},
      {label:'It says unable to contact DHCP server',value:'dhcp_error',next:'adapter_check', boosts:{'Local IP/DHCP issue':25}},
      {label:'Still 169.254 / no gateway',value:'still_bad',next:'adapter_check', boosts:{'Local IP/DHCP issue':20}},
      {label:'Different error',value:'other',next:'freeform_error'}
    ]
  },
  adapter_check:{
    id:'adapter_check',type:'choice',
    prompt:'Can this device connect successfully using a different network path, such as Ethernet or a phone hotspot?',
    why:'This isolates the Wi‑Fi interface from the rest of the operating system.',
    options:[
      {label:'Yes, another connection works',value:'alt_works',next:'wifi_adapter_fix', boosts:{'Local IP/DHCP issue':20,'Gateway/router issue':-10}},
      {label:'No, nothing works',value:'none_work',next:'stack_reset', boosts:{'Local IP/DHCP issue':15,'VPN/proxy interference':10}},
      {label:'I cannot test that',value:'cant_test',next:'stack_reset'}
    ]
  },
  wifi_adapter_fix:{
    id:'wifi_adapter_fix',type:'action',action:'Restart network adapter',
    prompt:'Restart only the Wi‑Fi adapter, reconnect to the same network, and retest.',
    expected:'Wi‑Fi reconnects and receives a valid IP/gateway.',
    outcomes:[
      {label:'It works now',value:'resolved',resolve:{cause:'Wi‑Fi adapter state / DHCP negotiation issue',confidence:91}},
      {label:'Still no valid IP',value:'failed',next:'forget_network'},
      {label:'Different error',value:'other',next:'freeform_error'}
    ]
  },
  forget_network:{
    id:'forget_network',type:'action',action:'Forget and reconnect to Wi‑Fi',
    prompt:'Forget the Wi‑Fi profile, reconnect, and enter the password again.',
    expected:'A fresh profile should authenticate and receive DHCP settings.',
    outcomes:[
      {label:'It works now',value:'resolved',resolve:{cause:'Corrupt Wi‑Fi profile or stale authentication state',confidence:90}},
      {label:'Still not working',value:'failed',next:'driver_or_policy'},
      {label:'Authentication error',value:'auth_error',next:'wifi_auth'}
    ]
  },
  driver_or_policy:{
    id:'driver_or_policy',type:'choice',
    prompt:'Did this start after a Windows/macOS update, driver update, VPN/security software change, or corporate policy change?',
    why:'A recent change strongly shifts the likely cause toward driver, endpoint security, or policy.',
    options:[
      {label:'Yes',value:'recent_change',next:'change_review', boosts:{'VPN/proxy interference':20}},
      {label:'No',value:'no_change',next:'driver_health'},
      {label:'Not sure',value:'unknown',next:'driver_health'}
    ]
  },
  change_review:{
    id:'change_review',type:'action',action:'Review recent network/security changes',
    prompt:'Check the recent update/change and retest after the safest reversible step, such as reconnecting VPN/security client or rolling back only if approved.',
    expected:'If the recent change caused the issue, connectivity should return after the approved reversal/reconnect.',
    outcomes:[
      {label:'Resolved',value:'resolved',resolve:{cause:'Recent network, VPN, security, or driver change',confidence:86}},
      {label:'Still failing',value:'failed',next:'driver_health'},
      {label:'I need admin help',value:'admin',escalate:{team:'Desktop Support',reason:'Administrative rights required to inspect or roll back recent changes'}}
    ]
  },
  driver_health:{
    id:'driver_health',type:'action',action:'Check adapter/driver health',
    prompt:'Check the Wi‑Fi adapter status and driver health. Capture any warning icon or error code.',
    expected:'The adapter should show enabled/working normally with no driver error.',
    outcomes:[
      {label:'Driver/device error shown',value:'driver_error',next:'driver_fix'},
      {label:'No error, looks normal',value:'normal',next:'stack_reset'},
      {label:'Adapter missing',value:'missing',escalate:{team:'Desktop Support',reason:'Wi‑Fi adapter missing or hardware/driver failure suspected'}}
    ]
  },
  driver_fix:{
    id:'driver_fix',type:'action',action:'Repair Wi‑Fi driver',
    prompt:'Use the approved update/reinstall method for the Wi‑Fi driver, then reconnect and retest.',
    expected:'Adapter loads normally and Wi‑Fi obtains an IP.',
    outcomes:[
      {label:'Resolved',value:'resolved',resolve:{cause:'Wi‑Fi driver fault',confidence:94}},
      {label:'Still failing',value:'failed',next:'stack_reset'},
      {label:'Cannot update / admin required',value:'admin',escalate:{team:'Desktop Support',reason:'Driver repair requires administrative access'}}
    ]
  },
  stack_reset:{
    id:'stack_reset',type:'action',action:'Reset local network stack',
    prompt:'Reset the local network stack using the approved OS method, restart the device if requested, then retest.',
    expected:'TCP/IP, sockets, routes, and adapter state should return to a clean baseline.',
    outcomes:[
      {label:'Resolved',value:'resolved',resolve:{cause:'Corrupt local network stack',confidence:88}},
      {label:'Still failing',value:'failed',next:'gateway_test'},
      {label:'Command/error shown',value:'error',next:'freeform_error'}
    ]
  },
  gateway_test:{
    id:'gateway_test',type:'text',
    prompt:'Test the Default Gateway. Paste the ping result, or tell me whether you get replies, timeouts, or “destination host unreachable.”',
    why:'The gateway test tells us whether the problem is local link/routing or farther upstream.',
    help:{windows:['Run: ipconfig and note Default Gateway','Then run: ping <gateway-address>'],macos:['Find router in Network → TCP/IP','Then run: ping -c 4 <gateway-address>']},
    nextByParser:true
  },
  gateway_fail:{
    id:'gateway_fail',type:'choice',
    prompt:'The gateway is not reachable. Is the Wi‑Fi signal connected and stable, without repeatedly disconnecting?',
    why:'This distinguishes local radio/authentication problems from gateway/VLAN/network issues.',
    options:[
      {label:'Yes, Wi‑Fi stays connected',value:'stable',next:'network_outage', boosts:{'Gateway/router issue':25}},
      {label:'No, Wi‑Fi drops/reconnects',value:'unstable',next:'wifi_adapter_fix', boosts:{'Local IP/DHCP issue':15}},
      {label:'Not sure',value:'unknown',next:'wifi_adapter_fix'}
    ]
  },
  public_ip_test:{
    id:'public_ip_test',type:'text',
    prompt:'Now test a public IP address. Run ping 1.1.1.1 and paste the result.',
    why:'If public IP works but websites do not, DNS becomes the leading cause.',
    help:{windows:['Run: ping 1.1.1.1'],macos:['Run: ping -c 4 1.1.1.1']},
    nextByParser:true
  },
  dns_test:{
    id:'dns_test',type:'text',
    prompt:'Test DNS resolution. Run nslookup google.com (or dig google.com) and paste the output.',
    why:'This directly tests whether names can resolve to IP addresses.',
    help:{windows:['Run: nslookup google.com'],macos:['Run: nslookup google.com','Or: dig google.com']},
    nextByParser:true
  },
  dns_fix:{
    id:'dns_fix',type:'action',action:'Flush DNS cache',
    prompt:'Flush the local DNS cache, then run nslookup google.com again.',
    expected:'The lookup should return one or more IP addresses without timeout.',
    outcomes:[
      {label:'DNS works now',value:'resolved',resolve:{cause:'Stale local DNS cache',confidence:94}},
      {label:'Still timing out',value:'failed',next:'dns_settings'},
      {label:'Different error',value:'error',next:'freeform_error'}
    ]
  },
  dns_settings:{
    id:'dns_settings',type:'action',action:'Verify DNS server settings',
    prompt:'Check which DNS servers are configured. Do not change managed corporate DNS unless authorized. Then retest nslookup.',
    expected:'The configured DNS server should be reachable and return answers.',
    outcomes:[
      {label:'Fixed after correcting DNS',value:'resolved',resolve:{cause:'Incorrect DNS configuration',confidence:97}},
      {label:'DNS server configured but unreachable',value:'unreachable',next:'vpn_proxy_check'},
      {label:'Settings look correct, still failing',value:'failed',next:'vpn_proxy_check'}
    ]
  },
  vpn_proxy_check:{
    id:'vpn_proxy_check',type:'choice',
    prompt:'Is a VPN, proxy, web filter, or endpoint security client active right now?',
    why:'These tools commonly override DNS, routes, or web traffic.',
    options:[
      {label:'Yes',value:'yes',next:'vpn_reconnect', boosts:{'VPN/proxy interference':35}},
      {label:'No',value:'no',next:'browser_test'},
      {label:'Not sure',value:'unknown',next:'browser_test'}
    ]
  },
  vpn_reconnect:{
    id:'vpn_reconnect',type:'action',action:'Disable/reconnect VPN',
    prompt:'Disconnect the VPN/security tunnel, verify normal internet, reconnect, then retest.',
    expected:'If the VPN caused stale DNS/routes, normal browsing should return after reconnect.',
    outcomes:[
      {label:'Resolved',value:'resolved',resolve:{cause:'VPN/proxy DNS or routing state',confidence:93}},
      {label:'Works only with VPN disconnected',value:'vpn_only',escalate:{team:'Network/VPN Support',reason:'Connectivity fails only when VPN/security tunnel is active'}},
      {label:'Still failing either way',value:'failed',next:'browser_test'}
    ]
  },
  browser_test:{
    id:'browser_test',type:'choice',
    prompt:'Does the same website work in another browser or a private/incognito window?',
    why:'This isolates browser cache/extensions from the network stack.',
    options:[
      {label:'Yes, another browser works',value:'works',next:'browser_fix'},
      {label:'No, all browsers fail',value:'fail',next:'public_ip_test'},
      {label:'I cannot test',value:'unknown',next:'public_ip_test'}
    ]
  },
  browser_fix:{
    id:'browser_fix',type:'action',action:'Clear browser cache',
    prompt:'Clear cached files in the affected browser, disable suspicious extensions if approved, then retest.',
    expected:'The original browser should load the site normally.',
    outcomes:[
      {label:'Resolved',value:'resolved',resolve:{cause:'Browser cache/extension issue',confidence:91}},
      {label:'Still failing only in this browser',value:'failed',escalate:{team:'Application/Desktop Support',reason:'Browser-specific issue persists after cache/profile checks'}}
    ]
  },
  network_outage:{
    id:'network_outage',type:'choice',
    prompt:'Are multiple users/devices affected on the same network or location?',
    why:'Multi-user impact points away from the endpoint and toward shared infrastructure.',
    options:[
      {label:'Yes',value:'multi',escalate:{team:'Network Operations',reason:'Shared network/gateway/upstream issue affecting multiple users'}},
      {label:'No, only this device',value:'single',next:'gateway_test'},
      {label:'Not sure',value:'unknown',next:'public_ip_test'}
    ]
  },
  wifi_auth:{
    id:'wifi_auth',type:'choice',
    prompt:'Does the Wi‑Fi connection say incorrect password, cannot authenticate, or certificate required?',
    why:'Authentication errors need a different path than DHCP/DNS.',
    options:[
      {label:'Incorrect password',value:'password',next:'forget_network'},
      {label:'Certificate / enterprise Wi‑Fi error',value:'cert',escalate:{team:'Network/Identity Support',reason:'Enterprise Wi‑Fi authentication/certificate issue'}},
      {label:'Other authentication error',value:'other',next:'freeform_error'}
    ]
  },
  freeform_error:{
    id:'freeform_error',type:'text',
    prompt:'Paste the exact error message or command output. I’ll use it as evidence for the next step.',
    why:'Exact wording often identifies the failing layer faster than more generic questions.',
    nextByParser:true
  }
};

export function initialHypotheses(){
  return [
    {name:'DNS resolution failure',score:30},
    {name:'Local IP/DHCP issue',score:25},
    {name:'Gateway/router issue',score:18},
    {name:'VPN/proxy interference',score:12},
    {name:'Browser/application issue',score:8},
    {name:'ISP outage',score:7}
  ];
}

export function applyBoosts(hypotheses, boosts={}){
  const next=hypotheses.map(h=>({...h,score:Math.max(0,Math.min(100,h.score+(boosts[h.name]||0)))}));
  const total=next.reduce((s,h)=>s+h.score,0)||1;
  return next.map(h=>({...h,score:Math.round(h.score/total*100)})).sort((a,b)=>b.score-a.score);
}

export function calculatePriority(ctx={}, category=''){
  const scope=ctx.scope||'';
  const impact=(ctx.impact||'').toLowerCase();
  if(category==='Security') return {priority:'P1',severity:'Critical',reason:'Security event'};
  if(scope.includes('Everyone')||scope.includes('site-wide')) return {priority:'P1',severity:'Critical',reason:'Site-wide impact'};
  if(scope.includes('Whole team')||scope.includes('Several')) return {priority:'P2',severity:'High',reason:'Multiple users affected'};
  if(impact.includes('blocked')||impact.includes('cannot work')||impact.includes("can't work")) return {priority:'P2',severity:'High',reason:'User work blocked'};
  return {priority:'P3',severity:'Medium',reason:'Limited user impact'};
}

export function parseDiagnosticText(nodeId, text){
  const q=(text||'').toLowerCase();
  if(!q.trim()) return {next:'freeform_error',summary:'No output provided'};
  if(/169\.254\./.test(q)||/autoconfiguration ipv4.*169\.254/.test(q)||/default gateway\s*[:.]?\s*(\r?\n|$)/.test(q)){
    return {next:'dhcp_failure',summary:'APIPA or missing gateway detected',boosts:{'Local IP/DHCP issue':45,'DNS resolution failure':-15}};
  }
  if(/unable to contact.*dhcp|dhcp server.*unreachable|no dhcp offers/.test(q)){
    return {next:'adapter_check',summary:'DHCP server could not be reached',boosts:{'Local IP/DHCP issue':40}};
  }
  if(/destination host unreachable|general failure/.test(q)){
    if(nodeId==='gateway_test')return {next:'gateway_fail',summary:'Gateway unreachable',boosts:{'Gateway/router issue':30,'Local IP/DHCP issue':15}};
    return {next:'gateway_test',summary:'Routing path failure detected',boosts:{'Gateway/router issue':20}};
  }
  if(/request timed out|100% packet loss|100\.0% packet loss|timeout/.test(q)){
    if(nodeId==='gateway_test')return {next:'gateway_fail',summary:'No response from gateway',boosts:{'Gateway/router issue':25}};
    if(nodeId==='public_ip_test')return {next:'vpn_proxy_check',summary:'Public IP unreachable',boosts:{'Gateway/router issue':20,'VPN/proxy interference':15}};
    if(nodeId==='dns_test')return {next:'dns_fix',summary:'DNS query timed out',boosts:{'DNS resolution failure':45}};
  }
  if(/reply from .*1\.1\.1\.1|bytes from 1\.1\.1\.1|0% packet loss|0\.0% packet loss/.test(q)){
    if(nodeId==='public_ip_test')return {next:'dns_test',summary:'Public IP connectivity works',boosts:{'DNS resolution failure':35,'Gateway/router issue':-15,'ISP outage':-10}};
    if(nodeId==='gateway_test')return {next:'public_ip_test',summary:'Gateway is reachable',boosts:{'Gateway/router issue':-15}};
  }
  if(/server:|address:.*53|non-authoritative answer|answer section|name:.*google/.test(q)){
    if(nodeId==='dns_test') return {resolve:{cause:'DNS is functioning; issue is likely browser, proxy, or application-specific',confidence:78},summary:'DNS lookup succeeded'};
  }
  if(/nxdomain|non-existent domain/.test(q)){
    return {next:'dns_settings',summary:'DNS returned NXDOMAIN',boosts:{'DNS resolution failure':25}};
  }
  if(/server failed|servfail|refused/.test(q)){
    return {next:'dns_settings',summary:'DNS server error/refusal',boosts:{'DNS resolution failure':35}};
  }
  if(/192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./.test(q)){
    if(nodeId==='ip_check')return {next:'gateway_test',summary:'Valid private IP detected',boosts:{'Local IP/DHCP issue':-15}};
  }
  if(/incorrect password|authentication failed|802\.1x|certificate/.test(q)){
    return {next:'wifi_auth',summary:'Wi‑Fi authentication problem detected'};
  }
  if(/access is denied|permission denied|requires elevation|administrator/.test(q)){
    return {escalate:{team:'Desktop Support',reason:'Administrative privileges required'},summary:'Admin rights required'};
  }
  return {next: nodeId==='ip_check'?'gateway_test': nodeId==='gateway_test'?'public_ip_test': nodeId==='public_ip_test'?'dns_test':'freeform_error', summary:'Output recorded; no conclusive signature matched'};
}

export function getNode(id){return wifiFlow[id]||wifiFlow.freeform_error;}

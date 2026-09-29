const norm = s => (s||'').toLowerCase();

const osFamily = os => {
  const v=(os||'').toLowerCase();
  if(v.includes('windows')) return 'windows';
  if(v.includes('mac')) return 'macos';
  if(v.includes('linux')) return 'linux';
  if(v.includes('ios')||v.includes('ipad')) return 'ios';
  if(v.includes('android')) return 'android';
  return 'generic';
};

const generic = (title, why, steps, expected, warning='') => ({title,why,steps,expected,warning});

export function getActionGuide(action, os='', scenarioId=''){
  const a=norm(action), family=osFamily(os);

  if(a.includes('flush') && a.includes('dns')){
    const byOs={
      windows:generic('Flush the DNS cache','This removes stale local DNS records that can stop websites or internal resources from resolving.',[
        'Press Windows + R, type cmd, then press Ctrl + Shift + Enter.',
        'Run: ipconfig /flushdns',
        'Wait for the confirmation message.',
        'Close and reopen the browser or affected app, then test again.'
      ],'You should see “Successfully flushed the DNS Resolver Cache.”'),
      macos:generic('Flush the DNS cache','This clears stale name-resolution entries on your Mac.',[
        'Open Terminal from Applications → Utilities.',
        'Run: sudo dscacheutil -flushcache',
        'Then run: sudo killall -HUP mDNSResponder',
        'Enter your Mac password if prompted, then test the site/app again.'
      ],'The command may not print a success message; retest the original problem.'),
      linux:generic('Flush the DNS cache','This clears cached DNS records. The command depends on the resolver in use.',[
        'Open Terminal.',
        'Try: sudo resolvectl flush-caches',
        'If that command is unavailable and systemd-resolved is used, restart it with: sudo systemctl restart systemd-resolved',
        'Retest name resolution.'
      ],'A normal result is no error and successful domain lookup afterward.','Use only on systems where you are authorized to run sudo commands.')
    };
    return byOs[family]||generic('Flush the DNS cache','Clear stale DNS records on the device.',['Open the device network settings or terminal.','Clear/restart the local DNS resolver using the approved method for your OS.','Retest the original issue.'],'Domain names should resolve normally afterward.');
  }

  if(a.includes('renew dhcp')||a.includes('renew')&&a.includes('lease')){
    const byOs={
      windows:generic('Renew the IP configuration','This requests a fresh IP address, gateway and DNS settings from DHCP.',[
        'Open Command Prompt as Administrator.',
        'Run: ipconfig /release',
        'Wait a few seconds.',
        'Run: ipconfig /renew',
        'Run: ipconfig and confirm the IPv4 address is not 169.254.x.x.',
        'Retest the connection.'
      ],'You should receive a normal private IPv4 address such as 192.168.x.x or 10.x.x.x.'),
      macos:generic('Renew the DHCP lease','This asks the network for fresh IP settings.',[
        'Open System Settings → Network.',
        'Select the active Wi‑Fi or Ethernet connection.',
        'Open Details → TCP/IP.',
        'Click Renew DHCP Lease.',
        'Retest the connection.'
      ],'The device should receive a valid IP address, router and DNS information.'),
      linux:generic('Renew the DHCP lease','This requests fresh network settings from DHCP.',[
        'Open Terminal.',
        'If NetworkManager is used, disconnect and reconnect the active connection.',
        'Or, where approved, run the appropriate DHCP client renew command for your distribution.',
        'Check the new IP address and retest.'
      ],'The device should receive a valid private IP rather than a link-local address.','Avoid stopping network services on production systems unless authorized.')
    };
    return byOs[family]||generic('Renew the network lease','Request fresh IP configuration from DHCP.',['Disconnect and reconnect the network connection.','Use the OS network settings to renew DHCP if available.','Confirm a valid IP address, then retest.'],'A valid IP, gateway and DNS server should be assigned.');
  }

  if(a.includes('verify dns')||a.includes('dns server')||a.includes('dns settings')){
    return generic('Verify DNS server settings','Incorrect DNS servers can allow network connection while preventing names from resolving.',[
      family==='windows'?'Open Settings → Network & internet → your active connection → DNS server assignment.':
      family==='macos'?'Open System Settings → Network → active connection → Details → DNS.':
      'Open the network settings for the active connection and locate DNS configuration.',
      'If your organization uses DHCP-provided DNS, confirm DNS is set to Automatic unless IT instructed otherwise.',
      'If corporate DNS is required, compare the configured servers with your organization’s approved values.',
      'Do not replace managed corporate DNS with public DNS unless authorized.',
      'Save any approved correction and retest.'
    ],'The configured DNS servers should match your organization/network design.','Changing DNS can affect security, filtering and access to internal resources.');
  }

  if(a.includes('restart vpn')||a.includes('reconnect vpn')||a.includes('disable/reconnect vpn')){
    return generic('Reconnect the VPN cleanly','A stale VPN tunnel can keep old routes or DNS settings.',[
      'Disconnect the VPN.',
      'Wait 10–15 seconds.',
      'Confirm normal internet access still works.',
      'Reconnect the VPN and complete MFA if prompted.',
      'Retest the internal resource.'
    ],'The VPN should show Connected and the internal resource should become reachable.');
  }

  if(a.includes('check client version')){
    return generic('Check the VPN/client version','Outdated clients can fail after security or gateway updates.',[
      family==='windows'?'Open Settings → Apps → Installed apps and find the VPN/application client.':
      family==='macos'?'Open Applications, select the app, then File → Get Info.':
      'Open the application About/Info screen.',
      'Note the installed version.',
      'Compare it with the version approved by your organization.',
      'Update only through the approved company portal or vendor source.'
    ],'The installed version should meet your organization’s supported version.');
  }

  if(a.includes('check route')||a.includes('inspect route')){
    return generic('Check the routing table','This confirms whether traffic has a valid path to the gateway or internal network.',[
      family==='windows'?'Open Command Prompt and run: route print':
      family==='macos'?'Open Terminal and run: netstat -rn':
      'Open Terminal and run: ip route',
      'Look for a default route and, for VPN issues, a route to the internal network.',
      'If a required route is missing, capture the output and escalate rather than adding routes manually on a managed device.'
    ],'A default route should exist; VPN scenarios should also have the required internal routes.','Do not add persistent routes on managed devices unless authorized.');
  }

  if(a.includes('ping default gateway')){
    return generic('Test the default gateway','This checks whether the device can reach the first network hop.',[
      family==='windows'?'Run ipconfig and note Default Gateway, then run: ping <gateway-address>':
      family==='macos'?'Run route -n get default | grep gateway, then ping the gateway address.':
      'Run ip route, note the default gateway, then ping it.',
      'Try 4–5 replies.',
      'If all requests time out, the issue is likely local network, Wi‑Fi/Ethernet, VLAN or gateway related.'
    ],'You should receive replies with low latency and no packet loss.');
  }

  if(a.includes('test another browser')){
    return generic('Test with another browser','This separates a browser-specific problem from a device/network problem.',[
      'Open a different installed browser or a private/incognito window.',
      'Go to the same site.',
      'If it works there, the issue is likely cache, extension, proxy or browser profile related.',
      'If it fails there too, continue network-level troubleshooting.'
    ],'A successful test in another browser points to the original browser rather than the network.');
  }

  if(a.includes('clear browser cache')){
    return generic('Clear browser cache','Corrupted cached files or redirects can break one browser while the network is healthy.',[
      'Open the browser settings.',
      'Find Privacy / Browsing data.',
      'Clear cached images and files first; avoid deleting passwords unless needed.',
      'Close and reopen the browser, then retest.'
    ],'The site should load without using stale cached content.');
  }

  if(a.includes('restart') && a.includes('network adapter') || a.includes('reset network adapter')){
    return generic('Restart the network adapter','This resets the local network interface without changing organization-wide settings.',[
      family==='windows'?'Open Settings → Network & internet → Advanced network settings, disable the active adapter, wait 10 seconds, then enable it.':
      family==='macos'?'Turn Wi‑Fi off, wait 10 seconds, then turn it back on. For Ethernet, disconnect/reconnect the adapter if practical.':
      'Disconnect and reconnect the active network interface.',
      'Wait for the device to obtain an IP address.',
      'Retest the connection.'
    ],'The adapter should reconnect and receive valid IP configuration.');
  }

  if(a.includes('unlock account')){
    return generic('Unlock the user account','The account may be blocked after repeated failed sign-ins.',[
      'Verify the user’s identity using the organization’s approved process.',
      'In the approved identity-management tool, confirm the account is actually locked.',
      'Unlock it only if policy allows.',
      'Ask the user to sign in once with the correct current password.',
      'If it locks again immediately, check for stale saved credentials on VPN, mobile mail or mapped services.'
    ],'The user should be able to sign in without another immediate lockout.','Identity changes require authorization and identity verification.');
  }

  if(a.includes('reset password')||a.includes('reset/update password')){
    return generic('Reset or update the password','A password reset is appropriate only after identity verification and policy checks.',[
      'Verify the user’s identity.',
      'Use the approved self-service or administrator password-reset process.',
      'Set or have the user set a compliant password.',
      'Update saved credentials on VPN, Outlook/mobile mail and other clients.',
      'Test sign-in again.'
    ],'The new password should work consistently across required services.','Never ask the user to send you their password.');
  }

  if(a.includes('retry mfa')||a.includes('validate mfa')){
    return generic('Verify MFA','This confirms whether the second authentication factor is the actual blocker.',[
      'Confirm the prompt belongs to the sign-in the user just initiated.',
      'Check the device has internet access and correct time/date.',
      'Open the authenticator app and try the approved method again.',
      'If prompts are unexpected, stop and treat it as a security event.',
      'If the approved method is unavailable, use the organization’s recovery process.'
    ],'A valid, expected MFA challenge should complete successfully.','Never approve an MFA prompt the user did not initiate.');
  }

  if(a.includes('restart outlook')||a.includes('restart teams')||a.includes('restart onedrive')||a.includes('restart vpn client')){
    const app=a.includes('outlook')?'Outlook':a.includes('teams')?'Teams':a.includes('onedrive')?'OneDrive':'the client';
    return generic(`Restart ${app}`,'A clean restart clears stuck processes and stale sessions.',[
      `Close ${app} completely.`,
      family==='windows'?'Open Task Manager and confirm no related process remains running if the app appears stuck.':'If needed, use the OS force-quit/task manager to close a stuck process.',
      `Reopen ${app}.`,
      'Sign in again if prompted, then retest the original function.'
    ],`${app} should reopen normally and the affected function should work.`);
  }

  if(a.includes('check add-ins')){
    return generic('Check Outlook add-ins','A faulty add-in can block send/receive or cause crashes.',[
      'Open Outlook settings/options and locate Add-ins.',
      'Disable non-essential third-party add-ins one at a time.',
      'Restart Outlook after each change.',
      'Retest sending or the original problem.'
    ],'If the issue stops after disabling an add-in, that add-in is the likely cause.','Follow company policy before disabling managed security/compliance add-ins.');
  }

  if(a.includes('repair/recreate outlook profile')||a.includes('recreate outlook profile')){
    return generic('Repair or recreate the Outlook profile','A damaged local profile can cause persistent client-only issues.',[
      'Confirm Outlook on the web works first.',
      'Back up any local-only data if applicable.',
      'Use the approved Windows/macOS Outlook profile management process to create a fresh profile.',
      'Add the account and allow initial synchronization.',
      'Retest send/receive.'
    ],'The new profile should sync and send mail normally.','Profile recreation can affect local settings; follow organizational procedures.');
  }

  if(a.includes('archive/delete mail')||a.includes('empty deleted items')||a.includes('quota')){
    return generic('Reduce mailbox usage','A full mailbox can block sending or receiving.',[
      'Check mailbox storage usage.',
      'Empty Deleted Items and Junk if policy permits.',
      'Archive or delete large old messages according to retention policy.',
      'Wait for the quota value to update, then retest sending.'
    ],'Mailbox usage should fall below the enforced quota.','Do not delete records that must be retained.');
  }

  if(a.includes('check microsoft 365 service health')){
    return generic('Check Microsoft 365 service health','If multiple users are affected, a cloud service incident is more likely than a local PC issue.',[
      'Open the Microsoft 365 admin service-health dashboard if you have access.',
      'Look for an active Exchange, Teams, OneDrive or identity advisory matching the symptom.',
      'Record the incident/advisory ID.',
      'If an outage exists, communicate status and avoid unnecessary endpoint changes.'
    ],'An active advisory explains the multi-user impact; otherwise continue tenant or endpoint diagnostics.','Admin access may be required.');
  }

  if(a.includes('restart print spooler')){
    return generic('Restart the Print Spooler','A stuck spooler can block the entire local print queue.',[
      family==='windows'?'Press Windows + R, type services.msc, open Print Spooler, choose Restart.':'Use the approved printing service restart method for your OS.',
      'Open the print queue and confirm stuck jobs clear.',
      'Print a small test page.'
    ],'The queue should process normally and the test page should print.','Administrator permission may be required.');
  }

  if(a.includes('remove/re-add printer')){
    return generic('Remove and re-add the printer','This rebuilds the local printer mapping and port configuration.',[
      family==='windows'?'Open Settings → Bluetooth & devices → Printers & scanners. Remove the affected printer, then Add device.':
      family==='macos'?'Open System Settings → Printers & Scanners. Remove the printer, then add it again.':
      'Use the OS printer settings to remove and re-add the device.',
      'Choose the approved network printer/print server entry.',
      'Print a test page.'
    ],'The printer should show Ready and successfully print a test page.');
  }

  if(a.includes('check camera privacy')){
    return generic('Check camera privacy permissions','The operating system may be blocking camera access even when the hardware is healthy.',[
      family==='windows'?'Open Settings → Privacy & security → Camera and confirm camera access plus app access are enabled.':
      family==='macos'?'Open System Settings → Privacy & Security → Camera and allow the affected app.':
      'Open the device privacy settings and confirm camera permission for the affected app.',
      'Close and reopen the app, then test the camera.'
    ],'The app should be listed as allowed to use the camera.');
  }

  if(a.includes('select correct camera')){
    return generic('Select the correct camera in Teams','Teams may be pointing to a virtual or disconnected camera.',[
      'Open Teams Settings → Devices.',
      'Under Camera, select the physical camera you intend to use.',
      'Confirm the preview appears.',
      'Join a test call or reopen the meeting.'
    ],'A live camera preview should appear before joining the meeting.');
  }

  if(a.includes('switch directory/subscription')){
    return generic('Switch to the correct Azure directory and subscription','Access can fail simply because the user is in the wrong tenant or subscription context.',[
      'In the Azure portal, open the account/profile menu.',
      'Use Switch directory if necessary.',
      'Open Subscriptions and confirm the target subscription is selected/visible.',
      'Return to the resource and try again.'
    ],'The target resource should appear in the expected tenant/subscription.');
  }

  if(a.includes('activate eligible pim role')){
    return generic('Activate the required PIM role','Eligible Azure roles do not grant access until activated.',[
      'Open Microsoft Entra ID / Privileged Identity Management.',
      'Go to My roles → Eligible assignments.',
      'Select the required role and choose Activate.',
      'Provide justification/MFA as required.',
      'Wait for activation, refresh the Azure session and retest.'
    ],'The role should show Active and access should succeed if no other policy blocks it.','Use least privilege and activate only the role required for the task.');
  }

  if(a.includes('review activity log')){
    return generic('Review the Azure Activity Log','The Activity Log often states exactly which authorization check failed.',[
      'Open the affected Azure resource.',
      'Go to Activity log.',
      'Filter to the time of the failed action.',
      'Open the failed event and capture the authorization/error details.',
      'Use the failed action, scope and principal information for escalation.'
    ],'The failed event should identify the operation, scope and authorization error.');
  }

  if(a.includes('clear temporary files')||a.includes('approved disk cleanup')){
    return generic('Free safe disk space','Low free space can slow the OS and break updates or applications.',[
      family==='windows'?'Open Settings → System → Storage → Temporary files. Review items before removing them.':
      family==='macos'?'Open System Settings → General → Storage and review Recommendations / large files.':
      'Use the OS storage-management tool to identify safe temporary data.',
      'Remove only approved temporary/cache content.',
      'Keep user documents and business records unless explicitly approved.',
      'Recheck free space and retest performance.'
    ],'Free space should increase enough for normal OS and application operation.','Do not delete unknown system or business files just to free space.');
  }

  if(a.includes('check disk health')){
    return generic('Check disk health','Persistent slowness can be caused by storage errors or failing hardware.',[
      family==='windows'?'Open Windows Security / manufacturer diagnostics, and review Event Viewer for disk or storage errors.':
      family==='macos'?'Open Disk Utility, select the system disk and run First Aid if organizational policy allows.':
      'Use the approved storage-health or SMART diagnostic tool.',
      'If errors are reported, back up important data and escalate for hardware service.'
    ],'A healthy disk should show no critical SMART, filesystem or controller errors.','Do not run destructive disk-repair tools without authorization and backups.');
  }

  if(a.includes('run endpoint diagnostics')){
    return generic('Run endpoint diagnostics','This checks hardware and OS health when simpler fixes did not explain the issue.',[
      'Use the manufacturer or organization-approved diagnostic tool.',
      'Run CPU, memory, storage and network tests as appropriate.',
      'Record any error codes.',
      'If a hardware test fails, stop repeated software changes and escalate for repair.'
    ],'All core hardware tests should pass without error codes.');
  }

  if(a.includes('report message')||a.includes('notify security')||a.includes('security operations')){
    return generic('Escalate the suspected security event','Security incidents should preserve evidence and minimize additional interaction.',[
      'Stop clicking, replying, downloading or approving prompts related to the suspicious message.',
      'Use the organization’s Report Phishing / security reporting channel.',
      'Preserve the message, headers, screenshots and time of interaction.',
      'If credentials were entered or a payload was opened, tell Security exactly what happened.',
      'Follow Security Operations instructions for password reset, isolation or device collection.'
    ],'Security should receive enough evidence to investigate and contain the event.','Do not delete evidence or continue testing a suspected malicious link.');
  }

  return generic(action,'This is the next lowest-risk, highest-value step based on the evidence collected.',[
    `Perform: ${action}.`,
    'Use your organization’s approved procedure for this device and environment.',
    'Retest the original symptom immediately afterward.',
    'If you see an error, capture the exact message or code before continuing.'
  ],'The original symptom should improve or the step should produce new evidence for the next decision.');
}

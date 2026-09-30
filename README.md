# SupportQ

SupportQ is an interactive IT support and root-cause analysis decision engine built as a portfolio project.

## Highlights

- Tier 1 / Tier 2 troubleshooting workflows
- Evidence-driven decision trees
- Dynamic hypothesis scoring
- Root-cause analysis with confidence
- P1–P4 priority and severity handling
- Security and infrastructure escalation logic
- Incident history stored in the browser
- RCA analytics
- ITIL-style incident summaries
- Responsive, keyboard-friendly interface

## Scenario coverage

SupportQ includes scenarios across networking, VPN, identity, Microsoft 365, endpoint performance, printers, security, OneDrive, applications, Teams, Azure, and storage.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages

This repository is configured to deploy to:

`https://joshuanoc.github.io/SupportQ/`

> Portfolio/training demo only. SupportQ does not execute administrative changes and does not replace an organization's approved IT or security procedures.


## Diagnostic Engine V2

The Wi-Fi/no-internet scenario now uses an evidence-driven continuous diagnostic engine instead of a fixed checklist. It:

- collects only missing context that changes the next decision
- accepts pasted command output and error messages
- interprets common DHCP, gateway, ping and DNS signatures
- updates competing root-cause hypotheses
- selects the next test based on evidence
- provides OS-aware instructions and expected results
- continues after failed fixes instead of exhausting a static list
- calculates priority from scope/impact
- escalates only when evidence justifies a specialist handoff
- produces an evidence-rich incident summary

This deep workflow is the reference architecture for expanding VPN, identity, Microsoft 365, endpoint, printer and cloud scenarios.

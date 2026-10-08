# Final whole-branch independent review
Reviewer: /root/final_branch_review (gpt-6-astra). Result: CHANGES REQUESTED; 2 Important, no confirmed Critical.
Captured by controller from final review message: reviewer report write was not executed because automatic approval service reached a usage limit; no default-permission bypass was used.

## I1: actual recommended installed helper bypasses shared receipts
buildInvocation, app-v03.js fallback, new skills recommend submit_result.mjs. It directly writes task/artifact without common workspace/skill/schedule authorization/terminal receipt protection.
Isolated trusted-verifier fixture unauthorized publish occurrence: before task needs-input and occurrence pending-confirmation; installed Node helper exit0, after task needs-review, occurrence pending-confirmation, receiptCount0, artifactCount1. No actual publishing occurred.
Fix: new-contract submission uses canonical shared receipt pipeline; installed bridge may use real CLI, or reject unsupported new/scheduled task and update commands. Preserve safe legacy compatibility. Python fallback same direct-write risk not yet inspected.
Regression: installed helper unauthorized/terminal schedule rejects unchanged; normal new task writes structured receipt; Python same guard if applicable.

## I2: restored artifact URL escapes protocol checks
src/backup/service.ts structured artifacts validation permits same-workspace valid checksum javascript:alert(1) URL; web/views/results.js emits literal javascript href. HTML string/render reproduced; browser execution not asserted.
Fix restore HTTP/HTTPS-only plus legacy-safe renderer. Invalid URL rejection must occur before writes; ordinary URLs still work.

## Minor: daily startup recommendation gap
Profile complete without tasks/feedback gives empty dailyActions despite guided start goal. Add one true-context research/plan suggestion, never fabricate3–5 fillers. Consider recent artifacts/stage goals only where real context exists.

## Remaining coverage and evidence
Reviewed navigation/static graph, tasks/artifacts/current-hash review, shared schedule entry, backup path/schema/workspace/provenance, online-off default, customer skill preservation, delivery progress, launcher,ZIP/docs. Task9 evidence66tests and18ZIP read; no fullsuite repeated. Native WorkBuddy scheduling and authenticated online provider remain conditionally deferred, not defects.

# TASK031 — Human review workspace

Status: source implementation and focused automated checks; real isolated-project acceptance is recorded separately by the batch executor. No production deployment or production database change is authorized by this document.

## Actual extension

The existing `/reports/review` route, reviewer authorization, case detail, review action and audit history are reused. My Reports remains on the original owner-scoped route and shared components.

The reviewer workspace adds type, reason, status, outstanding-age, oldest/newest and exact UUID filters. Age means pending/under-review cases created more than 24 hours, 7 days or 30 days before the frozen query timestamp. It does not imply a legal processing deadline. Filters reset the page position. Pagination uses the strict `(created_at,id)` tuple in the selected direction, a 20-row page and one continuation row. The timestamp remains fixed across pagination, language switches and detail return links; a dedicated refresh starts a fresh query snapshot. Normal concurrent state changes can move a case out of its filter; this is not a historical database snapshot.

Scoped counts come from the authenticated `report_review_summary` RPC. They apply type, reason, age, exact ID and timestamp, but intentionally ignore current status and page cursor so all four status counts remain useful. Failures and malformed responses display an explicit unavailable state, never fabricated zeros.

Detail shows the stored version and last save time. Back links contain only normalized allowed query fields. The next-case link is obtained from an actual authorized query after the current tuple, restricted to pending/under-review cases in the same type/reason/age/order scope. It intentionally drops the exact ID and terminal-status filter and does not manufacture IDs.

## Conflict and draft safety

The review form snapshots the version when opened. Server revalidation cannot silently change the version of a draft. An actual optimistic conflict allows an explicit “refresh latest and retain draft” operation; it adopts the newly loaded version/status while retaining public result, reason and private note in component memory. No complaint text or note is placed in browser storage. If the old status transition is no longer valid, the next-state choice changes to a currently permitted transition. A terminal current state cannot be submitted.

Confirmed saves use the database-returned incremented version. Success remains visible after revalidation, and another review step requires a conscious navigation to the saved current result. Cache refresh failure is not presented as a failed database commit. Failed or mismatched acknowledgements do not display success.

## Permission and privacy boundaries

Both reviewer pages check the enabled state and trusted reviewer membership before querying any queue, summary or internal history. The summary RPC independently checks reviewer authorization. Case queries remain RLS constrained. No service key, client-provided reviewer ID, arbitrary SQL, free-form user search, complaint export or external AI call is introduced.

All new controls and feedback support Chinese and Korean. CSS provides bounded grid columns, wrapping IDs and minimum 44-pixel controls; actual 390/820/1280 browser results and keyboard checks must be recorded in the batch acceptance evidence. iPad physical-device acceptance remains PENDING without device evidence.

## Approval boundary

The new summary RPC migration and application changes require a separate production release review. Production reporting must remain OFF/OFF until the batch's reviewer identity, privacy-policy and operating-responsibility conditions are approved. This workspace does not delete content, suspend accounts, enable AI or authorize automatic retention cleanup.

## Actual isolated acceptance — 2026-10-26 KST

- Focused helper/action + existing019 regressions:35/35 PASS (23 new031 tests). TypeScript and diff check PASS.
- `20261026085144_reporting_review_workspace_031.sql` applied only to the verified test project. MCP ledger timestamp is `20261026085234`; same name/content, no historical repair/rename. The timestamp mapping must be handled in any future selective production plan.
- Real authenticated SDK:6/6 PASS. Scoped summary vs actual RLS count, anonymous/A/B denial, invalid filters, exact UUID, ascending/descending23 equal-timestamp records with no duplication or omission.
- Real localhost Chromium first batch:6/8 PASS,0 pageerror. Two failures were test assertions: a generic alert locator also matched Next route announcer and expected a different conflict string; a forbidden-page expectation used the action error wording rather than the page wording. Actual UI displayed conflict and access denial. Original records retained, no application behavior relaxed to satisfy them.
- Separate targeted browser recheck:2/2 PASS. Real stale version1→2 conflict; explicit refresh kept all three draft texts and adopted2; actual save returned3, case/history showed3/three events, internal note absent from reporter response. Ordinary direct queue/detail denied; original My Reports remained functional.
- Browser pagination20+3, filter-preserving back and actual authorized next-case query passed. KR390/820/1280px layout and keyboard focus passed. Real iPad/Safari remains PENDING.
- One scoped React/security retrospective completed: parallel independent reads, bounded21/1 queries, trusted gates before private reads, no sensitive browser storage or provider calls. Pre-2000 manual `asOf` is a minor safe-failure inconsistency (DB rejects it; UI displays unavailable), deferred rather than widening scope.

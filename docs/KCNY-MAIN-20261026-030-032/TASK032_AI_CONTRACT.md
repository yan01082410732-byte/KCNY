# TASK 032 — Main-site AI integration contract

Date: 2026-10-26 (Asia/Seoul). Scope: TASK A contract preparation only.

AI SERVICE: **NOT_CONNECTED**. MODEL TRAINING: **NOT PERFORMED**.
No provider SDK, inference call, network endpoint, model credential, database migration,
AI-owned file or billable resource is introduced. Existing community and human review
flows do not call these modules and continue independently.

## Actual code

- `lib/ai-integration-contract.ts`: `kcny.ai.v1` transport DTOs, exact-shape request
  and response validators, explicit unavailable/not-connected/error categories.
- `lib/ai-main-site-boundary.ts`: server-composition permission/text-loading adapters,
  four disconnected domain entry points, current visibility recheck for search IDs.
- `tests/ai-integration-032.test.mjs`: synthetic contract and permission-boundary tests.
- Existing `lib/report-ai-contract.ts` is unchanged. Its `ComplaintAiInput`,
  `ComplaintAiSuggestion` and `HumanReviewDecision` are imported/re-exported, not replaced.

## Four domains

| Domain | Minimum transport input | Output contract | Main-site condition |
| --- | --- | --- | --- |
| Translation | authorized text, exact CN/KR source and target, context | translation, model version, envelope status | trusted current-session authorization; source text loaded by main site; original text untouched |
| Search | query <=200 code units, CN/KR, `public_posts`, limit 1–20, optional bounded cursor | public candidate IDs and increasing ranks, index version, no-results status | every candidate ID rechecked against current main-site content visibility before use |
| Moderation | necessary post/comment text <=8000, stable ID, `risk_review` | suggestion category, risk, rationale, explicit uncertainty, model version | fresh moderator/content access check; no punishment command or action |
| Complaint | existing complaint DTO: ID, CN/KR, reason, text <=2000 and optional evidence <=2000 | existing suggestion plus envelope priority and model version | current reviewer/case authorization and minimum projected case data; no internal audit or reporter metadata |

All envelopes require the exact version, a valid UUID request identifier and matching
domain. Responses must match the expected request. Extra fields, unbounded pages,
duplicate search IDs, invalid ranks, unknown language/status/risk values, human decisions
inside AI output and credential/session-shaped fields are rejected rather than passed
through. Rankings are provider ordering information, not fabricated relevance scores.
Uncertain moderation output must explicitly declare uncertainty.

## Trust and privacy boundaries

`createMainSiteAiBoundary` is **not an authentication implementation**. Its callbacks
must be composed exclusively in trusted main-site server code using the real current
session and authoritative permissions. They must never be supplied by request JSON,
client state, user metadata or a previously cached reviewer boolean. Every invocation
calls authorization again before loading text. An unavailable permission service fails
closed, and a removed/inaccessible resource does not become authorized by its ID alone.

Translation and moderation entry commands accept references, not arbitrary client text.
The main-site loader supplies text after permission checks. Complaint commands accept
only a report ID; the loader must return the existing minimal complaint DTO for that
same ID. Search accepts only the current public-post scope. Consumer visibility checks
run for **every** returned post ID and retain only verified visible entries in the
original ranked order; any loader exception fails the whole read closed.

These are field-minimization controls, **not a guarantee that complaint prose contains
no personal data**. No prose is transmitted anywhere in this phase. Future connection
requires an approved recipient/service contract, purpose, privacy/retention controls,
operational ownership and a separate integration authorization. Never attach identity,
email, token, cookie, session, reviewer membership or internal audit objects to DTOs.
No raw request, complaint text or raw provider exception is logged by these modules.

`source: "ai_suggestion"` and `source: "human_decision"` remain disjoint. Contract output
cannot update human decisions, case state, audit records, posts, accounts or privileges.
Failure or disconnection cannot roll back or block an existing legal complaint submission
or human review because neither workflow depends on AI in this phase.

## Compatibility and future TASK B handoff

The existing complaint types remain source-compatible. Version/model/priority metadata
is carried in the new envelope, without adding required fields to those old types.
CN/KR values match the main site; no automatic translation of stored user-generated
content is introduced. Limits are deliberately bounded; a future change that alters
meaning, accepted enum values or required fields must use an explicitly reviewed new
contract version rather than accepting arbitrary extras.

The tests use synthetic adapters and responses. They prove local validation/order and
fail-closed behavior, **not** actual service connectivity, production permissions, model
quality or deployed role revocation. No real TASK B service has been examined or assumed
compatible. TASK B remains responsible for models, inference, semantic search,
classification, translation generation and risk recommendations. TASK A remains
responsible for permissions, data operations, display and all human decisions.

Before connecting any service: bind real current-session adapters, obtain approved TASK B
contract and infrastructure ownership, validate both sides' version/limits, confirm
data handling and costs, perform separate authorized isolation/permission tests, and
retain NOT_CONNECTED when the service is missing. There is no hidden enable flag or
fallback to an unapproved provider. This phase does not authorize AI integration.

## Actual local verification

2026-10-26 KST: focused synthetic contracts40/40 PASS, no skipped/cancelled tests. Existing complaint contract diff is empty. Independent read-only security review found no critical issue within the disconnected scope. Sparse search arrays and hostile unknown-object traps fail closed. No actual provider/session/database adapter is claimed connected.

First development TypeScript run exposed an error-union narrowing issue; it was corrected using the explicit error discriminant. Targeted TypeScript recheck passed. The final entire-suite run is624/624 PASS (533 historical +28 operations +23 workspace +40 contracts), TypeScript PASS and local optimized production build PASS. The build uses only the verified independent-test-project public configuration; it is not a deployment or production artifact authorization. No SDK/provider/dependency changes or model calls. MODEL TRAINING: NOT PERFORMED.

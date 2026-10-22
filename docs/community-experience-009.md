# KCNY community experience — 009

Status: implemented locally on `fix/stability-security-foundation`. No database, production, or AI-module change; no commit/push/merge.

| Capability | Status | Evidence / boundary |
|---|---|---|
| Comment draft preservation | Implemented | Server action returns success/error state. Failed submission leaves controlled text intact; per-viewer, per-post sessionStorage survives same-tab remount. Draft is removed only after confirmed insert success. |
| Reply draft preservation | Implemented | Same behaviour, additionally keyed by parent comment; cancel/hide does not erase the draft. |
| Duplicate submission prevention | Implemented in UI | Pending button disable plus synchronous ref gate block rapid same-form duplicate sends. Ambiguous network retries remain a documented residual risk; no unauthorized database idempotency migration. |
| Bilingual feedback | Implemented | CN/KR auth, missing-post, permission, network, validation and submit failure copy. Error messages do not expose raw Supabase failures. |
| Profile posts | Improved | 20-post deterministic `created_at DESC, id DESC` keyset pages with first/more links; query error is separate from true empty state. |
| Profile social information | Improved | Existing follow counts/actions reused. Failed count/relationship fetch shows an error and suppresses a potentially incorrect follow toggle. Follow-list fetch errors no longer appear as empty lists. |
| Community navigation | Reviewed | Search → profile, notification → target comment/post/profile, following feed → post, profile → post, post → comment/reply use existing routes; profile pagination preserves language. No duplicate feature rewrite. |
| Loading and responsive UI | Implemented/static review | Profile loading boundary and existing mobile styles reused; no confirmed overflow. Real browser acceptance remains pending. |

Verification: 363/363 automated tests, TypeScript and production build passed on 2026-10-20. Browser acceptance was not run in this task. Existing task 007/008 source changes and untracked reports remain in place.

Targeted retrospective: replacing failure redirects with structured action results removes the direct cause of lost text. Success is signalled only after the insert responds without an error. The remaining uncertainty is a transport failure after server commit; without a separately authorised idempotency mechanism the client cannot prove whether that write occurred, so users are asked to check before retrying.

Next priority: authenticated Preview acceptance for draft failure/success and profile navigation, then bounded follower/following list pagination if product scale calls for it. Historical ERR_ABORTED observations and the reply-integrity migration remain separate coordination gates.

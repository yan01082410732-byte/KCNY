# Controlled production request — TASK036–038 (NOT AUTHORIZED / NOT EXECUTED)

Base: `2a1217f4b4714a665e516a3f31f8489d2809011a`. Preserve exact future reviewed final checkpoint; do not substitute old main, AI search HEAD, or a Preview build.

## Exact ordered additive migrations

1. `20261029122609_following_feed_bounded_036.sql`
   SHA256 `8148EBB8C79C53BB702615D971C0183080C13A59EA16530BF3CA6D4725FD5169`
2. `20261029122611_comment_request_idempotency_037.sql`
   SHA256 `D6784233248CC4FF7CA18A5BEF7F2F2FC11713D246190F3CDD377D78B0A773F1`

Hashes refer to original LF file bytes. Supabase MCP allocated test ledger versions `20261029123017` and `20261029125234` by those migration names; it serializes statements, so joined ledger statements are not byte-identical to file text. All **five normalized function body SHA256 hashes** match local source and live test definitions. No ledger repair or historical file rename was performed.

Dependencies: existing public posts/profiles/follows/comments/notification schema; parent-comment field and tested reply-integrity trigger; notification preferences already installed. No pending reply/history migrations may be silently included. Before approved production installation, recheck target `czcyarmramlpmilfhpqo`, actual dependencies and exact current function/policy state narrowly; stop on conflicts. Never use an all-pending `db push`.

036 creates one author/keyset index plus authenticated invoker RPC. 037 adds a nullable comments request UUID, private receipt table/RLS, two private trigger helpers and two authenticated invoker RPCs. Existing rows/data unchanged; old clients without keys retain previous behavior. New app must be released only **after** both approved migrations. Receipt table is own SELECT only, no client writes; private trigger helper EXECUTE revoked. No notification triggers, media, reporting policy or AI functions replaced. Both migrations have five-second lock timeout and explicit transaction; index/table-trigger DDL still requires short locks. On timeout/error stop, inspect actual state and do not broaden privileges or replay unrelated migrations.

## Release and stop conditions

Separate owner approval needed for production DDL, exact application deployment and polling load. Record current live deployment rollback target at execution time. Build fresh with verified Production public client configuration; never reuse test build or sessions. Stage Production build without domain assignment, perform read-only checks, then promote only after gates. Reporting remains OFF/OFF; media uploads/Cron remain as-is; AI remains not connected.

Rollback application to recorded prior release if core errors/privacy problems appear. Keep additive RPCs/index/column/journal/tombstones: do not DROP receipts or comments to roll back. Old app loses the new idempotency UX, so do not automatically reissue unresolved keyed requests with new IDs. Stop new comment submission rather than guessing outcomes. Notification polling can be removed by application rollback; no cloud schedule exists to remove.

Receipt metadata (UUIDs, original payload hash, tombstone) has no comment-body copy but is not anonymous; future retention/privacy handling must preserve retry/tombstone safety. No automatic purge is installed. Large follow-graph fixture users/posts are synthetic, test-only, credentialless authors; preserved for reproducibility. No promise of permanent zero hosting cost; no paid resources were purchased.

## Remaining acceptance boundaries

- Naturally expired signed-session UI case has not been exercised; unit classification and real anonymous denial are separate evidence. Complete before claiming the entire requested acceptance matrix is closed.
- Private posts/social graphs are not existing data contracts; own-feed identity and receipt isolation were tested without pretending public records are private.
- Real iPad/Safari hardware remains PENDING; Chromium viewports passed.
- Following-feed service outage has not been induced on the actual database; validation/error-path unit coverage is not an outage/recovery claim.
- No production execution, push, deployment, or paid AI call is authorized by this document.

# TASK040 — controlled community release scope

Source: `33eb15855dff03d9755f17d3d6e58d039d3eddc2`. Dedicated branch `codex/release-community-20261030-040` preserves source ancestry and all036–039 evidence; original worktrees remain untouched. No main merge, force push or history rewrite.

## Exact approved database sequence

Target Production `czcyarmramlpmilfhpqo`, after independently verifying project KCNY identity. Apply each original Git payload once, transactionally, with its original5s lock timeout; stop on conflict, invalid relationship or timeout. Never run all-pending db push or rewrite a historical migration.

1. `20261013173533_enforce_comment_reply_integrity.sql` — original Git LF SHA256 `74F58128F8271E6199811F8878814C78A59291B22ED71CA052D0CB0E7ECF5CBD`. Prior checksum `89F3895EFF2723D7768513C825D10388E5A1347EEDC4C400275394E9E5F3FCE9` is the **same text with CRLF**; this conversion was reproduced, not used to alter the Git blob. No SQL semantic change.
2. `20261029122609_following_feed_bounded_036.sql` — SHA256 `8148EBB8C79C53BB702615D971C0183080C13A59EA16530BF3CA6D4725FD5169`.
3. `20261029122611_comment_request_idempotency_037.sql` — SHA256 `D6784233248CC4FF7CA18A5BEF7F2F2FC11713D246190F3CDD377D78B0A773F1`.

Narrow preflight observed6 production comments,0 replies,0 invalid relations and absent new objects. The historical payload rechecks under SHARE ROW EXCLUSIVE lock before creating the trigger. Record actual platform-assigned ledger versions against these source filenames; no unrelated ledger repair.

Installed test definitions match source: reply-integrity body `84d790ea22ceb5a48d61cc61544314690a09bf23f897308a846d75388d5f3f1f`, plus all five036/037 normalized bodies already verified. Legacy unkeyed comment/reply inserts remain valid because request_id is nullable and the claim trigger returns NEW when absent. Ordinary user test proved direct invalid cross-post reply rejected, three concurrent keyed submits yield one comment/notification, other users cannot read receipts, deleted keyed comments remain tombstoned. No production synthetic mutation is permitted for acceptance.

## Resource gate and bounded notification release

Live organization plan Free; Vercel team Hobby. A current24h log aggregation returned72 edge log records, not a complete billing/request meter. Full current monthly egress headroom could not be established from available access. Unlimited API request pricing is not unlimited shared CPU/egress capacity.

Therefore **periodic polling is default OFF** through new build-time opt-in `NEXT_PUBLIC_KCNY_NOTIFICATION_POLLING_ENABLED`. Production metadata showed it absent; no existing production variable was changed. Focus, online, visibility-restored and read invalidations still load the authenticated recipient count. Existing auth/RLS/stale-result/abort protections stay active. Do not enable this opt-in until capacity/traffic review is separately satisfied. This release may be reported DEPLOYED_PARTIAL, not fully enabled038 idle polling.

Opted-in behavior remains25s /10s timeout /50,100,120s backoff; SDK can make4 idempotent wire attempts per load. Baseline always-visible idle polling would be103680 reads/30days/tab, multiplied by visible tabs; no global leader exists. Default-OFF release adds **zero autonomous periodic requests** while idle, not zero user-triggered reads.

## Git and deployment

`vercel.json` explicitly disables Git auto-deployment for this exact release branch, retaining the old034 guard. No CI workflow exists in the reviewed source. Verify remote branch is absent or fast-forward compatible, review staged source/config/tests/docs and exclude env secrets, browser state, images/traces/caches before authorized push. No additional migration is created by this release.

Project `prj_7Q90QVY7HilMNGKK7wxdgnXNjfIs`, team `team_s5ssiZaSYWtndwapRbti6Dxs`, project name kcny. Current live/rollback deployment at preflight: `dpl_8w3YX5j44qQe9yvP6587CMcyDGCd`, source `2a1217f4b4714a665e516a3f31f8489d2809011a`, domain `kcny.vercel.app`. Revalidate before promotion; stop if newer production source appears.

Use existing authorized Vercel login and exact linked project. Production-config remote build only: `vercel deploy --prod --skip-domain --scope yan-s-projects24`. Local test-project build must never be deployed prebuilt as Production. Confirm READY, exact release source, production backend/site/client configuration and read-only staged routes/assets; only then promote the verified Production deployment. Do not promote a Preview as equivalent evidence.

Keep media Storage/functions/writes/Cron unchanged; reporting OFF/OFF; AI/TASKB/search/065R unchanged. No paid resources. Public and existing legitimate-session checks only on Production, never synthetic posts/comments/accounts. Natural session expiry, real DB engine outage and actual iPad remain PENDING, not PASS.

## Failure handling

If tool/platform policy rejects a production write, stop that path; no alternate SQL editor/CLI channel, privilege widening or indirect bypass. Preserve local candidate and actual zero/partial execution result. A staged build does not count as live. Exact runtime/deployment/ledger receipts belong in the external TASK040 evidence, not invented here.

Application rollback target remains the recorded preceding deployment, after checking old app compatibility with additive migrations. Keep original comments, notifications, users, images, receipts/tombstones and audit. Do not DROP data to undo the release. If rollback cannot preserve safe retry behavior, stop affected new writes or fix forward under explicit authority. Default-OFF periodic polling needs no production cron teardown.

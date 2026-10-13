# Reply integrity migration review

Status: prepared only. Not applied remotely.

Migration: `20261013173533_enforce_comment_reply_integrity.sql`.

## Verified remote baseline

KCNY only. Read-only inspection found the parent self-FK with ON DELETE CASCADE,
public SELECT, owner INSERT/DELETE, no UPDATE policy and no reply integrity trigger.
Counts on 2026-10-14: missing parent 0; cross-post 0; nested reply 0; self-parent 0.
Recheck these counts immediately before an authorized application.

## Enforcement

A SECURITY INVOKER BEFORE INSERT OR UPDATE trigger reads the parent under the
existing public read policy. It rejects missing, self, cross-post and nested
parents with generic SQLSTATE 23514. The existing FK remains the final existence
and delete-race boundary. No privileged client or new RLS policy is introduced.

Comment id, post_id and parent_comment_id are immutable on UPDATE, including
for top-level parents. This closes both child reparenting and parent conversion /
post-move races. Content-only updates, if authorized by a future policy, still
validate the relationship. IDs, authors, timestamps, existing data and cascading
deletions remain unchanged. No new fields or AI components.

## Installation / locks

One transaction, lock_timeout 5 seconds, explicit SHARE ROW EXCLUSIVE lock on
comments. Reads continue, concurrent writes wait. The compatibility scan and
trigger installation occur under the same lock so invalid rows cannot arrive
between them. There is no table rewrite. Scan time depends on table size; schedule
in a quiet period and abort/retry later if lock timeout occurs.
Any incompatible data aborts the transaction; no rows are repaired or deleted.

## Rollback

Before commit, transaction failure rolls back all DDL automatically.
After application, an explicitly reviewed compensating migration can remove
`comments_enforce_reply_integrity` and its function, restoring the prior enforcement
without touching rows. Do not disable the trigger to bypass an application error.
Rollback weakens the security boundary and needs separate authorization.

## Direct API verification after application authorization

Use ordinary A/B authenticated clients, never a privileged key:

- Valid same-post top-level parent -> one reply inserted.
- Missing parent, another post's parent, reply-as-parent, self-parent -> rejected.
- Own author_id remains enforced by RLS.
- Authenticated UPDATE attempts remain blocked by the existing no-UPDATE policy.
- In an isolated local database with explicit test UPDATE grants, attempts to
  change child's parent/post/id or convert/move a parent must get 23514.
- Content-only UPDATE remains valid; parent delete cascades replies.
- Concurrent parent structural update vs reply insert: update must be rejected.
- Recount orphans and clear only the test users' temporary content.

Remote mutation tests are intentionally pending until migration application is
authorized. Source tests are not reported as remote database enforcement PASS.

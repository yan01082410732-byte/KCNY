# TASK 019 — targeted database security review

2026-10-23. Verified only test project `kirvcbkbkvotnsqnbcyf`. No whole-site historical review or production change.

| Boundary | Catalog + genuine session evidence |
|---|---|
| Anonymous | reports SELECT false; all four RPC EXECUTE false. Real anonymous select/submission denied and UI redirects to login. |
| Ordinary users | reports SELECT only, RLS owner filter; INSERT/UPDATE/DELETE false. Private schema USAGE false and all four private tables SELECT/write false. Real cross-user read returns zero rows; state mutation 42501; private membership/history inaccessible. |
| Reviewer | Same ordinary authenticated role, with one private membership row. RPC rechecks current membership, not mutable Auth metadata. Revocation rejects API/history/page. No super-admin or service_role used. |
| SQL functions | Four guarded SECURITY DEFINER RPCs, `search_path=''`, schema-qualified references, no dynamic SQL, no caller-supplied actor. Public/anon execute revoked. Expected version + row lock and atomic audit. |
| Audit | Separate private table, no client grants, immutable UPDATE/DELETE trigger. Actual audit insert failure rolled back the case change. Temporary fault control removed and recovery passed. |
| Case retention | Target/reporter not cascading FKs; deletion trigger prevents ordinary case deletion and private audit references remain. Real disposable-target deletion preserved case and idempotency retry. |
| Activation | Exact isolated-project allowlist + server opt-in + database opt-in; default off. API/UI tested with server flag off and DB flag off independently. Operational disablement should set both layers off. |
| Output | Explicit REPORT_FIELDS excludes reporter_id/actor_id/internal_note/decision_reason. Reporter can read own allowed row data; reviewer history is a separate authorized RPC. Synthetic internal markers and reviewer UUID absent from reporter HTML/RSC responses. |

Catalog query confirmed RLS on all five tables, no authenticated direct write grants, no anonymous reporting RPC execution, and no private-schema access. Final membership count one; existing A/B membership count zero. No fault-control function remains.

## Advisor findings (not falsely claimed clean)

Four private tables produce INFO [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): intentional deny-all, private unexposed schema, no schema usage/table grants; only guarded narrow definer RPCs access them. Do not add permissive client policies to silence the lint.

Four new RPCs produce WARN [authenticated SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): intentionally exposed authenticated RPC boundary; fixed search_path, full qualification, session/role/flag checks, no direct write grants and real denial tests were verified. The warning is retained as a reviewed design exception, not removed by broadening privileges.

Inherited unrelated warnings remain: [mutable search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) on `set_updated_at`; [anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and authenticated execution on existing `create_profile_for_new_user`; [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No paid upgrade or Auth policy adjustment was made. These are not evidence that reporting's new RPCs permit anonymous access.

## Remaining design/operational limits

- Target existence checks deliberately reflect the current public SELECT contracts for posts/comments/profiles. If private/hidden content is introduced, target-access validation must be revised before allowing such targets. Only stable IDs, not deleted-content snapshots or private Auth metadata, are retained.
- Ten new cases per user per hour is basic application protection, not a site-wide anti-abuse system. Idempotent retries do not consume another slot. Retention/appeal/operational reviewer-management policies require owner decisions.
- Reviewer provisioning/revocation is management-only. There is no public self-enrollment or new global admin authority. Synthetic reviewer initialization is not in reusable migrations.
- Current code intentionally cannot activate against Production. Production needs separate authorization and exact dependency/configuration review; no test user ID or test data may be copied.

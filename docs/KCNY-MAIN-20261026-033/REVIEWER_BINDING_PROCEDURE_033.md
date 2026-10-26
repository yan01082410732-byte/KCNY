# TASK 033 — Trusted reviewer identity binding procedure

Date: 2026-10-26 (Asia/Seoul). This is an executable preparation procedure, **not an
authorization to grant a production role**. No production reviewer has been designated
or granted by this work. Production reporting remains OFF/OFF. Final release testing
and any subsequent owner approval are recorded separately; this document makes no
pending test PASS claim.

## Two separate decisions

1. **Account holder self-confirmation:** the already authenticated, confirmed account
   holder confirms the UUID shown by the main-site server. The server produces a
   short-lived signed identity receipt. This is not a password, login token, role,
   proof that the person owns the KCNY project, or authorization to process cases.
2. **Independent trusted manager approval:** a trusted manager must separately establish
   that the exact UUID belongs to the explicitly approved project owner and verify an
   approval record. Only an authorized management channel may then grant the narrow
   case-reviewer role. A receipt on its own never authorizes this step.

Never infer owner identity from a display name, similar email, registration order,
the most recently logged-in browser, client metadata or a synthetic test account.
No real UUID, secret, password or receipt is seeded into a migration.

## Implemented files and default-OFF configuration

- `/reports/reviewer-binding?lang=CN` or `?lang=KR`: bilingual confirmation page.
- `components/ReviewerBindingConfirmation.tsx`: explicit checkbox, duplicate-submit
  guard, current UUID, expiry display and receipt text. No browser-storage persistence.
- `app/reports/reviewer-binding/actions.ts`: fresh `auth.getUser()`; rejects missing,
  anonymous or unconfirmed users. UUID/project/origin come from the verified session
  and trusted environment, not hidden client identity fields.
- `lib/reviewer-binding.ts`: environment allowlist, HMAC creation/verification and
  preparation of a controlled grant SQL draft.
- `ops/prepare-reviewer-binding-033.mjs`: local preparation only; opens **no database
  connection** and executes no SQL.

The sample flag is `KCNY_REVIEWER_BINDING_ENABLED=false`. Missing/false flag, missing
or malformed private key, incorrect project/environment/site combination, or an
unavailable auth service keeps receipt generation disabled. Merely opening the URL
does not enable anything. This flag is independent of reporting enablement: identity
confirmation must not require opening public report submissions.

For a separately approved installation, all of these must match:

| Configuration | Independent local test | Production identity confirmation, future approval only |
| --- | --- | --- |
| `KCNY_REVIEWER_BINDING_ENABLED` | explicitly `true` during approved local verification | default `false`; change only under explicit release/config approval |
| `NEXT_PUBLIC_SUPABASE_URL` | exactly `https://kirvcbkbkvotnsqnbcyf.supabase.co` | exactly `https://czcyarmramlpmilfhpqo.supabase.co` |
| `NEXT_PUBLIC_SITE_URL` | exact active `http://localhost:<port>` origin | exactly `https://kcny.vercel.app` |
| `VERCEL_ENV` | non-production | exactly `production` |
| `KCNY_REVIEWER_BINDING_SECRET` | private independent server secret | private production server secret supplied by an approved secure configuration channel |

The secret must be canonical base64url encoding of 32–64 cryptographically random
bytes. Never use a `NEXT_PUBLIC_` name for it, put it in Git, pass it as a CLI argument,
print it, or distribute it to account holders. Use environment-specific secrets. This
procedure does not create or read a production secret or modify a deployed environment.
No Preview-to-production connection is authorized by the allowlist.

## Account-holder step

After the correct official page has been installed and explicitly enabled:

1. The intended owner signs in through the official site using their own confirmed
   normal account. Password, OTP, passkey and device verification remain in provider UI.
2. Open the confirmation page; check that this is the intended logged-in account and
   confirm the displayed UUID. Do not switch to another account during the process.
3. Tick the explicit self-confirmation checkbox and submit once. Success means only
   **receipt generated; reviewer permission not granted**. Failure shows no success.
4. Pass the receipt only through the approved private channel to the trusted manager.
   Do not put it in chat, screenshots, public tickets, source control or general logs.
   The page does not save it in localStorage/sessionStorage. It is hidden on expiry.

The signed payload is limited to version, purpose `self_confirmation_only`, current
user UUID, exact project reference and site origin, random request UUID, issuance time
and expiry. It contains no email, password, session cookie or Auth token. HMAC-SHA256
is domain-separated, signature comparison is timing-safe, and lifetime is 15 minutes.
Client-side expiry display is informational; preparation and database execution check
time again. Expiration requires a new genuine confirmation, not a changed timestamp.

## Trusted manager preparation (does not grant)

Preconditions:

- An independently recorded approval identifies the exact owner UUID and the narrow
  reviewer role. The manager has verified this through a trusted ownership process,
  not by treating the receipt itself as proof of project ownership.
- The manager knows the expected project and origin independently of receipt content.
- The current private environment provides the correct binding secret securely.
- The necessary approved reporting operations migration and its management function
  exist in the intended database **before any future grant execution**. TASK 030's
  `reporting_private.set_reviewer` is a dependency; application deployment alone does
  not install it. Production migration execution is outside this preparation task.
- Receipt and output paths are private, repo-external files, not transferable artifacts.

Preparation command shape (placeholders only; do not paste secrets into the command):

```text
node --experimental-strip-types ops/prepare-reviewer-binding-033.mjs
  --receipt-file <private-receipt-file>
  --project-ref <independently-verified-project-ref>
  --origin <independently-verified-exact-origin>
  --approved-owner-id <independently-approved-owner-UUID>
  --approval-reference <verified-approval-record-reference>
  --output <new-private-SQL-draft-file>
```

Supply the named arguments in a single actual command. The approval reference must be
5–40 characters from the implementation's bounded allowlist (letters/digits plus
`._:/-`, beginning with a letter/digit). The script verifies signature, lifetime,
version, purpose, project/origin and exact approved UUID. It does not accept a raw
receipt argument or output the receipt. It uses exclusive file creation (`wx`) and
will not overwrite an existing draft. Its success output says `DRAFT_PREPARED`,
`databaseConnected:false`, `roleGranted:false`; this must never be described as a grant.

The public `buildReviewerGrantDraft` helper is not an independent authentication gate:
call it only after successful receipt verification, as the preparation script does.
Do not bypass the script with a fabricated typed object.

## Future approved management execution and verification

This section is a future procedure, not an operation performed in TASK 033.

1. Reconfirm the target through the authorized management channel. The generated SQL
   includes the intended project in a comment, but **does not independently identify
   the connected Supabase project**. The manager must verify the actual connection
   before executing it; a filename or copied receipt is insufficient.
2. Recheck independent owner approval, exact UUID, migration prerequisites, current
   Auth-user existence/confirmation, and current receipt expiry. Do not change the
   draft's UUID, nonce, project assumption or expiry to make a failed proof pass.
3. Only under separate grant authorization, execute the reviewed draft using the
   restricted management channel. It requires `current_user='postgres'`, obtains a
   nonce-specific transaction advisory lock, checks real database `clock_timestamp()`,
   rejects a nonce already present in immutable membership history and calls the
   existing narrow management function. The grant and nonce-consumption event commit
   together or roll back together.
4. The management function independently rejects nonexistent, deleted, anonymous or
   unconfirmed Auth users and records actor, granted/revoked state, changed flag, time
   and approval reference. The membership table and event table remain private.
5. Read back the exact membership and audit event; use the real account's fresh
   authorized request to confirm intended case-review access. Do not use a service-role
   success result as proof of ordinary session permissions. Granting this narrow role
   must not enable reporting submissions or confer unrelated administration rights.

Replaying the same nonce must fail, including after a later role revocation. Disabling
the page or allowing a receipt to expire does **not** revoke an already granted role.
Preserve minimum approval/audit evidence; discard obsolete raw receipt copies under
the approved operational handling rule instead of including them in normal logs.

## Audited revocation and failure handling

Use the existing authorized management operation
`reporting_private.set_reviewer(<exact UUID>, false, <verified revocation reference>)`
only under an explicit approved revocation decision and after target verification.
It removes the narrow membership and appends an immutable event in one transaction.
Do not delete or rewrite membership events, cases, internal review history or retention
records. The next case-review request must query current trusted membership and be
denied; a previously rendered page is not proof that permission remains valid.

Malformed/expired proof, unknown owner binding, missing independent approval, wrong
project, failed Auth verification or unavailable management dependencies means stop
**the grant**, retain safe diagnostic evidence and leave permissions unchanged.
Never widen grants, bypass confirmation, disable immutable triggers or downgrade the
project check to overcome a failure. Ordinary account use may continue independently.

Operational rollback is to disable new receipt generation, and, if a separately
approved grant was incorrect, perform an audited revocation. Secret rotation invalidates
outstanding receipts but does not replace role revocation. It must not erase cases or
audits. Production report/operations and privacy-policy gates remain separately governed.

## Current status and remaining owner action

This implementation prepares a secure confirmation mechanism; it does not identify or
appoint the production reviewer. No production grant, deployment, Auth change or new
database object was performed by this procedure. The existing missing reliable
production owner-account binding remains a release condition. After the route/config
and relevant production changes receive their own approval, the single account-holder
action is to complete the official-page self-confirmation above; the trusted manager
must still verify independent owner approval and perform any separately authorized grant.
Final test counts and actual replay/revocation evidence belong in the TASK 033 acceptance
record, not inferred from the presence of this document or its SQL draft.

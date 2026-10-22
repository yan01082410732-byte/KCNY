# KCNY search and discovery — 008

Status: implemented locally on `fix/stability-security-foundation`; no deployment or database change.

| Capability | Status | Evidence / boundary |
|---|---|---|
| Post title and body search | Implemented | Separate bounded ILIKE queries, deduplicated by post ID; no user-supplied raw PostgREST `or` expression. |
| User search | Implemented | Public username/display name only; username matches precede display-name-only matches. No Auth metadata selected. |
| Category and content-language filters | Implemented | Validated against known category and CN/KR values; URL-preserving form. |
| Sort | Implemented | Recent uses `created_at DESC, id DESC`; title-first relevance is a deterministic grouping, not a fabricated score. Popularity deferred. |
| Pagination | Implemented | 20-result bounded pages and validated keyset cursors; branch queries fetch at most 21 rows. Changing query/filter/sort clears the cursor. |
| CN/KR UI and responsive styles | Implemented | Bilingual labels, loading/empty/error/retry states, 700px and 340px layout rules. Real-device acceptance pending. |
| Data security | Reviewed | Existing RLS remains the visibility boundary; results expose only existing public fields; error text does not leak database details. |

Validation: 356/356 automated tests, TypeScript, and production build passed on 2026-10-20. Search has not been browser-accepted against Preview in this round. Historical 28 ERR_ABORTED cases remain unchanged. Task 007 source and reports were preserved.

Next: perform real non-production browser acceptance with Chinese/Korean search text, filters, page boundaries and mobile widths when a suitable browser is available. Then prioritize draft-preserving comment composition from the existing backlog.

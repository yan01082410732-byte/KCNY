# KCNY settings and profiles — delivery 013

Date: 2026-10-21 KST. Main-site source only. No database, Production, or AI-module change.

| Area | Delivered | Remaining acceptance |
|---|---|---|
| Profile editing | Existing display name, biography and preferred language form retained; claim-scoped update now confirms a returned row and refreshes the public profile. Username remains read-only because changing it is not an existing product contract. | Authenticated non-production save/error browser test |
| Draft recovery | Public profile fields are kept in username-scoped session storage during editing; failure redirects restore the draft and success clears it. Storage unavailability leaves the mounted form editable. | Browser remount and storage-disabled test |
| Settings | One responsive account-settings page contains public profile editing, notification-centre navigation and an honest notification capability description. | Mobile/tablet visual acceptance |
| Language | Explicit `lang` takes precedence; a validated preference cookie persists across reloads/navigation and invalid values fall back to CN. Profile/bookmarks settings language links now update URL and HTML language. | Real browser route and hydration acceptance |
| Notifications | Existing read-one/read-all works through the notification centre. No persisted per-type preference contract exists, so no cosmetic toggle was added. | Separate schema/product decision if preferences are wanted |
| Bilingual | Header navigation and settings copy cover CN and KR. User-generated content remains untouched. | Full flow copy audit in browser |

Targeted retrospective: a zero-row profile update could previously appear successful, and some client-only language switches left URL/HTML language behind. Both paths are corrected in source. No confirmed critical defect remains in this section. Existing RLS policy restricts profile updates to the signed-in row; the action also scopes by verified claims. Browser acceptance remains pending.

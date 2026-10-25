# TASK 024 — TASK 023 diff hash reconciliation

Source remains Git commits `221d9fc3134bc8f91d664bcaa0c90908ca519cd6`
and `89ac252a6c5fd7f1a79fbf8d9b17fa60db40f839`; no source was changed to match a hash.

The fresh eight-source-file `git diff --no-ext-diff` export is 24,062 bytes,
319 LF lines, SHA256 `A87150085788C84D690C2B588F87313D0DC81C0ED33E6B177F4CAF5D212C47DB`.
It matches the preserved TASK 023 on-disk artifact exactly.

The reply's pasted version accidentally expanded one hunk-heading context word:

```diff
-@@ -21,6 +46,8 @@ export async function uploadPostImage(postId: string, file: File, expectedVersio
+@@ -21,6 +46,8 @@ export async function uploadPostImage(postId: string, file: File, expectedVersion
```

That adds one ASCII `n` to the hunk heading only. Reproducing precisely this
single-byte change yields 24,063 bytes and exactly the reported pasted LF hash
`EAF956038F8926E1BD42970C35A0949A41F12E80231346C7B6B0B631EE7645DB`.
This is not a CRLF explanation or a source/body change. Both original records
are retained. Use the fresh Git export, not the retyped chat diff, for release.

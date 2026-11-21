# Staging verification and release gates

Status: draft review only. Do not merge, release to production, or use real student data until the gates below are resolved.

## Checks on previous draft (bbe072c5a2a90790e411bdbb90865e783bc87f35)

- A signed-out visit to the staging dashboard redirected to login. The deployed app files checked matched the draft except for Netlify's injected preview scripts.
- A confirmed test account reached the dashboard using a one-time link with an explicit login callback. A default root-targeted link did not result in sign-in. No credentials or links are included here.
- Using fictional data only, sample review generation and Clear worked. A replacement warning preceded a damaged PDF; accepting it cleared the old submitted text and report, and showed an error. A fictional two-page PDF was extracted and produced a review. Sign-out returned to login and subsequent direct access redirected to login.
- Previous local checks: 21 mocked-extraction browser checks and 25 fictional DOCX/PDF browser checks passed. They bypass authentication and do not establish server authorization.

## New changes in this draft

- Root callback forwarding preserves fragment callbacks through the fixed same-origin login destination. The transport also preserves query parameters without adding PKCE code-exchange support. See `node test-root-callback.cjs`.
- The dashboard listens for signed-out auth events, hides its UI, redirects, and prevents late validation from reopening it. See `node test-cross-tab.cjs`.
- These are offline mocked tests. Retest the latest deployed preview with a genuine test-account email link, browser tabs and sign-out after deployment. Do not log callback URLs or tokens.

## Open gates

- Editing assignment metadata or submission can clear lecturer notes without warning; investigate and fix before relying on notes.
- Verify actual print/PDF output and complete pending import, replacement cancellation and edge-case tests in authenticated staging.
- Verify session refresh, expiry, revocation, account switching, cross-tab behavior and callback errors with the actual SDK; verify signup and confirmation settings and exact callback allowlists for the separate staging project.
- Client-side gating is not authorization; any confirmed account can reach the UI and static files remain retrievable. Do not accept real student data without server-enforced roles and ownership, deny-by-default database and storage policies where applicable, and cross-user tests. The app uses Supabase for auth; no application database queries or RLS policies were found in the reviewed source. Actual project settings have not been checked.
- Review document processing resource limits, PDF.js/worker integrity or self-hosting, current dependencies and advisories, CSP/security headers, deployment settings, and secrets including repository history. A limited current-tree pattern scan found no obvious private key; it is not a complete secret audit. Clear cannot erase copied, printed, or downloaded reports.
- Keep the pull request draft-only until independent review and explicit release approval.

# ProofLearn account authentication — isolated review draft

**Not release-ready.** PR #1 was merged into `main`; the previously published production login URL returned 404 when checked. Later staging-specific changes were pushed to the review branch after the merge, but their deployment to the team-protected Netlify preview is not verified. A separate staging Supabase project is used; verify the exact PR #2 callback before testing. Real account tests remain incomplete. Do not use real student data.

## What it does

- Uses the official Supabase JavaScript client (pinned CDN version 2.49.8) for email/password signup, login, email confirmation, resending confirmation links, existing sessions, and sign-out on the login page. The public dashboard is unchanged; it does not yet link to or display the account state.
- The production origin and the exact Netlify PR preview origin select separate Supabase projects and fixed callbacks. All other origins fail closed. The preview callback is `https://deploy-preview-2--prooflearn-muni.netlify.app/login.html`; it must be added to the staging project's Auth URL Configuration. The SDK processes implicit-flow token fragments. No arbitrary return URL is accepted.
- Signup does not claim email was sent for an already-registered address. If signup unexpectedly returns a session (server confirmation is disabled), it attempts local sign-out and reports a configuration error rather than claiming confirmation was required.
- A validated Supabase user with an `email_confirmed_at` timestamp is needed before the UI reports signed-in status. The Supabase server must enforce confirmation too; browser checks can be bypassed.
- `index.html` remains a public demo by design. Signing in only confirms account email access. Anyone can still open the prototype, and no code verifies a lecturer's identity, university affiliation, or permissions. Do not use real student data.

## Owner setup, only after review/approval

1. The project’s **public** publishable key is configured in `auth-config.js`. Never use `service_role` or an `sb_secret_` key in frontend code or Git.
2. Confirm email enforcement, the site URL, exact callback and email template in the staging project before real account tests. Supabase built-in email is restricted and rate-limited; use an authorized test inbox.
3. The PR #2 preview is intended to be team-protected and select a separate staging project; verify the deployed config before testing. The old PR #1 preview uses production and is unsafe for staging tests. Configure the exact preview callback in that project and check confirmation is required before testing. Free Supabase email delivery is restricted to project-team email addresses; use an authorized test inbox. Production configuration remains a separate, explicit entry; configure production callbacks and test before deploying. Do not use student data or deploy without approval.
4. For real data, implement and audit server-side authorization, roles, row-level security and policies, security controls and privacy protections. A publishable key is public and client-side UI restrictions are not security. The CDN is a third-party code dependency; review its supply-chain and CSP implications, as well as session storage, XSS, browser privacy, and authentication rate limits.

## Tests

Run `node test-auth.cjs` in this folder (Node.js, no dependencies). Mocked DOM/Supabase scenarios cover missing configuration, signup validation and response, fixed redirect, auto-confirm setup error and local sign-out, rate limits, resend, wrong/unconfirmed login, confirmed login, successful and expired callbacks, login/logout, logout failure and dashboard state. `node --check` was also run on the three auth JS files. These mock tests do not exercise Supabase's SDK initialization or actual browser navigation, network, email delivery, callback token parsing, server policies, existing Netlify settings, or real accounts. No production keys, services, or users were used.

Changes: `login.html`; added `auth-config.js`, `auth-common.js`, `login-auth.js`, `dashboard-auth.js`, `test-auth.cjs`, and this file. The dashboard integration file is not included in the unchanged `index.html` yet. Existing prototype review logic is unchanged.

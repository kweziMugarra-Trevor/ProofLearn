# ProofLearn account authentication — isolated review draft

**Review only; not deployed.** Based on commit `e9ee3c04bb4921289e35c14fd2b877402a7d1ecf`. This copy does not change GitHub, Netlify, or Supabase.

## What it does

- Uses the official Supabase JavaScript client (pinned CDN version 2.49.8) for email/password signup, login, email confirmation, resending confirmation links, existing sessions, and sign-out on the login page. The public dashboard is unchanged; it does not yet link to or display the account state.
- Signup uses the fixed callback `https://lighthearted-zabaione-231c73.netlify.app/login.html`. Its implicit-flow token fragment is processed by the SDK; invalid/expired error fragments are removed and a message shown. No arbitrary return URL is accepted.
- Signup does not claim email was sent for an already-registered address. If signup unexpectedly returns a session (server confirmation is disabled), it attempts local sign-out and reports a configuration error rather than claiming confirmation was required.
- A validated Supabase user with an `email_confirmed_at` timestamp is needed before the UI reports signed-in status. The Supabase server must enforce confirmation too; browser checks can be bypassed.
- `index.html` remains a public demo by design. Signing in only confirms account email access. Anyone can still open the prototype, and no code verifies a lecturer's identity, university affiliation, or permissions. Do not use real student data.

## Owner setup, only after review/approval

1. The project’s **public** publishable key is configured in `auth-config.js`. Never use `service_role` or an `sb_secret_` key in frontend code or Git.
2. Email signups and **Confirm email** were enabled when checked. The Site URL was `http://localhost:3000` and there were no allowed redirect URLs. Before deployment, add the exact fixed callback above and review the site URL and email template. The built-in email service only sends to project-team email addresses and is rate-limited; a custom SMTP provider is needed for general users. Settings were not changed.
3. Review changes and use a separate test project/site for any testing of real accounts. This draft deliberately hard-codes the production callback; clicking a real email link from a preview or local server goes to production, not the preview. A separate staging test must use an explicitly reviewed staging callback and matching allow-list, without changing production settings. Do not test against real users or deploy without approval.
4. For real data, implement and audit server-side authorization, roles, row-level security and policies, security controls and privacy protections. A publishable key is public and client-side UI restrictions are not security. The CDN is a third-party code dependency; review its supply-chain and CSP implications, as well as session storage, XSS, browser privacy, and authentication rate limits.

## Tests

Run `node test-auth.cjs` in this folder (Node.js, no dependencies). Mocked DOM/Supabase scenarios cover missing configuration, signup validation and response, fixed redirect, auto-confirm setup error and local sign-out, rate limits, resend, wrong/unconfirmed login, confirmed login, successful and expired callbacks, login/logout, logout failure and dashboard state. `node --check` was also run on the three auth JS files. These mock tests do not exercise Supabase's SDK initialization or actual browser navigation, network, email delivery, callback token parsing, server policies, existing Netlify settings, or real accounts. No production keys, services, or users were used.

Changes: `login.html`; added `auth-config.js`, `auth-common.js`, `login-auth.js`, `dashboard-auth.js`, `test-auth.cjs`, and this file. The dashboard integration file is not included in the unchanged `index.html` yet. Existing prototype review logic is unchanged.

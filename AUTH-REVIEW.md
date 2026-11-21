# ProofLearn login-first prototype — review notes

This is an unpushed, unverified review draft. Do not use real student data. The login gate is client-side UX only: dashboard.html, JavaScript and other static files remain publicly retrievable, and browser checks can be bypassed. An email-confirmed account does not verify lecturer status or university affiliation. Real data requires server-side authorization, appropriate roles and RLS/policies, and a security and privacy review.

## Flow

- The root index.html redirects to login.html. Login, a valid existing session and a successful email confirmation send confirmed accounts to dashboard.html. The dashboard redirects visitors without a verified confirmed account to login.html; sign-out returns there too. The dashboard's original review behavior is preserved, with the existing demo/sample-data notice.
- Supabase's pinned client uses implicit email links and processes their fragments; invalid/expired links are reported. Signup and resend use fixed environment-specific callback URLs. Unknown origins are disabled. Signup unexpectedly returning a session is treated as a confirmation-configuration error and signed out locally.
- Production: https://prooflearn-muni.netlify.app/login.html. Staging: https://deploy-preview-2--prooflearn-muni.netlify.app/login.html. The public publishable keys are not service-role or secret keys.

## Before any deployment

- Test the actual private staging deployment with an authorized test inbox and fictional data: signup, confirmation email and link, confirmed sign-in, existing session, direct dashboard access, sign-out, wrong credentials and expired link, plus sample review and document handling. Mocks do not test Supabase SDK initialization, actual browser redirects/email, server settings or Netlify.
- Confirm each Supabase project's Site URL, exact allowed callback and email template, and that server-side email confirmation is required. Supabase's default email service can be restricted and rate-limited. Configure production separately and verify the real production origin before deployment. Never put service-role or secret keys in browser code.
- The CDN, session storage, XSS, CSP, rate limits, and security of any real data need independent review. A browser gate is not access control.
- Recheck current GitHub main and preview before applying changes; the workspace is not a Git checkout. No push or deployment was done as part of this draft.

## Offline checks

Run `node test-auth.cjs`, `node test-environments.cjs`, and `node --check` for the JS files. These use mocked auth and DOM, not real services or accounts.

/* Public-client authentication only. This does not protect static files or establish a role. */
(() => {
  const cfg = window.PROOFLEARN_AUTH;
  function client() {
    if (!cfg || !cfg.publishableKey || cfg.publishableKey.includes('REPLACE_WITH_')) throw new Error('SETUP');
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('LIBRARY');
    return window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
  }
  function message(error) {
    const code = (error && (error.code || error.message) || '').toLowerCase();
    if (code === 'setup') return 'Authentication is not configured yet. Ask the site owner to add the public key.';
    if (code === 'library') return 'Authentication could not load. Check your connection and reload.';
    if (code.includes('email_not_confirmed') || code.includes('email not confirmed')) return 'Confirm your email using the link in your inbox before signing in.';
    if (code.includes('invalid_credentials') || code.includes('invalid login credentials')) return 'Email or password is incorrect.';
    if (code.includes('over_email_send_rate_limit') || code.includes('rate_limit') || (error && error.status === 429)) return 'Too many requests. Please wait and try again.';
    if (code.includes('weak_password') || code.includes('password')) return 'The password did not meet the server’s requirements.';
    if (code.includes('user_already_exists') || code.includes('already registered')) return 'If this email can be used, check your inbox or try signing in.';
    return 'Authentication could not be completed. Please try again or contact the site owner.';
  }
  async function confirmedUser(auth) {
    const result = await auth.getUser();
    if (result.error) throw result.error;
    const user = result.data && result.data.user;
    if (!user || !user.email_confirmed_at) return null;
    return user;
  }
  window.ProofAuth = { client, message, confirmedUser };
})();

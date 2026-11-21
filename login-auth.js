(() => {
  const $ = id => document.getElementById(id);
  const stagingNotice = $('stagingNotice');
  if (stagingNotice && window.PROOFLEARN_AUTH.environment === 'staging') stagingNotice.hidden = false;
  const login = $('loginSection'), signup = $('signupSection'), msg = $('message');
  const buttons = [document.querySelector('#loginForm button[type=submit]'), document.querySelector('#signupForm button[type=submit]'), $('resend')];
  const say = (text, ok = false) => { msg.textContent = text; msg.classList.toggle('ok', ok); };
  const busy = flag => buttons.forEach(b => { b.disabled = flag; });
  function view(which) {
    login.classList.toggle('hidden', which !== 'login');
    signup.classList.toggle('hidden', which !== 'signup');
  }
  $('showSignup').addEventListener('click', () => { view('signup'); say(''); });
  $('showLogin').addEventListener('click', () => { view('login'); say(''); });
  let client;
  // Error callbacks do not contain a usable session. Remove the fragment even on failure.
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const callbackError = fragment.has('error') || fragment.has('error_code');
  const callbackTokens = fragment.has('access_token') || fragment.has('refresh_token');
  if (callbackError) history.replaceState(null, '', window.location.pathname + window.location.search);
  // Do not accept arbitrary query redirects. This integration uses implicit email links, not PKCE codes.
  try { client = ProofAuth.client(); }
  catch (e) { busy(true); say(ProofAuth.message(e)); return; }
  async function openDashboard() {
    const user = await ProofAuth.confirmedUser(client.auth);
    if (!user) throw new Error('EMAIL_NOT_CONFIRMED');
    window.location.replace('dashboard.html');
  }
  busy(true);
  (async () => {
    try {
      if (callbackError) { say('The confirmation link is invalid or expired. Request a new link or contact the site owner.'); return; }
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data && data.session) {
        await openDashboard();
      } else if (callbackTokens) say('Confirmation could not be completed. The link may have expired; request a new one.');
    } catch (e) { say(ProofAuth.message(e)); }
    finally { busy(false); }
  })();
  $('signupForm').addEventListener('submit', async event => {
    event.preventDefault();
    const password = $('signupPassword').value, name = $('fullName').value.trim();
    if (!name) { say('Enter your name.'); return; }
    if (password.length < 8) { say('Use at least 8 characters for your password.'); return; }
    if (password !== $('confirmPassword').value) { say('Passwords do not match.'); return; }
    busy(true); say('');
    try {
      const { data, error } = await client.auth.signUp({ email: $('signupEmail').value.trim(), password,
        options: { emailRedirectTo: window.PROOFLEARN_AUTH.emailRedirectTo, data: { full_name: name } } });
      if (error) throw error;
      $('signupPassword').value = ''; $('confirmPassword').value = '';
      if (data && data.session) {
        const result = await client.auth.signOut({ scope: 'local' });
        if (result.error) throw result.error;
        view('login');
        say('Setup error: email confirmation is not required by the server. Contact the site owner; do not use this sign-up yet.');
        return;
      }
      view('login');
      say('If this email can be registered, check your inbox for a confirmation link, then sign in. Existing accounts can sign in instead.', true);
    } catch (e) { say(ProofAuth.message(e)); }
    finally { busy(false); }
  });
  $('resend').addEventListener('click', async () => {
    const email = $('loginEmail').value.trim();
    if (!email || !$('loginEmail').checkValidity()) { say('Enter a valid email address above to resend the confirmation.'); return; }
    busy(true); say('');
    try {
      const { error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.PROOFLEARN_AUTH.emailRedirectTo } });
      if (error) throw error;
      say('If this account needs confirmation, check your inbox for a link.', true);
    } catch (e) { say(ProofAuth.message(e)); }
    finally { busy(false); }
  });
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault(); busy(true); say('');
    try {
      const { error } = await client.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPassword').value });
      if (error) throw error;
      $('loginPassword').value = '';
      await openDashboard();
    } catch (e) { say(ProofAuth.message(e)); }
    finally { busy(false); }
  });
})();

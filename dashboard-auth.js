/* This is a browser UI gate, not server-side access control. Static files remain public. */
(() => {
  const label = document.getElementById('authStatus');
  const logout = document.getElementById('dashboardLogout');
  let version = 0, redirected = false;
  const login = () => {
    version++;
    document.documentElement.classList.remove('auth-ready');
    if (!redirected) { redirected = true; window.location.replace('login.html'); }
  };
  let client;
  try { client = ProofAuth.client(); }
  catch (e) { login(); return; }
  // Keep the callback synchronous; awaiting SDK calls inside it may deadlock.
  try {
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') login();
    });
  } catch (e) { login(); return; }
  async function refresh() {
    const current = version;
    try {
      const { data, error } = await client.auth.getSession();
      if (current !== version) return;
      if (error || !data || !data.session) { login(); return; }
      const user = await ProofAuth.confirmedUser(client.auth);
      if (current !== version) return;
      if (!user) { login(); return; }
      label.textContent = 'Signed in: ' + (user.email || 'confirmed account');
      logout.hidden = false;
      document.documentElement.classList.add('auth-ready');
    } catch (e) { if (current === version) login(); }
  }
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      document.documentElement.classList.remove('auth-ready');
      login();
    } catch (e) { label.textContent = 'Sign-out failed; try again'; }
    finally { logout.disabled = false; }
  });
  refresh();
})();

/* This is a browser UI gate, not server-side access control. Static files remain public. */
(() => {
  const label = document.getElementById('authStatus');
  const logout = document.getElementById('dashboardLogout');
  const login = () => window.location.replace('login.html');
  let client;
  try { client = ProofAuth.client(); }
  catch (e) { login(); return; }
  async function refresh() {
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data || !data.session) { login(); return; }
      const user = await ProofAuth.confirmedUser(client.auth);
      if (!user) { login(); return; }
      label.textContent = 'Signed in: ' + (user.email || 'confirmed account');
      logout.hidden = false;
      document.documentElement.classList.add('auth-ready');
    } catch (e) { login(); }
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

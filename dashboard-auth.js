(() => {
  const label = document.getElementById('authStatus');
  const link = document.getElementById('authLink');
  const logout = document.getElementById('dashboardLogout');
  let client;
  function guest(text) { label.textContent = text; link.hidden = false; logout.hidden = true; }
  try { client = ProofAuth.client(); }
  catch (e) { guest(ProofAuth.message(e)); return; }
  async function refresh() {
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data || !data.session) { guest('Public prototype'); return; }
      const user = await ProofAuth.confirmedUser(client.auth);
      if (!user) { guest('Email confirmation required'); return; }
      label.textContent = 'Signed in: ' + (user.email || 'confirmed account');
      link.hidden = true; logout.hidden = false;
    } catch (e) { guest('Account status unavailable'); }
  }
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      guest('Signed out');
    } catch (e) { label.textContent = 'Sign-out failed; try again'; }
    finally { logout.disabled = false; }
  });
  refresh();
})();

// These keys are public publishable keys, never secret or service_role keys.
// Unknown origins are disabled rather than silently using a real project.
(() => {
  const origins = Object.freeze({
    'https://prooflearn-muni.netlify.app': Object.freeze({
      url: 'https://zsovgligvblsbzutyxgr.supabase.co',
      publishableKey: 'sb_publishable_RmPWAW1q9J7vhgxnEc9wAw_RXwn6hhy',
      emailRedirectTo: 'https://prooflearn-muni.netlify.app/login.html',
      environment: 'production'
    }),
    'https://deploy-preview-2--prooflearn-muni.netlify.app': Object.freeze({
      url: 'https://nrybmqkcdfykywyyrvhm.supabase.co',
      publishableKey: 'sb_publishable_ktTum9aYssBIxfVKPD6hzA_bnlH5mCY',
      emailRedirectTo: 'https://deploy-preview-2--prooflearn-muni.netlify.app/login.html',
      environment: 'staging'
    })
  });
  window.PROOFLEARN_AUTH = origins[window.location.origin] || Object.freeze({});
})();

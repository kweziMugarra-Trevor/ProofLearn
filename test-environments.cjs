// Offline checks for exact, fail-closed environment selection. No network or credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/auth-config.js', 'utf8');
function config(origin) {
  const window = { location: { origin } };
  vm.runInNewContext(source, { window });
  return window.PROOFLEARN_AUTH;
}
const stage = config('https://deploy-preview-2--prooflearn-muni.netlify.app');
assert.equal(stage.environment, 'staging');
assert.equal(stage.url, 'https://nrybmqkcdfykywyyrvhm.supabase.co');
assert.equal(stage.emailRedirectTo, 'https://deploy-preview-2--prooflearn-muni.netlify.app/login.html');
const prod = config('https://lighthearted-zabaione-231c73.netlify.app');
assert.equal(prod.environment, 'production');
assert.equal(prod.url, 'https://zsovgligvblsbzutyxgr.supabase.co');
assert.equal(prod.emailRedirectTo, 'https://lighthearted-zabaione-231c73.netlify.app/login.html');
for (const origin of ['http://localhost:3000','https://evil.example','https://deploy-preview-1--prooflearn-muni.netlify.app','http://deploy-preview-2--prooflearn-muni.netlify.app']) {
  assert.equal(config(origin).publishableKey, undefined, `${origin} must not use an account`);
}
console.log('PASS: staging, production and four unknown-origin checks');

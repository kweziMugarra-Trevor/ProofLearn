// Offline mocked DOM + Supabase tests. No network, real keys, accounts, or project changes.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
class Element {
  constructor() { this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false; this.handlers = {}; this.classes = new Set(); this.classList = { toggle: (c, v) => v ? this.classes.add(c) : this.classes.delete(c) }; }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  checkValidity() { return this.value.includes('@'); }
  async fire(name) { assert.ok(this.handlers[name], `missing ${name} handler`); await this.handlers[name]({preventDefault(){}}); await tick(); }
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function app(opts = {}) {
  const ids = ['loginSection','signupSection','signedInSection','message','logout','resend','showSignup','showLogin','signupForm','loginForm','signupPassword','confirmPassword','fullName','signupEmail','loginEmail','loginPassword','accountLabel','authStatus','authLink','dashboardLogout'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  elements.signupSection.classes.add('hidden'); elements.signedInSection.classes.add('hidden'); elements.dashboardLogout.hidden = true;
  const loginButton = new Element(), signupButton = new Element();
  let session = opts.session || null, user = opts.user || { email:'person@example.org', email_confirmed_at:'2026-01-01T00:00:00Z' };
  let calls = [], removedFragment = false, navigation = [];
  const auth = {
    onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}),
    getSession: async () => ({data:{session}, error:opts.sessionError || null}),
    getUser: async () => ({data:{user}, error:opts.userError || null}),
    signUp: async args => { calls.push(['signUp', args]); if (opts.autoConfirm) session = {access_token:'mock'}; return {data:{session: opts.autoConfirm ? session : null},error:opts.signupError || null}; },
    resend: async args => { calls.push(['resend',args]); return {error:null}; },
    signInWithPassword: async args => { calls.push(['signIn',args]); if (!opts.loginError) session={access_token:'mock'}; return {data:{session},error:opts.loginError || null}; },
    signOut: async args => { calls.push(['signOut',args]); if (!opts.logoutError) session=null; return {error:opts.logoutError || null}; }
  };
  const location = {hash:opts.hash || '',pathname:opts.dashboard ? '/dashboard.html' : '/login.html',search:opts.search || '',replace: url => navigation.push(url)};
  const window = { location, PROOFLEARN_AUTH: {url:'https://zsovgligvblsbzutyxgr.supabase.co',publishableKey:opts.noKey ? 'REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY' : 'sb_publishable_test',emailRedirectTo:'https://prooflearn-muni.netlify.app/login.html'}, supabase:{createClient:(url,key,config)=>{ calls.push(['createClient', url, key, config]); return {auth}; }} };
  const rootClasses = new Set();
  const document = {documentElement:{classList:{add: c => rootClasses.add(c), remove: c => rootClasses.delete(c)}}, getElementById:id => elements[id], querySelector:q => q.startsWith('#loginForm') ? loginButton : signupButton};
  const ctx = {window, document, history:{replaceState:()=>{removedFragment=true;}}, URLSearchParams, console};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'auth-common.js'),'utf8'),ctx);
  ctx.ProofAuth=window.ProofAuth;
  vm.runInContext(fs.readFileSync(path.join(root,opts.dashboard ? 'dashboard-auth.js' : 'login-auth.js'),'utf8'),ctx);
  await tick();
  return {e:elements,calls,removedFragment,loginButton,navigation,rootClasses};
}
(async()=>{
  let a = await app({noKey:true}); assert.match(a.e.message.textContent,/not configured/i); assert.equal(a.loginButton.disabled,true);
  a = await app(); a.e.fullName.value='Trevor'; a.e.signupEmail.value='test@example.org'; a.e.signupPassword.value='password1'; a.e.confirmPassword.value='different'; await a.e.signupForm.fire('submit'); assert.match(a.e.message.textContent,/do not match/); assert.equal(a.calls.filter(x=>x[0]==='signUp').length,0);
  a.e.confirmPassword.value='password1'; await a.e.signupForm.fire('submit'); let signup=a.calls.find(x=>x[0]==='signUp')[1]; assert.equal(signup.options.emailRedirectTo,'https://prooflearn-muni.netlify.app/login.html'); assert.match(a.e.message.textContent,/check your inbox/i); assert.equal(a.e.signupPassword.value,'');
  a = await app({autoConfirm:true}); a.e.fullName.value='Test'; a.e.signupPassword.value=a.e.confirmPassword.value='password1'; await a.e.signupForm.fire('submit'); assert.match(a.e.message.textContent,/setup error/i); assert.equal(a.calls.find(x=>x[0]==='signOut')[1].scope,'local');
  a = await app({signupError:{code:'over_email_send_rate_limit',status:429}}); a.e.fullName.value='Test'; a.e.signupPassword.value=a.e.confirmPassword.value='password1'; await a.e.signupForm.fire('submit'); assert.match(a.e.message.textContent,/too many/i);
  a = await app(); await a.e.resend.fire('click'); assert.match(a.e.message.textContent,/valid email/i); a.e.loginEmail.value='test@example.org'; await a.e.resend.fire('click'); assert.equal(a.calls.find(x=>x[0]==='resend')[1].options.emailRedirectTo,'https://prooflearn-muni.netlify.app/login.html');
  a = await app({loginError:{code:'invalid_credentials'}}); await a.e.loginForm.fire('submit'); assert.match(a.e.message.textContent,/incorrect/i);
  a = await app({loginError:{code:'email_not_confirmed'}}); await a.e.loginForm.fire('submit'); assert.match(a.e.message.textContent,/confirm your email/i);
  a = await app({search:'?next=https://evil.example'}); await a.e.loginForm.fire('submit'); assert.deepEqual(a.navigation,['dashboard.html']);
  a = await app({user:{email:'x',email_confirmed_at:null}}); await a.e.loginForm.fire('submit'); assert.match(a.e.message.textContent,/confirm your email/i); assert.deepEqual(a.navigation,[]);
  a = await app({session:{access_token:'mock'}}); assert.deepEqual(a.navigation,['dashboard.html']);
  a = await app({session:{access_token:'mock'},hash:'#access_token=mock&refresh_token=mock'}); assert.deepEqual(a.navigation,['dashboard.html']);
  a = await app({hash:'#error=access_denied&error_code=otp_expired'}); assert.equal(a.removedFragment,true); assert.match(a.e.message.textContent,/expired/i); assert.deepEqual(a.navigation,[]);
  a = await app({hash:'#access_token=bad'}); assert.match(a.e.message.textContent,/could not be completed/i); assert.deepEqual(a.navigation,[]);
  a = await app({session:{access_token:'mock'},userError:{message:'network'}}); assert.deepEqual(a.navigation,[]);
  a = await app({dashboard:true,session:{access_token:'mock'}}); assert.match(a.e.authStatus.textContent,/signed in/i); assert.equal(a.e.dashboardLogout.hidden,false); assert.equal(a.rootClasses.has('auth-ready'),true); await a.e.dashboardLogout.fire('click'); assert.deepEqual(a.navigation,['login.html']); assert.equal(a.rootClasses.has('auth-ready'),false);
  a = await app({dashboard:true,session:{access_token:'mock'},logoutError:{message:'network'}}); await a.e.dashboardLogout.fire('click'); assert.match(a.e.authStatus.textContent,/sign-out failed/i); assert.deepEqual(a.navigation,[]); assert.equal(a.rootClasses.has('auth-ready'),true);
  for (const opts of [{}, {noKey:true}, {sessionError:{message:'network'}}, {session:{access_token:'mock'},user:{email:'x',email_confirmed_at:null}}, {session:{access_token:'mock'},userError:{message:'network'}}]) { a=await app({dashboard:true,...opts}); assert.deepEqual(a.navigation,['login.html']); assert.equal(a.rootClasses.has('auth-ready'),false); }
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8'), loginHtml=fs.readFileSync(path.join(root,'login.html'),'utf8'), dash=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
  assert.match(index,/location\.replace\('login\.html' \+ fragment\)/); assert.doesNotMatch(index,/http-equiv="refresh"/i); assert.doesNotMatch(loginHtml,/without signing in|Open public prototype/i); assert.match(dash,/id="dashboardLogout"/); assert.match(dash,/html:not\(\.auth-ready\) \.app/); assert.match(dash,/sample data only/i); assert.match(dash,/id="sample"/); assert.match(dash,/window\.extractPdfText/);
  console.log('PASS: mocked signup, confirmation, login, session, callback, logout, guard and static page checks.');
})().catch(err=>{console.error(err);process.exit(1);});

// Offline callback transport tests, fictional values only.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=__dirname;
const script=file=>fs.readFileSync(root+'/'+file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const index=script('index.html'),login=script('login.html');
function runRoot(url) {
  let target;
  const u=new URL(url),window={location:{search:u.search,hash:u.hash,replace:v=>target=v}};
  vm.runInNewContext(index,{window,encodeURIComponent,JSON});
  return new URL(target,url);
}
function runLogin(url){
  let u=new URL(url),replaced=false;
  const location={get href(){return u.href},get hash(){return u.hash}};
  const history={replaceState(_a,_b,href){let updated=new URL(href,u);assert.equal(updated.origin,u.origin);u=updated;replaced=true;}};
  vm.runInNewContext(login,{window:{location},history,URL,JSON,decodeURIComponent});
  return {url:u,replaced};
}
for(const [query,hash] of [
  ['',''],['','#access_token=fake&refresh_token=fake&type=magiclink'],
  ['?code=fake&state=x',''],['?token=fake&x=1','#access_token=fake&refresh_token=fake'],
  ['?next=https%3A%2F%2Fevil.example%2F&token=fake','#error=access_denied&error_code=otp_expired'],
  ['?next=%2F%2Fevil.example&x=%23value','#arbitrary=%3Fvalue'],
]){
  const source='https://stage.example/'+query+hash,dest=runRoot(source);
  assert.equal(dest.origin,'https://stage.example');assert.equal(dest.pathname,'/login.html');assert.equal(dest.search,'');
  const restored=runLogin(dest.href).url;
  assert.equal(restored.search,query);assert.equal(restored.hash,hash);assert.equal(restored.origin,'https://stage.example');
}
for (const suffix of ['%7Bbad',encodeURIComponent(JSON.stringify(['//evil.example','#ok'])),encodeURIComponent(JSON.stringify(['?ok','//evil.example']))]) {
  const result=runLogin('https://stage.example/login.html#prooflearn-root='+suffix);
  assert.equal(result.replaced,false);assert.equal(result.url.origin,'https://stage.example');
}
const indexHtml=fs.readFileSync(root+'/index.html','utf8'),loginHtml=fs.readFileSync(root+'/login.html','utf8');
assert.match(indexHtml,/name="referrer" content="no-referrer"/);assert.match(loginHtml,/name="referrer" content="no-referrer"/);
assert.doesNotMatch(indexHtml,/http-equiv="refresh"/i);
assert.ok(loginHtml.indexOf("const prefix = '#prooflearn-root='") < loginHtml.indexOf('src="https://cdn.jsdelivr.net'));
console.log('PASS: six callback transports, fixed-origin routing, no query on login request, three invalid payloads, referrer policy, early restore.');

// Fictional in-memory SDK event tests: no accounts or network.
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
const code=fs.readFileSync(__dirname+'/dashboard-auth.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
async function start(opts={}){
 const classes=new Set(), nav=[]; let listener, resolveUser, clicks;
 const userPromise=opts.delay ? new Promise(r=>resolveUser=r) : Promise.resolve({email:'fictional@example.invalid',email_confirmed_at:'yes'});
 const auth={getSession:async()=>({data:{session:{access_token:'fake'}},error:null}),onAuthStateChange:fn=>{listener=fn;return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>({error:opts.error||null})};
 const label={textContent:''}, logout={hidden:true,disabled:false,addEventListener:(name,fn)=>clicks=fn};
 const document={documentElement:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},getElementById:id=>id==='authStatus'?label:logout};
 const ProofAuth={client:()=>({auth}),confirmedUser:()=>userPromise};
 vm.runInNewContext(code,{document,window:{location:{replace:url=>nav.push(url)}},ProofAuth,setTimeout});
 await tick(); return {classes,nav,emit:(event,session=null)=>listener && listener(event,session), getListener:()=>listener,resolveUser,click:()=>clicks(),label,logout};
}
(async()=>{
 let a=await start(); assert(a.classes.has('auth-ready')); assert(a.getListener(),'dashboard must subscribe to auth events');
 a.emit('SIGNED_OUT'); assert(!a.classes.has('auth-ready'),'signout must immediately hide workspace'); assert.deepEqual(a.nav,['login.html']);
 a=await start({delay:true}); a.emit('SIGNED_OUT'); a.resolveUser({email:'fictional@example.invalid',email_confirmed_at:'yes'}); await tick(); assert(!a.classes.has('auth-ready'),'late validation must not reopen workspace');
 a=await start(); await a.click(); assert(!a.classes.has('auth-ready')); assert.deepEqual(a.nav,['login.html']);
 a=await start({error:{message:'offline'}}); await a.click(); assert(a.classes.has('auth-ready')); assert.match(a.label.textContent,/failed/i); assert.equal(a.logout.disabled,false);
 console.log('PASS: auth-event signout, late-validation race, local signout and failure retry (mocked)');
})().catch(e=>{console.error(e);process.exitCode=1});

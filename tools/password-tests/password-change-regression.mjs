import assert from 'node:assert/strict';
const base='http://qsl-password-api:3001';
async function login(password){const r=await fetch(base+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'杨法智',password})});return {status:r.status,user:(await r.json()).user,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const a=await login('Admin@1234'),b=await login('Admin@1234');assert.equal(a.status,200);assert.equal(a.user.must_change_password,true);
async function change(body){const r=await fetch(base+'/account/password',{method:'POST',headers:{cookie:a.cookie,'content-type':'application/json'},body:JSON.stringify(body)});return r.status;}
for(const p of ['short','aaaaaaaa','ABC1234!','Abcdefgh!','Abcd1234 ','Admin@1234'])assert.equal(await change({oldPassword:'Admin@1234',newPassword:p,confirmPassword:p}),400);
assert.equal(await change({oldPassword:'wrong',newPassword:'Changed@1234',confirmPassword:'Changed@1234'}),400);
assert.equal(await change({oldPassword:'Admin@1234',newPassword:'Changed@1234',confirmPassword:'Different@1234'}),400);
assert.equal(await change({oldPassword:'Admin@1234',newPassword:'Changed@1234',confirmPassword:'Changed@1234'}),200);
assert.equal((await fetch(base+'/session',{headers:{cookie:a.cookie}})).status,200);
assert.equal((await fetch(base+'/session',{headers:{cookie:b.cookie}})).status,401);
assert.equal((await login('Admin@1234')).status,401);
const fresh=await login('Changed@1234');assert.equal(fresh.status,200);assert.equal(fresh.user.must_change_password,false);
console.log('PASS initial password reminder, old-password check, strength/mismatch checks, successful update, other-session revocation, current-session retention, no reminder after password change');

import assert from 'node:assert/strict';
const base='http://qsl-password-api:3001';
const r=await fetch(base+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'杨法智',password:'Changed@1234'})});assert.equal(r.status,200);const b=await r.json(),cookie=r.headers.get('set-cookie').split(';')[0];
const body={storeId:b.user.store_ids[0],roleId:b.user.role_id,data:{name:'李测试',role:'系统管理员',loginStatus:'正常'},createUserAccount:true,username:'ignored-username',password:'ignored-custom-password'};
const s=await fetch(base+'/staff',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(s.status,200,await s.text());
const login=await fetch(base+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'李测试',password:'Admin@1234'})});assert.equal(login.status,200);const user=(await login.json()).user;assert.equal(user.must_change_password,true);assert.equal(user.is_system_admin,false);console.log('PASS new staff login uses real name and fixed initial password with change reminder; body overrides ignored; root flag not inherited');

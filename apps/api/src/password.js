export const validPassword=value=>typeof value==='string'&&value.length>=8&&value.length<=24&&/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/[0-9]/.test(value)&&/[^A-Za-z0-9\s]/.test(value)&&! /\s/.test(value);
export async function changePassword({req,res,user,pool,send,readJson,tokenHash}){
 if(!user){send(res,401,{error:'请重新登录'});return;}
 if(req.method!=='POST'){send(res,405,{error:'Method not allowed'});return;}
 const b=await readJson(req,4096);
 if(!b||typeof b.oldPassword!=='string'||b.oldPassword.length>1024||!validPassword(b.newPassword)||b.newPassword!==b.confirmPassword||b.newPassword===b.oldPassword||b.newPassword==='Admin@1234'){send(res,400,{error:'新密码须为8～24位，包含大小写字母、数字和特殊字符，不含空格，且不能使用初始密码或旧密码；两次输入须一致。'});return;}
 const c=await pool.connect();try{
  await c.query('BEGIN');const {rows:[p]}=await c.query('SELECT password_hash FROM identity.password_credentials WHERE user_id=$1 FOR UPDATE',[user.id]);
  const {rows:[check]}=await c.query('SELECT $1::text=crypt($2,$1) valid',[p?.password_hash??'',b.oldPassword]);
  if(!check.valid){await c.query('ROLLBACK');send(res,400,{error:'旧密码不正确'});return;}
  await c.query(`UPDATE identity.password_credentials SET password_hash=crypt($2,gen_salt('bf',10)),password_algorithm='bcrypt',must_change_password=false,password_changed_at=now(),failed_attempts=0,locked_until=NULL WHERE user_id=$1`,[user.id,b.newPassword]);
  await c.query('DELETE FROM identity.sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,tokenHash]);
  await c.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action) VALUES($1,$2,$3,'账号安全','修改登录密码')`,[user.id,user.role_id,user.role_name]);
  await c.query('COMMIT');send(res,200,{ok:true});
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

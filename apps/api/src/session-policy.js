export async function handleSessionPolicy({req,res,url,user,pool,send,readJson,tokenHash}) {
 if (!['/session/activity','/system/session-policy'].includes(url.pathname)) return false;
 if(!user){send(res,401,{error:'登录已失效，请重新登录'});return true;}
 if(url.pathname==='/session/activity') {
  if(req.method!=='POST'){send(res,405,{error:'Method not allowed'});return true;}
  const {rows}=await pool.query(`UPDATE identity.sessions s SET last_activity_at=now()
    FROM system.session_policy p WHERE s.token_hash=$1 AND s.expires_at>now()
    AND s.last_activity_at>now()-make_interval(mins=>p.idle_timeout_minutes)
    RETURNING s.last_activity_at + make_interval(mins=>p.idle_timeout_minutes) AS idle_expires_at`,[tokenHash]);
  send(res,rows.length?200:401,rows[0]??{error:'登录已超时'});return true;
 }
 if(req.method==='GET') {
  const {rows}=await pool.query('SELECT idle_timeout_minutes,updated_at FROM system.session_policy');send(res,200,rows[0]);return true;
 }
 if(req.method!=='PUT'){send(res,405,{error:'Method not allowed'});return true;}
 const {rows:actors}=await pool.query(`SELECT r.identity_type,r.permissions,a.permission_denies FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id]);
 const a=actors[0];if(a?.identity_type!=='admin'||!a.permissions.includes('system.read')||a.permission_denies.includes('system.read')){send(res,403,{error:'仅系统管理员可设置会话策略'});return true;}
 const body=await readJson(req);const minutes=body.idle_timeout_minutes;
 if(!Number.isInteger(minutes)||minutes<1||minutes>1440){send(res,400,{error:'请输入 1～1440 之间的整数分钟'});return true;}
 const client=await pool.connect();try {
  await client.query('BEGIN');
  const {rows:[before]}=await client.query('SELECT idle_timeout_minutes FROM system.session_policy FOR UPDATE');
  const {rows:[saved]}=await client.query('UPDATE system.session_policy SET idle_timeout_minutes=$1,updated_at=now(),updated_by=$2 RETURNING idle_timeout_minutes,updated_at',[minutes,user.id]);
  await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,details) VALUES($1,$2,$3,'系统参数','修改会话超时',$4::jsonb)`,[user.id,user.role_id,user.role_name,JSON.stringify({before:before.idle_timeout_minutes,after:minutes})]);
  await client.query('COMMIT');send(res,200,saved);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}return true;
}

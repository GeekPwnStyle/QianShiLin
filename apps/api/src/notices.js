const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories = new Set(['general','work','maintenance','policy']);
const severities = new Set(['normal','important','urgent']);
const storeId = /^store_[a-z0-9_]{1,50}$/;
const roleId = /^role_[a-z0-9_]{1,90}$/;
const own = row => ({ id:row.id,title:row.title,category:row.category,severity:row.severity,
  content:row.content,publisherName:row.publisher_name,publishedAt:row.published_at,
  createdAt:row.created_at,readAt:row.read_at ?? null });
const numbered = (value,min,max,defaultValue) => Math.min(max,Math.max(min,Number.parseInt(value ?? '',10) || defaultValue));

export async function handleNotices({req,res,url,user,pool,send,readJson}) {
  const path=url.pathname;
  if (!path.startsWith('/notices/')) return false;
  if (!user) { send(res,401,{error:'Unauthorized'}); return true; }
  const {rows:actors}=await pool.query(`SELECT r.identity_type,r.permissions,a.permission_denies FROM identity.user_access a
    JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id]);
  const actor=actors[0];
  if (!actor) { send(res,403,{error:'Forbidden'}); return true; }
  const canPublish=actor.identity_type==='admin' && actor.permissions.includes('system.notice.publish')
    && !actor.permission_denies.includes('system.notice.publish');

  if (path==='/notices/unread-count' && req.method==='GET') {
    const {rows}=await pool.query(`SELECT count(*)::int AS count FROM message.announcement_receipts r
      JOIN message.announcements n ON n.id=r.announcement_id
      WHERE r.user_id=$1 AND r.read_at IS NULL AND n.published_at<=now()`,[user.id]);
    send(res,200,{count:rows[0].count});return true;
  }
  if (path==='/notices/inbox' && req.method==='GET') {
    const page=numbered(url.searchParams.get('page'),1,10000,1);
    const pageSize=numbered(url.searchParams.get('pageSize'),1,100,20);
    const status=url.searchParams.get('status') ?? 'all';
    if (!['all','unread','read'].includes(status)) { send(res,400,{error:'Invalid status'}); return true; }
    const where=`WHERE r.user_id=$1 AND n.published_at<=now()
      AND ($2::text='all' OR ($2::text='unread' AND r.read_at IS NULL) OR ($2::text='read' AND r.read_at IS NOT NULL))`;
    const {rows:counts}=await pool.query(`SELECT count(*)::int AS total FROM message.announcement_receipts r JOIN message.announcements n ON n.id=r.announcement_id ${where}`,[user.id,status]);
    const {rows}=await pool.query(`SELECT n.*,r.read_at,u.display_name AS publisher_name FROM message.announcement_receipts r
      JOIN message.announcements n ON n.id=r.announcement_id JOIN identity.users u ON u.id=n.publisher_user_id ${where}
      ORDER BY n.published_at DESC,n.id DESC LIMIT $3 OFFSET $4`,[user.id,status,pageSize,(page-1)*pageSize]);
    send(res,200,{items:rows.map(own),total:counts[0].total,page,pageSize});return true;
  }
  if (path==='/notices/recipients' && req.method==='GET') {
    if (!canPublish) { send(res,403,{error:'Forbidden'}); return true; }
    const [users,roles]=await Promise.all([
      pool.query(`SELECT u.id,u.username,u.display_name,a.role_id,a.store_ids,r.name AS role_name,r.identity_type
        FROM identity.users u JOIN identity.user_access a ON a.user_id=u.id JOIN identity.roles r ON r.id=a.role_id
        WHERE u.status='active' ORDER BY u.display_name,u.id`),
      pool.query('SELECT id,name,identity_type FROM identity.roles ORDER BY name,id'),
    ]);
    send(res,200,{users:users.rows,roles:roles.rows});return true;
  }
  const receiptMatch=/^\/notices\/admin\/([0-9a-f-]{36})\/receipts$/.exec(path);
  if (receiptMatch && req.method==='GET') {
    if (!canPublish) { send(res,403,{error:'Forbidden'});return true; }
    if (!uuid.test(receiptMatch[1])) { send(res,400,{error:'Invalid announcement'});return true; }
    const {rows}=await pool.query(`SELECT r.user_id,u.display_name,u.username,r.recipient_role_id,r.recipient_role_name,
      r.recipient_store_ids,r.read_at FROM message.announcement_receipts r
      JOIN identity.users u ON u.id=r.user_id WHERE r.announcement_id=$1
      ORDER BY (r.read_at IS NULL) DESC,u.display_name,u.id`,[receiptMatch[1]]);
    send(res,200,{items:rows,total:rows.length,allRead:rows.length>0 && rows.every(row=>row.read_at)});return true;
  }
  if (path==='/notices/admin' && req.method==='GET') {
    if (!canPublish) { send(res,403,{error:'Forbidden'}); return true; }
    const page=numbered(url.searchParams.get('page'),1,10000,1);
    const pageSize=numbered(url.searchParams.get('pageSize'),1,100,20);
    const search=(url.searchParams.get('search') ?? '').trim().slice(0,100);
    const values=[search ? `%${search.replace(/[\\%_]/g,'\\$&')}%` : null];
    const where=`WHERE ($1::text IS NULL OR n.title ILIKE $1 ESCAPE '\\' OR n.content ILIKE $1 ESCAPE '\\')`;
    const {rows:counts}=await pool.query(`SELECT count(*)::int AS total FROM message.announcements n ${where}`,values);
    const {rows}=await pool.query(`SELECT n.*,u.display_name AS publisher_name,
      count(r.user_id)::int AS recipient_count,count(r.user_id) FILTER(WHERE r.read_at IS NOT NULL)::int AS read_count
      FROM message.announcements n JOIN identity.users u ON u.id=n.publisher_user_id
      LEFT JOIN message.announcement_receipts r ON r.announcement_id=n.id ${where}
      GROUP BY n.id,u.display_name ORDER BY n.created_at DESC,n.id DESC LIMIT $2 OFFSET $3`,[...values,pageSize,(page-1)*pageSize]);
    send(res,200,{items:rows.map(row=>({ ...own(row),audience:row.audience,recipientCount:row.recipient_count,
      readCount:row.read_count,unreadCount:row.recipient_count-row.read_count,scheduled:new Date(row.published_at)>new Date() })),
      total:counts[0].total,page,pageSize});return true;
  }
  if (path==='/notices/admin' && req.method==='POST') {
    if (!canPublish) { send(res,403,{error:'Forbidden'}); return true; }
    let body;
    try { body=await readJson(req); } catch { send(res,400,{error:'Invalid JSON'}); return true; }
    const title=typeof body?.title==='string' ? body.title.trim() : '';
    const content=typeof body?.content==='string' ? body.content.trim() : '';
    const audience=body?.audience;
    const mode=audience?.mode;
    const roleIds=audience?.roleIds ?? [],userIds=audience?.userIds ?? [],storeIds=audience?.storeIds ?? [];
    const publishAt=body?.publishAt ? new Date(body.publishAt) : new Date();
    if (!title || title.length>160 || !content || content.length>20000 || !categories.has(body.category) || !severities.has(body.severity)
      || !['all','roles','users'].includes(mode) || !Array.isArray(roleIds) || !Array.isArray(userIds) || !Array.isArray(storeIds)
      || roleIds.length>100 || userIds.length>1000 || storeIds.length>100 || roleIds.some(id=>!roleId.test(id))
      || userIds.some(id=>!uuid.test(id)) || storeIds.some(id=>!storeId.test(id))
      || (mode==='roles' && !roleIds.length) || (mode==='users' && !userIds.length)
      || Number.isNaN(publishAt.getTime()) || publishAt.getTime()>Date.now()+30*86400000) {
      send(res,400,{error:'Invalid announcement'});return true;
    }
    const client=await pool.connect();
    try { await client.query('BEGIN');
      const {rows:targets}=await client.query(`SELECT u.id,a.role_id,r.name AS role_name,a.store_ids FROM identity.users u
        JOIN identity.user_access a ON a.user_id=u.id JOIN identity.roles r ON r.id=a.role_id WHERE u.status='active'
        AND ($1::text='all' OR ($1::text='roles' AND a.role_id=ANY($2::text[])) OR ($1::text='users' AND u.id=ANY($3::uuid[])))
        AND (cardinality($4::text[])=0 OR a.store_ids && $4::text[])`,[mode,roleIds,userIds,storeIds]);
      if (!targets.length) { await client.query('ROLLBACK'); send(res,400,{error:'No recipients selected'});return true; }
      const saved=await client.query(`INSERT INTO message.announcements(title,category,severity,content,audience,publisher_user_id,published_at)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING id`,[title,body.category,body.severity,content,JSON.stringify({mode,roleIds,userIds,storeIds}),user.id,publishAt]);
      const id=saved.rows[0].id;
      await client.query(`INSERT INTO message.announcement_receipts
        (announcement_id,user_id,recipient_role_id,recipient_role_name,recipient_store_ids)
        SELECT $1,u.id,a.role_id,r.name,a.store_ids FROM identity.users u
        JOIN identity.user_access a ON a.user_id=u.id JOIN identity.roles r ON r.id=a.role_id
        WHERE u.id=ANY($2::uuid[])`,[id,targets.map(row=>row.id)]);
      await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,target,details)
        SELECT $1,a.role_id,r.name,'内部公告','发布公告',$2,$3::jsonb FROM identity.user_access a
        JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id,id,JSON.stringify({title,recipientCount:targets.length,severity:body.severity})]);
      await client.query('COMMIT');send(res,201,{id,recipientCount:targets.length,publishedAt:publishAt.toISOString()});return true;
    } catch(error) { await client.query('ROLLBACK');throw error; } finally { client.release(); }
  }
  const match=/^\/notices\/([0-9a-f-]{36})(?:\/(read))?$/.exec(path);
  if (match && uuid.test(match[1])) {
    if (match[2]==='read' && req.method==='POST') {
      const {rows}=await pool.query(`UPDATE message.announcement_receipts r SET read_at=COALESCE(r.read_at,now())
        FROM message.announcements n WHERE r.announcement_id=$1 AND r.user_id=$2
        AND n.id=r.announcement_id AND n.published_at<=now() RETURNING r.read_at`,[match[1],user.id]);
      send(res,rows.length?200:404,rows.length?{readAt:rows[0].read_at}:{error:'Not found'});return true;
    }
    if (!match[2] && req.method==='GET') {
      const {rows}=await pool.query(`SELECT n.*,r.read_at,u.display_name AS publisher_name FROM message.announcements n
        JOIN identity.users u ON u.id=n.publisher_user_id
        LEFT JOIN message.announcement_receipts r ON r.announcement_id=n.id AND r.user_id=$2
        WHERE n.id=$1 AND ((r.user_id IS NOT NULL AND n.published_at<=now()) OR $3::boolean)`,[match[1],user.id,canPublish]);
      send(res,rows.length?200:404,rows.length?own(rows[0]):{error:'Not found'});return true;
    }
  }
  send(res,404,{error:'Not found'});return true;
}

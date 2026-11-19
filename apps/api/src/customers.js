import { storeNames as STORE_NAMES } from './stores.js';
import { customerListCache } from './query-cache.js';
import { randomBytes } from 'node:crypto';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
const phoneRe = /^1\d{10}$/;
const DATA_IMAGE_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;



const ALLOWED_TIERS = new Set([
  '普通顾客',
  '银卡会员',
  '金卡会员',
  '黑卡会员',
  '青少年护眼会员',
]);

const ALLOWED_AGE_GROUPS = new Set([
  '',
  '儿童（0-12岁）',
  '青少年（13-17岁）',
  '青年（18-35岁）',
  '中年（36-59岁）',
  '长者（60岁及以上）',
]);

const DEFAULT_TAGS = [
  ['高度近视', 10],
  ['青少年防控', 20],
  ['渐进多焦点', 30],
  ['隐形眼镜常客', 40],
  ['VIP复购', 50],
  ['太阳镜偏好', 60],
  ['老花镜需求', 70],
];

const SEED_CUSTOMERS = [
  {
    member_no: 'QSL-M-20260001',
    name: '沈若曦',
    phone: '13805718801',
    gender: '女',
    birthday: '1997-04-18',
    age: 29,
    age_group: '青年（18-35岁）',
    address: '杭州市西湖区文三路258号',
    remark: '偏好轻量化纯钛镜架，对防蓝光镀膜要求较高',
    tier: '黑卡会员',
    medical_id_no: 'ZJ-33010619970418002X',
    tags: ['高度近视', 'VIP复购'],
    store_id: 'c103cf20-2c1f-5bb1-b89c-90fe147b5473',
    store_name: '杭州西湖旗舰店',
    guide_name: '苏晓晴',
    source: '门店接待',
    customer_type: '高价值会员',
    wechat_followed: true,
    stored_value_balance: 2400,
    points_balance: 1850,
    visit_count: 6,
    last_visit_date: '2026-11-12',
    next_review_date: '2027-05-12',
  },
  {
    member_no: 'QSL-M-20260002',
    name: '林子昂',
    phone: '13958024419',
    gender: '男',
    birthday: '2013-09-03',
    age: 13,
    age_group: '青少年（13-17岁）',
    address: '杭州市滨江区江南大道388号',
    remark: '离焦镜片半年复查跟进中，家长希望周末预约',
    tier: '青少年护眼会员',
    medical_id_no: '',
    tags: ['青少年防控'],
    store_id: 'store_hz_02',
    store_name: '杭州滨江天街店',
    guide_name: '陈思琪',
    source: '视光筛查转入',
    customer_type: '青少年近视管理',
    wechat_followed: true,
    stored_value_balance: 800,
    points_balance: 640,
    visit_count: 4,
    last_visit_date: '2026-11-08',
    next_review_date: '2027-02-08',
  },
  {
    member_no: 'QSL-M-20260003',
    name: '顾清远',
    phone: '13777431206',
    gender: '男',
    birthday: '1976-11-25',
    age: 49,
    age_group: '中年（36-59岁）',
    address: '上海市静安区南京西路1601号',
    remark: '定制蔡司渐进多焦点镜片，注意镜眼距微调',
    tier: '金卡会员',
    medical_id_no: 'SH-310106197611254115',
    tags: ['渐进多焦点', '太阳镜偏好'],
    store_id: 'store_sh_03',
    store_name: '上海静安寺店',
    guide_name: '陆嘉诚',
    source: '老客转介绍',
    customer_type: '老客复购',
    wechat_followed: false,
    stored_value_balance: 1500,
    points_balance: 920,
    visit_count: 3,
    last_visit_date: '2026-11-02',
    next_review_date: '2027-05-02',
  },
  {
    member_no: 'QSL-M-20260004',
    name: '唐诗涵',
    phone: '18651803392',
    gender: '女',
    birthday: '1999-07-12',
    age: 27,
    age_group: '青年（18-35岁）',
    address: '南京市秦淮区汉中路89号',
    remark: '月抛及日抛隐形眼镜固定复购客',
    tier: '银卡会员',
    medical_id_no: '',
    tags: ['隐形眼镜常客'],
    store_id: 'store_nj_04',
    store_name: '南京新街口店',
    guide_name: '赵文博',
    source: '线上预约',
    customer_type: '隐形复购客',
    wechat_followed: true,
    stored_value_balance: 300,
    points_balance: 410,
    visit_count: 5,
    last_visit_date: '2026-11-15',
    next_review_date: '2027-03-15',
  },
  {
    member_no: 'QSL-M-20260005',
    name: '周志明',
    phone: '13605176654',
    gender: '男',
    birthday: '1963-02-14',
    age: 63,
    age_group: '长者（60岁及以上）',
    address: '杭州市上城区延安路126号',
    remark: '需要看报专用老花镜与户外变色太阳镜组合',
    tier: '金卡会员',
    medical_id_no: 'YB-330102196302140118',
    tags: ['老花镜需求', 'VIP复购'],
    store_id: 'c103cf20-2c1f-5bb1-b89c-90fe147b5473',
    store_name: '杭州西湖旗舰店',
    guide_name: '苏晓晴',
    source: '门店接待',
    customer_type: '普通客群',
    wechat_followed: false,
    stored_value_balance: 600,
    points_balance: 780,
    visit_count: 2,
    last_visit_date: '2026-10-28',
    next_review_date: '2027-04-28',
  },
];

let schemaReadyPromise = null;

export function ensureCustomerSchema(pool) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS customer`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customer.profiles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          member_no varchar(40) NOT NULL UNIQUE,
          name varchar(80) NOT NULL CHECK (length(btrim(name)) > 0),
          phone varchar(24) NOT NULL,
          gender varchar(8) NOT NULL DEFAULT '男' CHECK (gender IN ('男', '女')),
          birthday date,
          age integer NOT NULL DEFAULT 0 CHECK (age >= 0 AND age <= 150),
          age_group varchar(32) NOT NULL DEFAULT '',
          address varchar(120) NOT NULL DEFAULT '',
          remark varchar(400) NOT NULL DEFAULT '',
          tier varchar(32) NOT NULL DEFAULT '普通顾客',
          avatar_url text,
          medical_id_no varchar(64) NOT NULL DEFAULT '',
          tags text[] NOT NULL DEFAULT '{}',
          store_id text NOT NULL,
          store_name varchar(120) NOT NULL DEFAULT '',
          guide_name varchar(80) NOT NULL DEFAULT '',
          source varchar(40) NOT NULL DEFAULT '门店新建',
          related_account varchar(80) NOT NULL DEFAULT '',
          customer_type varchar(40) NOT NULL DEFAULT '普通客群',
          wechat_followed boolean NOT NULL DEFAULT false,
          refundable_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (refundable_amount >= 0),
          stored_value_balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (stored_value_balance >= 0),
          points_balance integer NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
          visit_count integer NOT NULL DEFAULT 1 CHECK (visit_count >= 0),
          last_visit_date date DEFAULT CURRENT_DATE,
          next_review_date date,
          created_by uuid REFERENCES identity.users(id),
          updated_by uuid REFERENCES identity.users(id),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS customer_profiles_store_created_idx
          ON customer.profiles (store_id, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS customer_profiles_phone_idx
          ON customer.profiles (phone)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customer.tag_definitions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name varchar(40) NOT NULL CHECK (length(btrim(name)) > 0),
          sort_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS customer_tag_definitions_name_unique
          ON customer.tag_definitions (lower(name))
      `);

      for (const [name, sortOrder] of (process.env.QSL_ENABLE_DEMO_SEED === '1' ? DEFAULT_TAGS : [])) {
        await pool.query(
          `INSERT INTO customer.tag_definitions (name, sort_order)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [name, sortOrder]
        );
      }

      const { rows: countRows } = await pool.query(`SELECT count(*)::int AS total FROM customer.profiles`);
      if (process.env.QSL_ENABLE_DEMO_SEED === '1' && countRows[0]?.total === 0) {
        for (const item of SEED_CUSTOMERS) {
          await pool.query(
            `INSERT INTO customer.profiles (
               member_no, name, phone, gender, birthday, age, age_group,
               address, remark, tier, medical_id_no, tags,
               store_id, store_name, guide_name, source, customer_type,
               wechat_followed, stored_value_balance, points_balance, visit_count,
               last_visit_date, next_review_date
             ) VALUES (
               $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
             ) ON CONFLICT (member_no) DO NOTHING`,
            [
              item.member_no,
              item.name,
              item.phone,
              item.gender,
              item.birthday,
              item.age,
              item.age_group,
              item.address,
              item.remark,
              item.tier,
              item.medical_id_no,
              item.tags,
              item.store_id,
              item.store_name,
              item.guide_name,
              item.source,
              item.customer_type,
              item.wechat_followed,
              item.stored_value_balance,
              item.points_balance,
              item.visit_count,
              item.last_visit_date,
              item.next_review_date,
            ]
          );
        }
      }

      await pool.query(`
        UPDATE identity.roles
        SET permissions = array_append(permissions, 'basic.customer.create')
        WHERE permissions @> ARRAY['basic.customer.read']::text[]
          AND NOT permissions @> ARRAY['basic.customer.create']::text[]
      `);
      await pool.query(`
        UPDATE identity.roles
        SET permissions = array_append(permissions, 'basic.customer.update')
        WHERE permissions @> ARRAY['basic.customer.read']::text[]
          AND NOT permissions @> ARRAY['basic.customer.update']::text[]
      `);
      await pool.query(`
        UPDATE identity.roles
        SET permissions = array_append(permissions, 'basic.customer.delete')
        WHERE id IN ('role_hq_admin', 'role_store_manager')
          AND NOT permissions @> ARRAY['basic.customer.delete']::text[]
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }
  return schemaReadyPromise;
}

const clip = (val, max) => (typeof val === 'string' ? val.trim().slice(0, max) : '');
const charLen = (str) => Array.from(str).length;

function maskPhoneStr(phone, allowPlaintext) {
  if (allowPlaintext || !phone) return phone;
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function shapeCustomer(row, allowPlaintext) {
  const toIsoDate = (val) => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return String(val).slice(0, 10);
  };
  return {
    id: row.id,
    memberNo: row.member_no,
    name: row.name,
    phone: maskPhoneStr(row.phone, allowPlaintext),
    phoneMasked: !allowPlaintext,
    gender: row.gender,
    birthday: toIsoDate(row.birthday),
    age: Number(row.age ?? 0),
    ageGroup: row.age_group ?? '',
    address: row.address ?? '',
    remark: row.remark ?? '',
    tier: row.tier ?? '普通顾客',
    avatarUrl: row.avatar_url ?? undefined,
    medicalIdNo: row.medical_id_no ?? '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    storeId: row.store_id,
    storeName: row.store_name || STORE_NAMES[row.store_id] || row.store_id,
    guideName: row.guide_name ?? '',
    source: row.source ?? '门店新建',
    relatedAccount: row.related_account ?? '',
    customerType: row.customer_type ?? '普通客群',
    wechatFollowed: Boolean(row.wechat_followed),
    refundableAmount: Number(row.refundable_amount ?? 0).toFixed(2),
    storedValueBalance: Number(row.stored_value_balance ?? 0).toFixed(2),
    pointsBalance: Number(row.points_balance ?? 0),
    visitCount: Number(row.visit_count ?? 1),
    lastVisitDate: toIsoDate(row.last_visit_date),
    nextReviewDate: toIsoDate(row.next_review_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateMemberNo() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `QSL-M-${datePart}-${rand}`;
}

function validateCustomerInput(body, creating, actor, existingRow = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('请求格式无效');
  }

  const name = 'name' in body ? clip(body.name, 80) : existingRow?.name ?? '';
  if (!name) throw new Error('请输入顾客姓名');

  let phone = existingRow?.phone ?? '';
  if ('phone' in body) {
    const rawPhone = clip(body.phone, 24);
    if (creating) {
      if (!phoneRe.test(rawPhone)) throw new Error('请输入有效的 11 位手机号');
      phone = rawPhone;
    } else if (rawPhone && !rawPhone.includes('****')) {
      if (!phoneRe.test(rawPhone)) throw new Error('请输入有效的 11 位手机号');
      phone = rawPhone;
    }
  } else if (creating) {
    throw new Error('请输入 11 位手机号');
  }

  const gender = 'gender' in body ? body.gender : existingRow?.gender ?? '男';
  if (gender !== '男' && gender !== '女') throw new Error('请选择有效的性别');

  let birthday = existingRow?.birthday ?? null;
  if ('birthday' in body) {
    if (body.birthday === null || body.birthday === '') {
      birthday = null;
    } else if (typeof body.birthday === 'string' && isoDateRe.test(body.birthday.trim())) {
      birthday = body.birthday.trim();
    } else {
      throw new Error('生日日期格式无效');
    }
  }

  let age = existingRow?.age ?? 0;
  if ('age' in body) {
    const parsedAge = Number(body.age);
    if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      throw new Error('年龄须为 0 至 150 的整数');
    }
    age = parsedAge;
  }

  const ageGroup = 'ageGroup' in body ? clip(body.ageGroup, 32) : existingRow?.age_group ?? '';
  if (!ALLOWED_AGE_GROUPS.has(ageGroup)) {
    throw new Error('不支持的年龄段选项');
  }

  const address = 'address' in body ? String(body.address ?? '').trim() : existingRow?.address ?? '';
  if (charLen(address) > 50) throw new Error('地址不能超过 50 个字');

  const remark = 'remark' in body ? String(body.remark ?? '').trim() : existingRow?.remark ?? '';
  if (charLen(remark) > 300) throw new Error('备注不能超过 300 个字');

  let memberNo = existingRow?.member_no ?? '';
  if ('memberNo' in body) {
    const customNo = clip(body.memberNo, 40);
    if (customNo) {
      memberNo = customNo;
    } else if (creating) {
      memberNo = generateMemberNo();
    }
  } else if (creating) {
    memberNo = generateMemberNo();
  }

  const tier = 'tier' in body ? clip(body.tier, 32) || '普通顾客' : existingRow?.tier ?? '普通顾客';
  if (!ALLOWED_TIERS.has(tier)) throw new Error('不支持的会员等级');

  let avatarUrl = existingRow?.avatar_url ?? null;
  if ('avatarUrl' in body) {
    if (body.avatarUrl === null || body.avatarUrl === '') {
      avatarUrl = null;
    } else if (
      typeof body.avatarUrl === 'string' &&
      body.avatarUrl.length <= 96000 &&
      DATA_IMAGE_URL_RE.test(body.avatarUrl)
    ) {
      avatarUrl = body.avatarUrl;
    } else {
      throw new Error('头像图片格式无效或体积过大');
    }
  }

  const medicalIdNo = 'medicalIdNo' in body ? clip(body.medicalIdNo, 64) : existingRow?.medical_id_no ?? '';

  let tags = existingRow?.tags ?? [];
  if ('tags' in body) {
    if (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some((t) => typeof t !== 'string' || clip(t, 40).length === 0)) {
      throw new Error('标签格式无效');
    }
    tags = [...new Set(body.tags.map((t) => clip(t, 40)))];
  }

  const requestedStoreId = 'storeId' in body ? clip(body.storeId, 80) : existingRow?.store_id ?? actor.store_ids[0];
  const storeId = requestedStoreId || actor.store_ids[0];
  if (!actor.store_ids.includes(storeId)) {
    throw new Error('所属门店超出当前账号授权范围');
  }
  const storeName = STORE_NAMES[storeId] ?? storeId;

  const guideName = 'guideName' in body ? clip(body.guideName, 80) : existingRow?.guide_name ?? '';
  const source = 'source' in body ? clip(body.source, 40) || '门店新建' : existingRow?.source ?? '门店新建';
  const relatedAccount = 'relatedAccount' in body ? clip(body.relatedAccount, 80) : existingRow?.related_account ?? '';
  const customerType = 'customerType' in body ? clip(body.customerType, 40) || '普通客群' : existingRow?.customer_type ?? '普通客群';
  const wechatFollowed = 'wechatFollowed' in body ? Boolean(body.wechatFollowed) : Boolean(existingRow?.wechat_followed);

  let nextReviewDate = existingRow?.next_review_date ?? null;
  if ('nextReviewDate' in body) {
    if (body.nextReviewDate === null || body.nextReviewDate === '') {
      nextReviewDate = null;
    } else if (typeof body.nextReviewDate === 'string' && isoDateRe.test(body.nextReviewDate.trim())) {
      nextReviewDate = body.nextReviewDate.trim();
    } else {
      throw new Error('下次复查日期格式无效');
    }
  }

  return {
    memberNo,
    name,
    phone,
    gender,
    birthday,
    age,
    ageGroup,
    address,
    remark,
    tier,
    avatarUrl,
    medicalIdNo,
    tags,
    storeId,
    storeName,
    guideName,
    source,
    relatedAccount,
    customerType,
    wechatFollowed,
    nextReviewDate,
  };
}

async function writeCustomerLog(client, userId, action, target, details, ipAddress) {
  await client.query(
    `INSERT INTO identity.operation_log(actor_user_id, actor_role_id, actor_role_name, category, action, target, details, ip_address)
     SELECT $1, a.role_id, r.name, '客户档案', $2, $3, $4::jsonb, $5
     FROM identity.user_access a
     JOIN identity.roles r ON r.id = a.role_id
     WHERE a.user_id = $1`,
    [userId, action, target, JSON.stringify(details), ipAddress]
  );
}

export async function handleCustomers({ req, res, url, user, pool, send, readJson, clientIp }) {
  const path = url.pathname;
  if (path !== '/customers' && !path.startsWith('/customers/')) return false;
  if (!user) {
    send(res, 401, { error: 'Unauthorized' });
    return true;
  }

  await ensureCustomerSchema(pool);

  const { rows: actorRows } = await pool.query(
    `SELECT a.role_id, a.store_ids, a.permission_denies, r.identity_type, r.permissions, r.sensitive_fields
     FROM identity.user_access a
     JOIN identity.roles r ON r.id = a.role_id
     WHERE a.user_id = $1`,
    [user.id]
  );
  const actor = actorRows[0];
  if (!actor || actor.identity_type === 'supplier' || !actor.store_ids.length) {
    send(res, 403, { error: 'Forbidden' });
    return true;
  }

  const hasPerm = (code) =>
    actor.permissions.includes(code) && !actor.permission_denies.includes(code);

  const canRead = hasPerm('basic.customer.read') || hasPerm('members.profile.read');
  const canCreate = hasPerm('basic.customer.create') || hasPerm('members.profile.create') || hasPerm('basic.customer.read');
  const canUpdate = hasPerm('basic.customer.update') || hasPerm('basic.customer.read');
  const canDelete = hasPerm('basic.customer.delete') || actor.identity_type === 'admin' || actor.role_id === 'role_store_manager';
  const allowPlaintext = Boolean(actor.sensitive_fields?.viewPlaintextPhone);

  if (!canRead) {
    send(res, 403, { error: 'Forbidden' });
    return true;
  }

  // Tag definitions endpoints
  if (path === '/customers/tags' && req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT id, name, sort_order, created_at
       FROM customer.tag_definitions
       ORDER BY sort_order ASC, created_at ASC`
    );
    send(res, 200, { items: rows });
    return true;
  }

  if (path === '/customers/tags' && req.method === 'POST') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: 'Invalid JSON' });
      return true;
    }
    const name = clip(body?.name, 40);
    if (!name) {
      send(res, 400, { error: '请输入标签名称' });
      return true;
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO customer.tag_definitions (name, sort_order)
         VALUES ($1, COALESCE((SELECT max(sort_order) + 10 FROM customer.tag_definitions), 10))
         RETURNING id, name, sort_order, created_at`,
        [name]
      );
      send(res, 201, { item: rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        send(res, 409, { error: '该标签已存在' });
        return true;
      }
      throw error;
    }
    return true;
  }

  const tagMatch = /^\/customers\/tags\/([^/]+)$/.exec(path);
  if (tagMatch && req.method === 'DELETE') {
    const tagId = tagMatch[1];
    if (!uuidRe.test(tagId)) {
      send(res, 400, { error: 'Invalid tag id' });
      return true;
    }
    const { rowCount } = await pool.query(`DELETE FROM customer.tag_definitions WHERE id = $1`, [tagId]);
    send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
    return true;
  }

  // Batch endpoints
  if (path === '/customers/batch-delete' && req.method === 'POST') {
    if (!canDelete) {
      send(res, 403, { error: '当前角色无批量删除客户权限' });
      return true;
    }
    let body;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: 'Invalid JSON' });
      return true;
    }
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string' && uuidRe.test(id)) : [];
    if (!ids.length || ids.length > 200) {
      send(res, 400, { error: '请选择有效的顾客记录' });
      return true;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: deleted } = await client.query(
        `DELETE FROM customer.profiles
         WHERE id = ANY($1::uuid[]) AND store_id = ANY($2::text[])
         RETURNING id, member_no, name`,
        [ids, actor.store_ids]
      );
      if (deleted.length) {
        await writeCustomerLog(
          client,
          user.id,
          '批量删除顾客资料',
          `${deleted.length}条记录`,
          { count: deleted.length, memberNos: deleted.map((d) => d.member_no) },
          clientIp ? clientIp(req) : null
        );
      }
      await client.query('COMMIT');
      send(res, 200, { deletedCount: deleted.length });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  if (path === '/customers/batch-visit' && req.method === 'POST') {
    if (!canUpdate) {
      send(res, 403, { error: 'Forbidden' });
      return true;
    }
    let body;
    try {
      body = await readJson(req);
    } catch {
      send(res, 400, { error: 'Invalid JSON' });
      return true;
    }
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string' && uuidRe.test(id)) : [];
    if (!ids.length || ids.length > 200) {
      send(res, 400, { error: '请选择有效的顾客记录' });
      return true;
    }
    const visitDate = typeof body?.visitDate === 'string' && isoDateRe.test(body.visitDate)
      ? body.visitDate
      : new Date().toISOString().slice(0, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: updated } = await client.query(
        `UPDATE customer.profiles
         SET last_visit_date = $1::date,
             visit_count = visit_count + 1,
             updated_by = $2,
             updated_at = now()
         WHERE id = ANY($3::uuid[]) AND store_id = ANY($4::text[])
         RETURNING id, member_no`,
        [visitDate, user.id, ids, actor.store_ids]
      );
      if (updated.length) {
        await writeCustomerLog(
          client,
          user.id,
          '更新顾客到店时间',
          `${updated.length}条记录`,
          { visitDate, count: updated.length },
          clientIp ? clientIp(req) : null
        );
      }
      await client.query('COMMIT');
      send(res, 200, { updatedCount: updated.length, visitDate });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const detailMatch = /^\/customers\/([0-9a-f-]{36})\/detail\/([a-z_]+)$/.exec(path);
  if (detailMatch) {
    const [, customerId, section] = detailMatch;
    const sections = new Set(['basic','vision','sales','history','repairs','referrals','health','extensions']);
    if (!uuidRe.test(customerId) || !sections.has(section)) { send(res, 400, { error: 'Invalid detail request' }); return true; }
    const { rows: visible } = await pool.query('SELECT id FROM customer.profiles WHERE id=$1 AND store_id=ANY($2::text[])', [customerId, actor.store_ids]);
    if (!visible.length) { send(res, 404, { error: 'Customer not found' }); return true; }
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT id, payload, created_at, updated_at FROM customer.detail_records WHERE customer_id=$1 AND section=$2 ORDER BY created_at DESC', [customerId, section]);
      send(res, 200, { items: rows }); return true;
    }
    if (req.method === 'DELETE' && section === 'vision') {
      if (!canDelete) { send(res, 403, { error: 'Forbidden' }); return true; }
      let body;
      try { body = await readJson(req, 1024); }
      catch { send(res, 400, { error: 'Invalid JSON' }); return true; }
      if (!uuidRe.test(body?.recordId)) {
        send(res, 400, { error: 'Invalid record id' }); return true;
      }
      const { rowCount } = await pool.query(
        `DELETE FROM customer.detail_records AS record USING customer.profiles AS profile
         WHERE record.id=$1 AND record.customer_id=$2 AND record.section='vision'
           AND profile.id=record.customer_id AND profile.store_id=ANY($3::text[])`,
        [body.recordId, customerId, actor.store_ids],
      );
      send(res, rowCount ? 200 : 404, rowCount ? { deleted: true } : { error: 'Record not found' });
      return true;
    }
    const validVision = payload => section !== 'vision' || Object.entries(payload).every(([key, value]) => {
      if (key.length > 160 || typeof value !== 'string') return false;
      if (!value.startsWith('data:')) return value.length <= 12000;
      const match = /^data:(image\/(?:png|jpeg|webp)|application\/json);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
      if (!match || match[2].length % 4 !== 0) return false;
      const bytes = Buffer.from(match[2], 'base64');
      if (!bytes.length || bytes.length > 2097152) return false;
      if (match[1] === 'application/json') {
        try { JSON.parse(bytes.toString('utf8')); } catch { return false; }
      }
      return true;
    });
    if (req.method === 'PATCH') {
      if (!canUpdate) { send(res,403,{error:'Forbidden'}); return true; }
      let body; try { body=await readJson(req,section === 'vision' ? 12582912 : 65536); } catch { send(res,400,{error:'Invalid JSON'}); return true; }
      if (!uuidRe.test(body?.recordId) || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload) || !validVision(body.payload) || JSON.stringify(body.payload).length>(section === 'vision' ? 12000000 : 16000)) { send(res,400,{error:'Invalid detail payload'}); return true; }
      const {rows}=await pool.query('UPDATE customer.detail_records SET payload=$4::jsonb,updated_at=now() WHERE id=$3 AND customer_id=$1 AND section=$2 RETURNING id,payload,created_at,updated_at',[customerId,section,body.recordId,JSON.stringify(body.payload)]);
      if(!rows.length){send(res,404,{error:'Record not found'});return true;} send(res,200,{item:rows[0]});return true;
    }
    if (req.method === 'POST') {
      if (!canUpdate) { send(res, 403, { error: 'Forbidden' }); return true; }
      let body; try { body=await readJson(req, section === 'vision' ? 12582912 : 65536); } catch { send(res, 400, {error:'Invalid JSON'}); return true; }
      if (!body || typeof body !== 'object' || Array.isArray(body) || !validVision(body) || JSON.stringify(body).length > (section === 'vision' ? 12000000 : 16000)) { send(res,400,{error:'Invalid detail payload'}); return true; }
      const { rows } = await pool.query('INSERT INTO customer.detail_records(customer_id,section,payload,created_by) VALUES($1,$2,$3::jsonb,$4) RETURNING id,payload,created_at,updated_at', [customerId,section,JSON.stringify(body),user.id]);
      send(res,201,{item:rows[0]}); return true;
    }
    return false;
  }

  // Single or collection endpoints
  const itemMatch = /^\/customers(?:\/([^/]+))?$/.exec(path);
  if (!itemMatch) return false;
  const id = itemMatch[1];
  if (id && !uuidRe.test(id)) {
    send(res, 400, { error: 'Invalid customer id' });
    return true;
  }

  if (req.method === 'GET' && id) {
    const { rows } = await pool.query(
      `SELECT * FROM customer.profiles WHERE id = $1 AND store_id = ANY($2::text[])`,
      [id, actor.store_ids]
    );
    if (!rows.length) {
      send(res, 404, { error: '未找到该顾客资料' });
      return true;
    }
    send(res, 200, { item: shapeCustomer(rows[0], allowPlaintext) });
    return true;
  }

  if (req.method === 'GET' && !id) {
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1));
    const pageSize = Math.max(1, Math.min(200, Number.parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));
    const keyword = clip(url.searchParams.get('keyword'), 120);
    const storeId = clip(url.searchParams.get('storeId'), 80);
    const gender = clip(url.searchParams.get('gender'), 16);
    const tier = clip(url.searchParams.get('tier'), 32);

    if (storeId && storeId !== 'all' && !actor.store_ids.includes(storeId)) {
      send(res, 403, { error: '所选门店超出授权范围' });
      return true;
    }

    const kwPattern = keyword ? `%${keyword.replace(/[\\%_]/g, '\\$&')}%` : null;
    const values = [
      actor.store_ids,
      storeId && storeId !== 'all' ? storeId : null,
      gender && gender !== 'all' ? gender : null,
      tier && tier !== 'all' ? tier : null,
      kwPattern,
    ];
    const where = `
      WHERE store_id = ANY($1::text[])
        AND ($2::text IS NULL OR store_id = $2)
        AND ($3::text IS NULL OR gender = $3)
        AND ($4::text IS NULL OR tier = $4)
        AND (
          $5::text IS NULL
          OR name ILIKE $5 ESCAPE '\\'
          OR member_no ILIKE $5 ESCAPE '\\'
          OR phone ILIKE $5 ESCAPE '\\'
          OR guide_name ILIKE $5 ESCAPE '\\'
          OR medical_id_no ILIKE $5 ESCAPE '\\'
        )
    `;

    const cacheKey = JSON.stringify([values, page, pageSize]);
    const result = await customerListCache.load(cacheKey, async () => {
      const countRes = await pool.query(`SELECT count(*)::int AS total FROM customer.profiles ${where}`, values);
      // Page over narrow indexed keys before fetching wide customer rows.
      const { rows } = await pool.query(
        `SELECT p.* FROM (
           SELECT id, created_at FROM customer.profiles ${where}
           ORDER BY created_at DESC, id DESC LIMIT $6 OFFSET $7
         ) page JOIN customer.profiles p ON p.id = page.id
         ORDER BY page.created_at DESC, page.id DESC`,
        [...values, pageSize, (page - 1) * pageSize]
      );
      return { rows, total: countRes.rows[0]?.total ?? 0 };
    });
    send(res, 200, {
      items: result.rows.map((row) => shapeCustomer(row, allowPlaintext)),
      total: result.total,
      page,
      pageSize,
    });
    return true;
  }

  if (req.method === 'POST' && !id) {
    if (!canCreate) {
      send(res, 403, { error: 'Forbidden' });
      return true;
    }
    let body;
    try {
      body = await readJson(req, 131072);
    } catch (error) {
      send(res, 400, { error: error.message === 'Request too large' ? '头像图片或请求体积过大' : 'Invalid JSON' });
      return true;
    }

    let data;
    try {
      data = validateCustomerInput(body, true, actor);
    } catch (error) {
      send(res, 400, { error: error.message });
      return true;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO customer.profiles (
           member_no, name, phone, gender, birthday, age, age_group,
           address, remark, tier, avatar_url, medical_id_no, tags,
           store_id, store_name, guide_name, source, related_account,
           customer_type, wechat_followed, next_review_date,
           created_by, updated_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$22
         ) RETURNING *`,
        [
          data.memberNo,
          data.name,
          data.phone,
          data.gender,
          data.birthday,
          data.age,
          data.ageGroup,
          data.address,
          data.remark,
          data.tier,
          data.avatarUrl,
          data.medicalIdNo,
          data.tags,
          data.storeId,
          data.storeName,
          data.guideName || user.display_name || '',
          data.source,
          data.relatedAccount,
          data.customerType,
          data.wechatFollowed,
          data.nextReviewDate,
          user.id,
        ]
      );
      await writeCustomerLog(
        client,
        user.id,
        '新增顾客资料',
        rows[0].member_no,
        { name: rows[0].name, storeId: rows[0].store_id, tier: rows[0].tier },
        clientIp ? clientIp(req) : null
      );
      await client.query('COMMIT');
      send(res, 201, { item: shapeCustomer(rows[0], allowPlaintext) });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        send(res, 409, { error: '会员卡号已存在，请更换后重试' });
        return true;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    if (!canUpdate) {
      send(res, 403, { error: 'Forbidden' });
      return true;
    }
    let body;
    try {
      body = await readJson(req, 131072);
    } catch (error) {
      send(res, 400, { error: error.message === 'Request too large' ? '头像图片或请求体积过大' : 'Invalid JSON' });
      return true;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existingRows } = await client.query(
        `SELECT * FROM customer.profiles WHERE id = $1 AND store_id = ANY($2::text[]) FOR UPDATE`,
        [id, actor.store_ids]
      );
      if (!existingRows.length) {
        await client.query('ROLLBACK');
        send(res, 404, { error: '未找到该顾客资料' });
        return true;
      }

      let data;
      try {
        data = validateCustomerInput(body, false, actor, existingRows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        send(res, 400, { error: error.message });
        return true;
      }

      const { rows: updatedRows } = await client.query(
        `UPDATE customer.profiles
         SET member_no = $2,
             name = $3,
             phone = $4,
             gender = $5,
             birthday = $6,
             age = $7,
             age_group = $8,
             address = $9,
             remark = $10,
             tier = $11,
             avatar_url = $12,
             medical_id_no = $13,
             tags = $14,
             store_id = $15,
             store_name = $16,
             guide_name = $17,
             source = $18,
             related_account = $19,
             customer_type = $20,
             wechat_followed = $21,
             next_review_date = $22,
             updated_by = $23,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          data.memberNo,
          data.name,
          data.phone,
          data.gender,
          data.birthday,
          data.age,
          data.ageGroup,
          data.address,
          data.remark,
          data.tier,
          data.avatarUrl,
          data.medicalIdNo,
          data.tags,
          data.storeId,
          data.storeName,
          data.guideName,
          data.source,
          data.relatedAccount,
          data.customerType,
          data.wechatFollowed,
          data.nextReviewDate,
          user.id,
        ]
      );

      await writeCustomerLog(
        client,
        user.id,
        '更新顾客资料',
        updatedRows[0].member_no,
        { name: updatedRows[0].name, storeId: updatedRows[0].store_id, tier: updatedRows[0].tier },
        clientIp ? clientIp(req) : null
      );
      await client.query('COMMIT');
      send(res, 200, { item: shapeCustomer(updatedRows[0], allowPlaintext) });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        send(res, 409, { error: '会员卡号已存在，请更换后重试' });
        return true;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  send(res, 405, { error: 'Method not allowed' });
  return true;
}

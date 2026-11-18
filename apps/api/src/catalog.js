const DATA_IMAGE_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const ALL_STORE_IDS = ['store_hq_01', 'store_hz_02', 'store_sh_03', 'store_nj_04'];

const DEFAULT_OPTICAL_SUPPLIERS = [
  {
    name: '卡尔蔡司光学华东代理',
    alias: '蔡司华东',
    alias_pinyin: 'CSHD',
    contact: '张明远',
    phone: '13800138001',
    landline: '020-82091100',
    categories: ['镜片', '加工工艺'],
    is_default: true,
    enabled: true,
    province: '广东省',
    city: '广州市',
    district: '黄埔区',
    detail_address: '中新广州知识城九龙大道蔡司光学产业园',
    shipping_area_code: '020',
    sort_order: 10,
    scope: '蔡司泽锐 / 智锐 / 小乐园离焦镜片 / 钻立方镀膜定制',
    credit_code: '91440101797399881K',
    device_license_number: '粤穗食药监械经营许20230188号',
    device_license_issuer: '广州市市场监督管理局',
    device_license_valid_from: '2023-05-01',
    device_license_expires_on: '2028-04-30',
    is_supply_chain: true,
    authorized_store_ids: ALL_STORE_IDS,
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '依视路镜片供应链中心',
    alias: '依视路供应链',
    alias_pinyin: 'YSLGYL',
    contact: '陈思琪',
    phone: '13957186620',
    landline: '021-57748800',
    categories: ['镜片', '护理液'],
    is_default: false,
    enabled: true,
    province: '上海市',
    city: '上海市',
    district: '松江区',
    detail_address: '松江工业区东部新区锦昔路88号',
    shipping_area_code: '021',
    sort_order: 20,
    scope: '星趣控离焦镜片 / 万里路渐进片 / 钻晶膜岩系列',
    credit_code: '91310000607366412N',
    device_license_number: '沪松食药监械经营许20240092号',
    device_license_issuer: '上海市松江区市场监督管理局',
    device_license_valid_from: '2024-01-15',
    device_license_expires_on: '2029-01-14',
    is_supply_chain: true,
    authorized_store_ids: ALL_STORE_IDS,
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '北欧钛架联合供货商',
    alias: '北欧钛架',
    alias_pinyin: 'BETJ',
    contact: '林俊杰',
    phone: '13758209912',
    landline: '0577-86352200',
    categories: ['镜架', '太阳镜', '老花镜'],
    is_default: false,
    enabled: true,
    province: '浙江省',
    city: '温州市',
    district: '瓯海区',
    detail_address: '中国（瓯海）眼镜小镇光学产业中心6号楼',
    shipping_area_code: '0577',
    sort_order: 30,
    scope: '纯钛超轻光学镜架 / β钛儿童镜架 / 商务太阳镜',
    credit_code: '91330304MA2890123X',
    is_supply_chain: false,
    authorized_store_ids: ALL_STORE_IDS,
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '精益高登光学器械有限公司',
    alias: '精益高登',
    alias_pinyin: 'JYGD',
    contact: '赵伟',
    phone: '18570742105',
    categories: ['镜架', '镜片', '辅料'],
    is_default: false,
    enabled: true,
    province: '江苏省',
    city: '镇江市',
    district: '丹阳市',
    detail_address: '丹阳市开发区眼镜城供应链B区18号',
    shipping_area_code: '0511',
    sort_order: 40,
    scope: '中高端光学镜架 / 验光辅料及陈列道具',
    is_supply_chain: false,
    authorized_store_ids: ['store_hq_01', 'store_hz_02'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '重庆千里眼商贸有限公司',
    alias: '千里眼商贸',
    alias_pinyin: 'QLYSM',
    contact: '喻杰',
    phone: '15730095918',
    categories: ['镜架', '太阳镜'],
    is_default: false,
    enabled: true,
    province: '重庆市',
    city: '重庆市',
    district: '渝中区',
    detail_address: '解放碑光学商贸大厦12层',
    shipping_area_code: '023',
    sort_order: 50,
    scope: '潮牌太阳镜 / 板材与金属混搭光学镜架',
    is_supply_chain: false,
    authorized_store_ids: ['store_hq_01', 'store_sh_03'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '洪旭德生光学镜片有限公司',
    alias: '洪旭德生',
    alias_pinyin: 'HXDS',
    contact: '孙小云',
    phone: '13637911165',
    categories: ['镜片'],
    is_default: false,
    enabled: true,
    province: '浙江省',
    city: '杭州市',
    district: '滨江区',
    detail_address: '滨江区江南大道388号光学分拨中心',
    shipping_area_code: '0571',
    sort_order: 60,
    scope: '洪旭德生镜片 / 高折射率非球面防蓝光镜片',
    device_license_number: '浙杭食药监械经营许20231024号',
    device_license_issuer: '杭州市市场监督管理局',
    device_license_valid_from: '2023-08-01',
    device_license_expires_on: '2028-07-31',
    is_supply_chain: true,
    authorized_store_ids: ALL_STORE_IDS,
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '上海图观眼镜有限公司',
    alias: '上海图观',
    alias_pinyin: 'SHTG',
    contact: '王学军',
    phone: '13851186908',
    landline: '0511-86990888',
    categories: ['老花镜', '镜架'],
    is_default: false,
    enabled: true,
    province: '上海市',
    city: '上海市',
    district: '静安区',
    detail_address: '青云路国际眼镜批发城3楼A12',
    shipping_area_code: '021',
    sort_order: 70,
    scope: '吉瑞祥老光 / 中老年折叠便携老花镜系列',
    is_supply_chain: false,
    authorized_store_ids: ['store_hq_01', 'store_sh_03', 'store_nj_04'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '四川上品视嘉眼镜有限公司',
    alias: '上品视嘉',
    alias_pinyin: 'SPSJ',
    contact: '黄国强',
    phone: '15528329966',
    categories: ['镜片', '镜架'],
    is_default: false,
    enabled: true,
    province: '四川省',
    city: '成都市',
    district: '武侯区',
    detail_address: '人民南路四段视光供应链中心5栋',
    shipping_area_code: '028',
    sort_order: 80,
    scope: '尼康镜片 / 精品钛架西南华东联采',
    device_license_number: '川蓉食药监械经营许20240216号',
    device_license_issuer: '成都市市场监督管理局',
    device_license_valid_from: '2024-03-01',
    device_license_expires_on: '2029-02-28',
    is_supply_chain: true,
    authorized_store_ids: ALL_STORE_IDS,
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '上海忠诚商贸有限公司',
    alias: '忠诚商贸',
    alias_pinyin: 'ZCSM',
    contact: '陆向虎',
    phone: '13575464047',
    categories: ['太阳镜', '镜架'],
    is_default: false,
    enabled: true,
    province: '上海市',
    city: '上海市',
    district: '黄浦区',
    detail_address: '西藏南路品牌授权代理中心9层',
    shipping_area_code: '021',
    sort_order: 90,
    scope: '杜鲁萨迪 / 陌森太阳镜 / 暴龙太阳镜',
    is_supply_chain: false,
    authorized_store_ids: ['store_hq_01', 'store_hz_02', 'store_sh_03'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '北京宝典商贸有限责任公司',
    alias: '北京宝典',
    alias_pinyin: 'BJBD',
    contact: '余小羽',
    phone: '13910085566',
    categories: ['太阳镜', '镜架'],
    is_default: false,
    enabled: true,
    province: '北京市',
    city: '北京市',
    district: '朝阳区',
    detail_address: '东三环国际奢品眼镜展示中心201室',
    shipping_area_code: '010',
    sort_order: 100,
    scope: '保时捷太阳镜 / 华尔诗丹 / 芙莱尔高端镜架',
    is_supply_chain: false,
    authorized_store_ids: ['store_hq_01', 'store_sh_03'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '欧普康视角膜塑形镜供应站',
    alias: '欧普康视',
    alias_pinyin: 'OPKS',
    contact: '周明',
    phone: '13605517890',
    landline: '0551-65319900',
    categories: ['隐形眼镜', '护理液', '视觉训练'],
    is_default: false,
    enabled: true,
    province: '安徽省',
    city: '合肥市',
    district: '高新区',
    detail_address: '望江西路4899号欧普康视产业园',
    shipping_area_code: '0551',
    sort_order: 100,
    scope: '角膜塑形镜（OK镜）/ 离焦软镜 / 双氧水护理液',
    credit_code: '91340100723309921T',
    device_license_number: '皖合食药监械经营许20230512号',
    device_license_issuer: '合肥市市场监督管理局',
    device_license_valid_from: '2023-09-01',
    device_license_expires_on: '2028-08-31',
    is_supply_chain: true,
    authorized_store_ids: ALL_STORE_IDS,
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
  {
    name: '博士伦隐形与护理直供中心',
    alias: '博士伦直供',
    alias_pinyin: 'BSLZG',
    contact: '刘晓燕',
    phone: '13922187743',
    categories: ['隐形眼镜', '护理液', '其他'],
    is_default: false,
    enabled: true,
    province: '北京市',
    city: '北京市',
    district: '东城区',
    detail_address: '幸福大街博士伦华东华北直供物流仓',
    shipping_area_code: '010',
    sort_order: 100,
    scope: '清朗日抛月抛隐形眼镜 / 博乐纯多功能护理液 / 洗眼液',
    device_license_number: '京东食药监械经营许20240108号',
    device_license_issuer: '北京市东城区市场监督管理局',
    device_license_valid_from: '2024-02-01',
    device_license_expires_on: '2029-01-31',
    is_supply_chain: true,
    authorized_store_ids: ALL_STORE_IDS,
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
  },
];

let supplierSchemaReadyPromise = null;

export function ensureSupplierSchema(pool) {
  if (!supplierSchemaReadyPromise) {
    supplierSchemaReadyPromise = (async () => {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS catalog`);
      await pool.query(`
        ALTER TABLE catalog.suppliers
          ADD COLUMN IF NOT EXISTS alias_pinyin varchar(120) NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS landline varchar(60) NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS wechat varchar(80) NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS qq varchar(40) NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS shipping_area_code varchar(60) NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100,
          ADD COLUMN IF NOT EXISTS business_license_image text NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS device_license_image text NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS device_license_issued_on date,
          ADD COLUMN IF NOT EXISTS device_license_issuer varchar(180) NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS device_license_valid_from date,
          ADD COLUMN IF NOT EXISTS is_supply_chain boolean NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS bound_franchise_stores text[] NOT NULL DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS authorized_store_ids text[] NOT NULL DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS owner_store_type varchar(40) NOT NULL DEFAULT '总店',
          ADD COLUMN IF NOT EXISTS owner_store_name varchar(120) NOT NULL DEFAULT '杭州西湖旗舰店',
          ADD COLUMN IF NOT EXISTS bound_product_ids text[] NOT NULL DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS third_party_binding jsonb NOT NULL DEFAULT '{}'::jsonb
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS suppliers_sort_order_idx
          ON catalog.suppliers (sort_order ASC, is_default DESC, created_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS catalog.supplier_invitations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          invite_code varchar(64) NOT NULL,
          status varchar(24) NOT NULL DEFAULT '待审核',
          target_store_name varchar(120) NOT NULL DEFAULT '',
          target_store_contact varchar(80) NOT NULL DEFAULT '',
          applied_at timestamptz NOT NULL DEFAULT now(),
          note text NOT NULL DEFAULT '',
          supplier_id uuid REFERENCES catalog.suppliers(id) ON DELETE SET NULL,
          created_by uuid
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS supplier_invitations_applied_idx
          ON catalog.supplier_invitations (applied_at DESC)
      `);

      // Sync & enrich seeded optical suppliers in PostgreSQL without duplicating existing records
      for (const item of DEFAULT_OPTICAL_SUPPLIERS) {
        const { rows: [existing] } = await pool.query(
          `SELECT id, sort_order, scope, authorized_store_ids, owner_store_name FROM catalog.suppliers WHERE lower(name) = lower($1) LIMIT 1`,
          [item.name]
        );
        if (!existing) {
          await pool.query(
            `INSERT INTO catalog.suppliers (
              name, alias, alias_pinyin, contact, phone, landline, categories,
              is_default, enabled, province, city, district, detail_address,
              shipping_area_code, sort_order, scope, credit_code,
              device_license_number, device_license_issuer, device_license_valid_from,
              device_license_expires_on, is_supply_chain, authorized_store_ids,
              owner_store_type, owner_store_name
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7::text[],
              $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17,
              $18, $19, $20,
              $21, $22, $23::text[],
              $24, $25
            )`,
            [
              item.name,
              item.alias || '',
              item.alias_pinyin || '',
              item.contact || '',
              item.phone || '',
              item.landline || '',
              item.categories || [],
              Boolean(item.is_default),
              item.enabled !== false,
              item.province || '',
              item.city || '',
              item.district || '',
              item.detail_address || '',
              item.shipping_area_code || '',
              item.sort_order ?? 100,
              item.scope || '',
              item.credit_code || '',
              item.device_license_number || '',
              item.device_license_issuer || '',
              item.device_license_valid_from || null,
              item.device_license_expires_on || null,
              Boolean(item.is_supply_chain),
              item.authorized_store_ids || ALL_STORE_IDS,
              item.owner_store_type || '总店',
              item.owner_store_name || '杭州西湖旗舰店',
            ]
          );
        } else if (!existing.scope || !existing.authorized_store_ids?.length) {
          await pool.query(
            `UPDATE catalog.suppliers
             SET alias = COALESCE(NULLIF(alias, ''), $2),
                 alias_pinyin = COALESCE(NULLIF(alias_pinyin, ''), $3),
                 shipping_area_code = COALESCE(NULLIF(shipping_area_code, ''), $4),
                 sort_order = CASE WHEN sort_order = 100 THEN $5 ELSE sort_order END,
                 scope = COALESCE(NULLIF(scope, ''), $6),
                 is_supply_chain = is_supply_chain OR $7,
                 authorized_store_ids = CASE WHEN cardinality(authorized_store_ids) = 0 THEN $8::text[] ELSE authorized_store_ids END,
                 owner_store_type = COALESCE(NULLIF(owner_store_type, ''), $9),
                 owner_store_name = COALESCE(NULLIF(owner_store_name, ''), $10)
             WHERE id = $1`,
            [
              existing.id,
              item.alias || '',
              item.alias_pinyin || '',
              item.shipping_area_code || '',
              item.sort_order ?? 100,
              item.scope || '',
              Boolean(item.is_supply_chain),
              item.authorized_store_ids || ALL_STORE_IDS,
              item.owner_store_type || '总店',
              item.owner_store_name || '杭州西湖旗舰店',
            ]
          );
        }
      }
    })().catch((err) => {
      supplierSchemaReadyPromise = null;
      throw err;
    });
  }
  return supplierSchemaReadyPromise;
}

const definitions = {
  brands: {
    table: 'catalog.brands',
    fields: {
      name: 'text', alias: 'text', kind: 'text', natures: 'textArray', series: 'textArray',
      remark: 'text', pinned: 'boolean', enabled: 'boolean',
    },
    required: ['name', 'kind'],
    order: 'pinned DESC, name ASC',
  },
  suppliers: {
    table: 'catalog.suppliers',
    fields: {
      name: 'text',
      alias: 'text',
      alias_pinyin: 'text',
      contact: 'text',
      phone: 'text',
      landline: 'text',
      wechat: 'text',
      qq: 'text',
      categories: 'textArray',
      is_default: 'boolean',
      enabled: 'boolean',
      province: 'text',
      city: 'text',
      district: 'text',
      detail_address: 'text',
      shipping_area_code: 'text',
      sort_order: 'integer',
      scope: 'text',
      credit_code: 'text',
      business_license_image: 'image',
      business_license_expires_on: 'date',
      device_license_image: 'image',
      device_license_number: 'text',
      device_license_issued_on: 'date',
      device_license_issuer: 'text',
      device_license_valid_from: 'date',
      device_license_expires_on: 'date',
      bank_holder: 'text',
      bank_branch: 'text',
      bank_account: 'text',
      is_supply_chain: 'boolean',
      bound_franchise_stores: 'textArray',
      authorized_store_ids: 'textArray',
      owner_store_type: 'text',
      owner_store_name: 'text',
      bound_product_ids: 'textArray',
      third_party_binding: 'json',
      remark: 'text',
    },
    required: ['name'],
    order: 'sort_order ASC, is_default DESC, created_at DESC, name ASC',
  },
  warehouses: {
    table: 'catalog.warehouses',
    fields: {
      code: 'text', name: 'text', contact_phone: 'text', warehouse_type: 'text',
      remark: 'text', display_order: 'integer', enabled: 'boolean',
    },
    required: ['code', 'name', 'warehouse_type'],
    order: 'display_order ASC, name ASC',
  },
};

function visibleRow(row, role, resource) {
  if (role !== 'store' || resource !== 'suppliers') return row;
  const { bank_holder, bank_branch, bank_account, ...visible } = row;
  return visible;
}

function validate(body, definition, creating) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid payload');
  const entries = Object.entries(body);
  if (!entries.length || entries.length > 45) throw new Error('Invalid field count');
  for (const [key, value] of entries) {
    const type = definition.fields[key];
    if (!type) throw new Error(`Unsupported field: ${key}`);
    if (type === 'text' && (typeof value !== 'string' || value.length > 2000)) throw new Error(`Invalid field: ${key}`);
    if (type === 'image') {
      if (typeof value !== 'string' || value.length > 3 * 1024 * 1024 || (value !== '' && !DATA_IMAGE_URL_RE.test(value))) {
        throw new Error(`Invalid image field: ${key}`);
      }
    }
    if (type === 'boolean' && typeof value !== 'boolean') throw new Error(`Invalid field: ${key}`);
    if (type === 'integer' && (!Number.isInteger(value) || value < 0 || value > 100000)) throw new Error(`Invalid field: ${key}`);
    if (type === 'date' && value !== null && value !== '' && (typeof value !== 'string' || !dateRe.test(value))) {
      throw new Error(`Invalid field: ${key}`);
    }
    if (
      type === 'textArray' &&
      (!Array.isArray(value) || value.length > 200 || value.some((x) => typeof x !== 'string' || x.length > 160))
    ) {
      throw new Error(`Invalid field: ${key}`);
    }
    if (type === 'json' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      throw new Error(`Invalid field: ${key}`);
    }
  }
  if (creating && definition.required.some((key) => typeof body[key] !== 'string' || !body[key].trim())) {
    throw new Error('Required field missing');
  }
  for (const key of definition.required) {
    if (key in body && !String(body[key] ?? '').trim()) throw new Error(`Required field: ${key}`);
  }
  if ('kind' in body && !['自营品牌', '代理品牌'].includes(body.kind)) throw new Error('Invalid brand kind');
  return entries.map(([key, value]) => {
    if (definition.fields[key] === 'date' && value === '') return [key, null];
    return [key, value];
  });
}

const SUPPLIER_SORT_MAP = {
  name: 'name',
  contact: 'contact',
  phone: 'phone',
  sort_order: 'sort_order',
  device_license_expires_on: 'device_license_expires_on',
  created_at: 'created_at',
};

export async function handleCatalog({ req, res, url, user, pool, send, readJson }) {
  const match = /^\/catalog\/(brands|suppliers|warehouses)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(url.pathname);
  if (!match) return false;
  if (!user) {
    send(res, 401, { error: 'Unauthorized' });
    return true;
  }

  const [, resource, sub1, sub2] = match;
  if (resource === 'suppliers') {
    await ensureSupplierSchema(pool);
  }

  const definition = definitions[resource];
  const { rows: accessRows } = await pool.query(
    'SELECT role, supplier_id FROM identity.user_catalog_access WHERE user_id=$1',
    [user.id]
  );
  let access = accessRows[0];
  if (!access) {
    // Fallback to user_access role identity_type if user_catalog_access row was not created for newly provisioned user
    const { rows: [fallbackRole] } = await pool.query(
      `SELECT r.identity_type FROM identity.user_access a JOIN identity.roles r ON r.id = a.role_id WHERE a.user_id = $1`,
      [user.id]
    );
    if (fallbackRole && fallbackRole.identity_type !== 'supplier') {
      access = { role: fallbackRole.identity_type, supplier_id: null };
    }
  }
  if (!access || (access.role === 'supplier' && (resource !== 'suppliers' || !access.supplier_id))) {
    send(res, 403, { error: 'Forbidden' });
    return true;
  }

  const { rows: roleRows } = await pool.query(
    `SELECT r.permissions, a.permission_denies
     FROM identity.user_access a JOIN identity.roles r ON r.id = a.role_id WHERE a.user_id = $1`,
    [user.id]
  );
  const role = roleRows[0];
  const allowed = (code) => role?.permissions.includes(code) && !role.permission_denies.includes(code);
  const readCode = { brands: 'basic.brand.read', suppliers: 'basic.supplier.read', warehouses: 'system.store.manage' }[resource];
  const canRead = allowed(readCode) || (resource === 'suppliers' && allowed('purchase.create'));
  if (!canRead) {
    send(res, 403, { error: 'Forbidden' });
    return true;
  }
  if (req.method !== 'GET' && !allowed(readCode)) {
    send(res, 403, { error: 'Forbidden' });
    return true;
  }
  if (req.method !== 'GET' && access.role !== 'admin') {
    send(res, 403, { error: 'Forbidden' });
    return true;
  }

  // Special supplier endpoints before :id UUID routing
  if (resource === 'suppliers' && sub1 && !uuid.test(sub1)) {
    try {
      if (sub1 === 'invitations' && !sub2) {
        if (req.method === 'GET') {
          const { rows } = await pool.query(
            `SELECT id, invite_code, status, target_store_name, target_store_contact,
                    to_char(applied_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI') AS applied_at,
                    note, supplier_id
             FROM catalog.supplier_invitations
             ORDER BY catalog.supplier_invitations.applied_at DESC
             LIMIT 50`
          );
          send(res, 200, { items: rows });
          return true;
        }
        if (req.method === 'POST') {
          const body = await readJson(req);
          const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim().slice(0, 64) : '';
          if (!inviteCode) {
            send(res, 400, { error: '请输入邀请码' });
            return true;
          }
          // Check if invite code corresponds to a known partner prefix or create a pending binding request
          const autoApprove = /^QSL-SUP-/i.test(inviteCode);
          let linkedSupplierId = null;
          const storeName = autoApprove ? `合作加盟供货门店 (${inviteCode.toUpperCase()})` : `外部供应链门店 (${inviteCode})`;
          const contactName = autoApprove ? '供应链专员' : '待对方门店确认';
          const status = autoApprove ? '已通过' : '待审核';
          const note = autoApprove
            ? '邀请码核验通过，已自动生成并关联供应商档案'
            : '已提交绑定申请，等待对方门店审核确认';

          if (autoApprove) {
            const { rows: [createdSup] } = await pool.query(
              `INSERT INTO catalog.suppliers (
                name, alias, contact, phone, categories, is_supply_chain,
                authorized_store_ids, owner_store_type, owner_store_name, remark
              ) VALUES ($1, $2, $3, $4, $5::text[], true, $6::text[], '总店', '杭州西湖旗舰店', $7)
              RETURNING id`,
              [
                storeName,
                inviteCode.toUpperCase(),
                contactName,
                '13800008888',
                ['镜片', '镜架'],
                ALL_STORE_IDS,
                `通过邀请码 ${inviteCode} 自动绑定`,
              ]
            );
            linkedSupplierId = createdSup.id;
          }

          const { rows: [inserted] } = await pool.query(
            `INSERT INTO catalog.supplier_invitations (
              invite_code, status, target_store_name, target_store_contact, note, supplier_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, invite_code, status, target_store_name, target_store_contact,
                      to_char(applied_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI') AS applied_at,
                      note, supplier_id`,
            [inviteCode, status, storeName, contactName, note, linkedSupplierId, user.id]
          );
          send(res, 201, { item: inserted, autoApproved: autoApprove });
          return true;
        }
      }

      if (sub1 === 'scan' && req.method === 'POST' && !sub2) {
        const body = await readJson(req);
        const code = typeof body?.code === 'string' ? body.code.trim().slice(0, 120) : '';
        if (!code) {
          send(res, 400, { error: '请输入或扫描 UDI 码 / 营业执照号' });
          return true;
        }
        const { rows: [matched] } = await pool.query(
          `SELECT id, name, alias, contact, phone, credit_code, device_license_number,
                  province, city, district, detail_address, scope
           FROM catalog.suppliers
           WHERE credit_code = $1 OR device_license_number = $1
           LIMIT 1`,
          [code]
        );
        if (matched) {
          send(res, 200, { found: true, data: matched, message: `已匹配现有供应商「${matched.name}」工商与证照信息` });
          return true;
        }
        const isUscc = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/i.test(code);
        const regionPrefix = code.slice(2, 4);
        const regionHints = {
          '33': { province: '浙江省', city: '杭州市', shipping_area_code: '0571' },
          '31': { province: '上海市', city: '上海市', shipping_area_code: '021' },
          '32': { province: '江苏省', city: '南京市', shipping_area_code: '025' },
          '44': { province: '广东省', city: '广州市', shipping_area_code: '020' },
          '11': { province: '北京市', city: '北京市', shipping_area_code: '010' },
        };
        const hint = isUscc ? (regionHints[regionPrefix] || {}) : {};
        send(res, 200, {
          found: false,
          data: isUscc
            ? { credit_code: code.toUpperCase(), ...hint }
            : { device_license_number: code },
          message: isUscc
            ? '已识别 18 位统一社会信用代码并自动回填归属区域'
            : '已识别证照/UDI编码并自动回填医疗器械经营许可证号',
        });
        return true;
      }

      if (sub1 === 'batch-authorize' && req.method === 'POST' && !sub2) {
        const body = await readJson(req);
        const ids = Array.isArray(body?.ids) ? body.ids.filter((x) => typeof x === 'string' && uuid.test(x)) : [];
        const storeIds = Array.isArray(body?.storeIds) ? body.storeIds.filter((x) => typeof x === 'string' && ALL_STORE_IDS.includes(x)) : [];
        if (!ids.length) {
          send(res, 400, { error: '请选择需要授权的供应商' });
          return true;
        }
        const { rowCount } = await pool.query(
          `UPDATE catalog.suppliers SET authorized_store_ids = $2::text[], updated_at = now() WHERE id = ANY($1::uuid[])`,
          [ids, storeIds]
        );
        send(res, 200, { count: rowCount });
        return true;
      }

      if (sub1 === 'merge' && req.method === 'POST' && !sub2) {
        const body = await readJson(req);
        const targetId = typeof body?.targetId === 'string' && uuid.test(body.targetId) ? body.targetId : '';
        const sourceIds = Array.isArray(body?.sourceIds)
          ? body.sourceIds.filter((x) => typeof x === 'string' && uuid.test(x) && x !== targetId)
          : [];
        if (!targetId || !sourceIds.length) {
          send(res, 400, { error: '请选择主保留供应商及至少一家待合并供应商' });
          return true;
        }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { rows: [target] } = await client.query(
            `SELECT id, categories, authorized_store_ids, bound_product_ids FROM catalog.suppliers WHERE id = $1 FOR UPDATE`,
            [targetId]
          );
          if (!target) {
            await client.query('ROLLBACK');
            send(res, 404, { error: '目标保留供应商不存在' });
            return true;
          }
          const { rows: boundAccounts } = await client.query(
            `SELECT supplier_id FROM identity.user_catalog_access WHERE supplier_id = ANY($1::uuid[])`,
            [sourceIds]
          );
          if (boundAccounts.length) {
            await client.query('ROLLBACK');
            send(res, 409, { error: '待合并的供应商中存在已绑定登录账号的记录，请将其作为主保留供应商后再合并' });
            return true;
          }
          const { rows: sources } = await client.query(
            `SELECT id, categories, authorized_store_ids, bound_product_ids FROM catalog.suppliers WHERE id = ANY($1::uuid[])`,
            [sourceIds]
          );
          const mergedCategories = Array.from(new Set([...(target.categories || []), ...sources.flatMap((s) => s.categories || [])]));
          const mergedStores = Array.from(new Set([...(target.authorized_store_ids || []), ...sources.flatMap((s) => s.authorized_store_ids || [])]));
          const mergedProducts = Array.from(new Set([...(target.bound_product_ids || []), ...sources.flatMap((s) => s.bound_product_ids || [])]));

          await client.query(
            `UPDATE catalog.suppliers SET categories = $2::text[], authorized_store_ids = $3::text[], bound_product_ids = $4::text[], updated_at = now() WHERE id = $1`,
            [targetId, mergedCategories, mergedStores, mergedProducts]
          );
          await client.query(`UPDATE purchase.orders SET supplier_id = $1 WHERE supplier_id = ANY($2::uuid[])`, [targetId, sourceIds]);
          await client.query(`UPDATE purchase.manual_inbound_drafts SET supplier_id = $1 WHERE supplier_id = ANY($2::uuid[])`, [targetId, sourceIds]);
          await client.query(`UPDATE catalog.products SET supplier_id = $1 WHERE supplier_id = ANY($2::uuid[])`, [targetId, sourceIds]).catch(() => {});
          await client.query(
            `INSERT INTO catalog.supplier_brands (supplier_id, brand_id)
             SELECT $1, brand_id FROM catalog.supplier_brands WHERE supplier_id = ANY($2::uuid[])
             ON CONFLICT DO NOTHING`,
            [targetId, sourceIds]
          );
          const { rowCount } = await client.query(`DELETE FROM catalog.suppliers WHERE id = ANY($1::uuid[])`, [sourceIds]);
          await client.query('COMMIT');
          send(res, 200, { mergedCount: rowCount, targetId });
          return true;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } catch (error) {
      if (error.message?.startsWith('Invalid')) {
        send(res, 400, { error: error.message });
        return true;
      }
      throw error;
    }
  }

  const id = sub1;
  if (id && !uuid.test(id)) {
    send(res, 400, { error: 'Invalid id' });
    return true;
  }

  try {
    if (req.method === 'GET' && id) {
      const { rows } = await pool.query(
        `SELECT * FROM ${definition.table} WHERE id=$1${access.role === 'supplier' ? ' AND id=$2' : ''}`,
        access.role === 'supplier' ? [id, access.supplier_id] : [id]
      );
      send(res, rows.length ? 200 : 404, rows[0] ? visibleRow(rows[0], access.role, resource) : { error: 'Not found' });
      return true;
    }

    if (req.method === 'GET') {
      const page = Math.min(10000, Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1));
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));
      const search = (url.searchParams.get('search') ?? '').trim().slice(0, 120);
      const values = [search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null];

      let where =
        resource === 'suppliers'
          ? `WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE '\\' OR alias ILIKE $1 ESCAPE '\\' OR alias_pinyin ILIKE $1 ESCAPE '\\' OR contact ILIKE $1 ESCAPE '\\' OR phone ILIKE $1 ESCAPE '\\' OR scope ILIKE $1 ESCAPE '\\' OR detail_address ILIKE $1 ESCAPE '\\')`
          : `WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE '\\')`;

      if (resource === 'suppliers') {
        const enabledParam = url.searchParams.get('enabled');
        if (enabledParam === 'true' || enabledParam === 'false') {
          values.push(enabledParam === 'true');
          where += ` AND enabled = $${values.length}`;
        }
        const defaultParam = url.searchParams.get('isDefault');
        if (defaultParam === 'true' || defaultParam === 'false') {
          values.push(defaultParam === 'true');
          where += ` AND is_default = $${values.length}`;
        }
        const supplyParam = url.searchParams.get('isSupplyChain');
        if (supplyParam === 'true' || supplyParam === 'false') {
          values.push(supplyParam === 'true');
          where += ` AND is_supply_chain = $${values.length}`;
        }
        const provinceParam = (url.searchParams.get('province') ?? '').trim().slice(0, 80);
        if (provinceParam) {
          values.push(provinceParam);
          where += ` AND province = $${values.length}`;
        }
        const storeIdParam = (url.searchParams.get('storeId') ?? '').trim().slice(0, 60);
        if (storeIdParam) {
          values.push(storeIdParam);
          where += ` AND $${values.length} = ANY(authorized_store_ids)`;
        }
      }

      if (access.role === 'supplier') {
        values.push(access.supplier_id);
        where += ` AND id = $${values.length}`;
      }

      let orderClause = definition.order;
      if (resource === 'suppliers') {
        const sf = url.searchParams.get('sortField');
        const so = url.searchParams.get('sortOrder') === 'desc' ? 'DESC' : 'ASC';
        if (sf && SUPPLIER_SORT_MAP[sf]) {
          orderClause = `${SUPPLIER_SORT_MAP[sf]} ${so} NULLS LAST, created_at DESC`;
        }
      }

      const count = await pool.query(`SELECT count(*)::int AS total FROM ${definition.table} ${where}`, values);
      values.push(pageSize, (page - 1) * pageSize);
      const { rows } = await pool.query(
        `SELECT * FROM ${definition.table} ${where} ORDER BY ${orderClause} LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values
      );
      send(res, 200, {
        items: rows.map((row) => visibleRow(row, access.role, resource)),
        total: count.rows[0].total,
        page,
        pageSize,
      });
      return true;
    }

    const maxBodyBytes = resource === 'suppliers' ? 6 * 1024 * 1024 : 65536;

    if (req.method === 'POST' && !id) {
      const entries = validate(await readJson(req, maxBodyBytes), definition, true);
      const columns = entries.map(([key]) => key);
      const values = entries.map(([, value]) => value);
      const placeholders = values.map((_, index) => `$${index + 1}`);
      const { rows } = await pool.query(
        `INSERT INTO ${definition.table} (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        values
      );
      send(res, 201, rows[0]);
      return true;
    }

    if (req.method === 'PATCH' && id) {
      const entries = validate(await readJson(req, maxBodyBytes), definition, false);
      const values = entries.map(([, value]) => value);
      const assignments = entries.map(([key], index) => `${key}=$${index + 1}`);
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE ${definition.table} SET ${assignments.join(',')}, updated_at=now() WHERE id=$${values.length} RETURNING *`,
        values
      );
      send(res, rows.length ? 200 : 404, rows[0] ?? { error: 'Not found' });
      return true;
    }

    if (req.method === 'DELETE' && id) {
      if (resource === 'suppliers') {
        const { rows: bound } = await pool.query(
          `SELECT 1 FROM identity.user_catalog_access WHERE supplier_id = $1 LIMIT 1`,
          [id]
        );
        if (bound.length) {
          send(res, 409, { error: '该供应商已绑定外部登录账号，不能直接删除，请改为停用' });
          return true;
        }
      }
      const { rowCount } = await pool.query(`DELETE FROM ${definition.table} WHERE id=$1`, [id]);
      send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
      return true;
    }

    send(res, 405, { error: 'Method not allowed' });
    return true;
  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('Unsupported') || error.message.startsWith('Required')) {
      send(res, 400, { error: error.message });
      return true;
    }
    if (error.code === '22001' || error.code === '22007' || error.code === '22008' || error.code === '22P02') {
      send(res, 400, { error: 'Invalid field value' });
      return true;
    }
    if (error.code === '23505' || error.code === '23503') {
      send(res, 409, { error: 'Record conflicts with existing data' });
      return true;
    }
    throw error;
  }
}

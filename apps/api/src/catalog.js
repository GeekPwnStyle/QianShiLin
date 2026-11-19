import { storeIds as ALL_STORE_IDS } from './stores.js';
const DATA_IMAGE_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const usernameRe = /^[\p{L}\p{N}·._ -]{1,64}$/u;



const SUPPLIER_USERNAME_BY_NAME = {
  卡尔蔡司光学华东代理: 'supplier',
  依视路镜片供应链中心: 'sup_essilor',
  北欧钛架联合供货商: 'sup_titan',
  精益高登光学器械有限公司: 'sup_jygd',
  重庆千里眼商贸有限公司: 'sup_qly',
  洪旭德生光学镜片有限公司: 'sup_hxds',
  上海图观眼镜有限公司: 'sup_shtg',
  四川上品视嘉眼镜有限公司: 'sup_spsj',
  上海忠诚商贸有限公司: 'sup_zcsm',
  北京宝典商贸有限责任公司: 'sup_bjbd',
  欧普康视角膜塑形镜供应站: 'sup_opks',
  博士伦隐形与护理直供中心: 'sup_bsl',
};

const CHAR_PINYIN_MAP = {
  卡: 'k', 尔: 'e', 蔡: 'c', 司: 's', 光: 'g', 学: 'x', 华: 'h', 东: 'd', 代: 'd', 理: 'l',
  依: 'y', 视: 's', 路: 'l', 镜: 'j', 片: 'p', 供: 'g', 应: 'y', 链: 'l', 中: 'z', 心: 'x',
  北: 'b', 欧: 'o', 钛: 't', 架: 'j', 联: 'l', 合: 'h', 货: 'h', 商: 's', 精: 'j', 益: 'y',
  高: 'g', 登: 'd', 器: 'q', 械: 'x', 有: 'y', 限: 'x', 公: 'g', 重: 'c', 庆: 'q', 千: 'q',
  里: 'l', 眼: 'y', 贸: 'm', 洪: 'h', 旭: 'x', 德: 'd', 生: 's', 上: 's', 海: 'h', 图: 't',
  观: 'g', 四: 's', 川: 'c', 品: 'p', 嘉: 'j', 忠: 'z', 诚: 'c', 京: 'j', 宝: 'b', 典: 'd',
  普: 'p', 康: 'k', 角: 'j', 膜: 'm', 塑: 's', 形: 'x', 站: 'z', 博: 'b', 士: 's', 伦: 'l',
  隐: 'y', 护: 'h', 直: 'z', 豪: 'h', 雅: 'y', 明: 'm', 月: 'y', 暴: 'b', 龙: 'l', 陌: 'm',
  森: 's', 太: 't', 阳: 'y', 昌: 'c', 科: 'k', 技: 'j', 浙: 'z', 江: 'j', 杭: 'h', 州: 'z',
};

function supplierInitialSlug(name) {
  let out = '';
  for (const ch of String(name || '').trim()) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch.toLowerCase();
    } else if (CHAR_PINYIN_MAP[ch]) {
      out += CHAR_PINYIN_MAP[ch];
    }
  }
  return out.slice(0, 14) || 'partner';
}

function buildSupplierDisplayName(supplier) {
  const contact = String(supplier.contact || '').trim();
  const shortName = String(supplier.alias || supplier.name || '').trim();
  if (contact && shortName) return `${contact} · ${shortName}`.slice(0, 110);
  return (contact || shortName || '合作供应商').slice(0, 110);
}

async function resolveUniqueSupplierUsername(client, preferredUsername, supplierName) {
  if (preferredUsername) {
    const clean = preferredUsername.trim().toLowerCase();
    if (!usernameRe.test(clean)) {
      throw new Error('登录账号需使用真实姓名或名称（1～64字）');
    }
    const { rows } = await client.query(
      `SELECT 1 FROM identity.users WHERE lower(username) = lower($1) LIMIT 1`,
      [clean]
    );
    if (rows.length) {
      throw new Error(`登录账号「${clean}」已被占用`);
    }
    return clean;
  }

  const mapped = SUPPLIER_USERNAME_BY_NAME[String(supplierName || '').trim()];
  const base = mapped || `sup_${supplierInitialSlug(supplierName)}`;
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}_${i + 1}`;
    const { rows } = await client.query(
      `SELECT 1 FROM identity.users WHERE lower(username) = lower($1) LIMIT 1`,
      [candidate]
    );
    if (!rows.length) return candidate;
  }
  return `sup_${Date.now().toString(36)}`;
}

async function provisionSupplierUserAccount(client, supplier, options = {}) {
  const username = await resolveUniqueSupplierUsername(client, String(supplier.contact||supplier.name||'').trim(), supplier.name);
  const password = 'Admin@1234';
  if (password.length < 6 || password.length > 64) {
    throw new Error('供应商初始登录密码长度需在 6 至 64 位之间');
  }
  const displayName = buildSupplierDisplayName(supplier);
  const status = supplier.enabled === false ? 'disabled' : 'active';

  const { rows: [createdUser] } = await client.query(
    `INSERT INTO identity.users (username, display_name, status)
     VALUES ($1, $2, $3) RETURNING id, username, display_name, status`,
    [username, displayName, status]
  );

  await client.query(
    `INSERT INTO identity.password_credentials (user_id, password_hash, password_algorithm)
     VALUES ($1, crypt($2, gen_salt('bf', 10)), 'bcrypt')`,
    [createdUser.id, password]
  );

  await client.query(
    `INSERT INTO identity.user_access (user_id, role_id, store_ids, updated_by)
     VALUES ($1, 'role_supplier_partner', '{}'::text[], $2)`,
    [createdUser.id, options.actorUserId ?? null]
  );

  await client.query(
    `INSERT INTO identity.user_catalog_access (user_id, role, supplier_id)
     VALUES ($1, 'supplier', $2)
     ON CONFLICT (user_id) DO UPDATE SET role = 'supplier', supplier_id = EXCLUDED.supplier_id`,
    [createdUser.id, supplier.id]
  );

  await client.query(
    `INSERT INTO identity.user_profiles (user_id, title, avatar_initials, theme_key)
     VALUES ($1, $2, $3, 'lime_charcoal')
     ON CONFLICT (user_id) DO NOTHING`,
    [createdUser.id, `供应商协同账号 · ${supplier.name}`.slice(0, 120), displayName.slice(0, 1)]
  );

  await client.query(`UPDATE catalog.suppliers SET user_id = $1 WHERE id = $2`, [createdUser.id, supplier.id]);
  return createdUser;
}

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
    authorized_store_ids: ['c103cf20-2c1f-5bb1-b89c-90fe147b5473', 'store_hz_02'],
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
    authorized_store_ids: ['c103cf20-2c1f-5bb1-b89c-90fe147b5473', 'store_sh_03'],
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
    authorized_store_ids: ['c103cf20-2c1f-5bb1-b89c-90fe147b5473', 'store_sh_03', 'store_nj_04'],
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
    authorized_store_ids: ['c103cf20-2c1f-5bb1-b89c-90fe147b5473', 'store_hz_02', 'store_sh_03'],
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
    authorized_store_ids: ['c103cf20-2c1f-5bb1-b89c-90fe147b5473', 'store_sh_03'],
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

export async function syncSuppliersToIdentityUsers(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure existing preset 'supplier' user (顾承泽) is linked to a supplier if unlinked
    const { rows: [presetSupplierUser] } = await client.query(
      `SELECT u.id, u.username, uca.supplier_id
       FROM identity.users u
       LEFT JOIN identity.user_catalog_access uca ON uca.user_id = u.id
       WHERE lower(u.username) = 'supplier'
       LIMIT 1`
    );

    if (presetSupplierUser) {
      if (presetSupplierUser.supplier_id) {
        await client.query(
          `UPDATE catalog.suppliers SET user_id = $1 WHERE id = $2 AND user_id IS NULL`,
          [presetSupplierUser.id, presetSupplierUser.supplier_id]
        );
      } else {
        const { rows: [zeissOrDefault] } = await client.query(
          `SELECT id, name FROM catalog.suppliers
           WHERE user_id IS NULL
           ORDER BY CASE WHEN name = '卡尔蔡司光学华东代理' THEN 0 ELSE 1 END,
                    is_default DESC, sort_order ASC, created_at ASC
           LIMIT 1`
        );
        if (zeissOrDefault) {
          await client.query(
            `INSERT INTO identity.user_catalog_access (user_id, role, supplier_id)
             VALUES ($1, 'supplier', $2)
             ON CONFLICT (user_id) DO UPDATE SET role = 'supplier', supplier_id = EXCLUDED.supplier_id`,
            [presetSupplierUser.id, zeissOrDefault.id]
          );
          await client.query(
            `UPDATE catalog.suppliers SET user_id = $1 WHERE id = $2`,
            [presetSupplierUser.id, zeissOrDefault.id]
          );
        }
      }
    }

    // 2. Link any existing user_catalog_access supplier mappings whose catalog.suppliers.user_id is still NULL
    await client.query(
      `UPDATE catalog.suppliers s
       SET user_id = uca.user_id
       FROM identity.user_catalog_access uca
       WHERE uca.supplier_id = s.id AND uca.role = 'supplier' AND s.user_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM catalog.suppliers s2 WHERE s2.user_id = uca.user_id)`
    );

    // 3. Provision unique login accounts for every remaining supplier in catalog.suppliers
    const { rows: unlinkedSuppliers } = await client.query(
      `SELECT id, name, alias, contact, enabled
       FROM catalog.suppliers
       WHERE user_id IS NULL
       ORDER BY sort_order ASC, is_default DESC, created_at ASC`
    );

    for (const sup of unlinkedSuppliers) {
      await provisionSupplierUserAccount(client, sup);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

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
          ADD COLUMN IF NOT EXISTS third_party_binding jsonb NOT NULL DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS suppliers_sort_order_idx
          ON catalog.suppliers (sort_order ASC, is_default DESC, created_at DESC)
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS suppliers_user_id_unique
          ON catalog.suppliers (user_id)
          WHERE user_id IS NOT NULL
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

      for (const item of (process.env.QSL_ENABLE_DEMO_SEED === '1' ? DEFAULT_OPTICAL_SUPPLIERS : [])) {
        const { rows: [existing] } = await pool.query(
          `SELECT id, sort_order, scope, authorized_store_ids FROM catalog.suppliers WHERE lower(name) = lower($1) LIMIT 1`,
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

      await syncSuppliersToIdentityUsers(pool);
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
    order: 's.sort_order ASC, s.is_default DESC, s.created_at DESC, s.name ASC',
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
  name: 's.name',
  contact: 's.contact',
  phone: 's.phone',
  sort_order: 's.sort_order',
  device_license_expires_on: 's.device_license_expires_on',
  created_at: 's.created_at',
};

const SUPPLIER_SELECT_SQL = `
  SELECT s.*,
         u.username AS login_username,
         u.status AS login_status,
         ua.role_id,
         r.name AS role_name
  FROM catalog.suppliers s
  LEFT JOIN identity.users u ON u.id = s.user_id
  LEFT JOIN identity.user_access ua ON ua.user_id = u.id
  LEFT JOIN identity.roles r ON r.id = ua.role_id
`;

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
          const autoApprove = /^QSL-SUP-/i.test(inviteCode);
          const storeName = autoApprove ? `合作加盟供货门店 (${inviteCode.toUpperCase()})` : `外部供应链门店 (${inviteCode})`;
          const contactName = autoApprove ? '供应链专员' : '待对方门店确认';
          const status = autoApprove ? '已通过' : '待审核';
          const note = autoApprove
            ? '邀请码核验通过，已自动生成并关联供应商档案与登录账号'
            : '已提交绑定申请，等待对方门店审核确认';

          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            let linkedSupplierId = null;
            if (autoApprove) {
              const { rows: [createdSup] } = await client.query(
                `INSERT INTO catalog.suppliers (
                  name, alias, contact, phone, categories, is_supply_chain,
                  authorized_store_ids, owner_store_type, owner_store_name, remark
                ) VALUES ($1, $2, $3, $4, $5::text[], true, $6::text[], '总店', '杭州西湖旗舰店', $7)
                RETURNING id, name, alias, contact, enabled`,
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
              await provisionSupplierUserAccount(client, createdSup, { actorUserId: user.id });
            }

            const { rows: [inserted] } = await client.query(
              `INSERT INTO catalog.supplier_invitations (
                invite_code, status, target_store_name, target_store_contact, note, supplier_id, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id, invite_code, status, target_store_name, target_store_contact,
                        to_char(applied_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI') AS applied_at,
                        note, supplier_id`,
              [inviteCode, status, storeName, contactName, note, linkedSupplierId, user.id]
            );
            await client.query('COMMIT');
            send(res, 201, { item: inserted, autoApproved: autoApprove });
            return true;
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }
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
            `SELECT s.id, u.username
             FROM catalog.suppliers s
             JOIN identity.users u ON u.id = s.user_id
             WHERE s.id = ANY($1::uuid[]) AND lower(u.username) = 'supplier'`,
            [sourceIds]
          );
          if (boundAccounts.length) {
            await client.query('ROLLBACK');
            send(res, 409, { error: '待合并供应商中包含系统基准供应商账号（@supplier），请将其设为主保留供应商后再合并' });
            return true;
          }
          const { rows: sources } = await client.query(
            `SELECT id, user_id, categories, authorized_store_ids, bound_product_ids
             FROM catalog.suppliers WHERE id = ANY($1::uuid[])`,
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
          const sourceUserIds = sources.map((s) => s.user_id).filter(Boolean);
          const { rowCount } = await client.query(`DELETE FROM catalog.suppliers WHERE id = ANY($1::uuid[])`, [sourceIds]);
          if (sourceUserIds.length) {
            await client.query(`DELETE FROM identity.user_catalog_access WHERE user_id = ANY($1::uuid[])`, [sourceUserIds]);
            await client.query(`UPDATE identity.users SET status = 'disabled', updated_at = now() WHERE id = ANY($1::uuid[])`, [sourceUserIds]);
          }
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
      const sql =
        resource === 'suppliers'
          ? `${SUPPLIER_SELECT_SQL} WHERE s.id=$1${access.role === 'supplier' ? ' AND s.id=$2' : ''}`
          : `SELECT * FROM ${definition.table} WHERE id=$1`;
      const { rows } = await pool.query(
        sql,
        resource === 'suppliers' && access.role === 'supplier' ? [id, access.supplier_id] : [id]
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
          ? `WHERE ($1::text IS NULL OR s.name ILIKE $1 ESCAPE '\\' OR s.alias ILIKE $1 ESCAPE '\\' OR s.alias_pinyin ILIKE $1 ESCAPE '\\' OR s.contact ILIKE $1 ESCAPE '\\' OR s.phone ILIKE $1 ESCAPE '\\' OR s.scope ILIKE $1 ESCAPE '\\' OR s.detail_address ILIKE $1 ESCAPE '\\' OR u.username ILIKE $1 ESCAPE '\\')`
          : `WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE '\\')`;

      if (resource === 'suppliers') {
        const enabledParam = url.searchParams.get('enabled');
        if (enabledParam === 'true' || enabledParam === 'false') {
          values.push(enabledParam === 'true');
          where += ` AND s.enabled = $${values.length}`;
        }
        const defaultParam = url.searchParams.get('isDefault');
        if (defaultParam === 'true' || defaultParam === 'false') {
          values.push(defaultParam === 'true');
          where += ` AND s.is_default = $${values.length}`;
        }
        const supplyParam = url.searchParams.get('isSupplyChain');
        if (supplyParam === 'true' || supplyParam === 'false') {
          values.push(supplyParam === 'true');
          where += ` AND s.is_supply_chain = $${values.length}`;
        }
        const provinceParam = (url.searchParams.get('province') ?? '').trim().slice(0, 80);
        if (provinceParam) {
          values.push(provinceParam);
          where += ` AND s.province = $${values.length}`;
        }
        const storeIdParam = (url.searchParams.get('storeId') ?? '').trim().slice(0, 60);
        if (storeIdParam) {
          values.push(storeIdParam);
          where += ` AND $${values.length} = ANY(s.authorized_store_ids)`;
        }
      }

      if (access.role === 'supplier') {
        values.push(access.supplier_id);
        where += resource === 'suppliers' ? ` AND s.id = $${values.length}` : ` AND id = $${values.length}`;
      }

      let orderClause = definition.order;
      if (resource === 'suppliers') {
        const sf = url.searchParams.get('sortField');
        const so = url.searchParams.get('sortOrder') === 'desc' ? 'DESC' : 'ASC';
        if (sf && SUPPLIER_SORT_MAP[sf]) {
          orderClause = `${SUPPLIER_SORT_MAP[sf]} ${so} NULLS LAST, s.created_at DESC`;
        }
      }

      const fromForCount =
        resource === 'suppliers'
          ? `FROM catalog.suppliers s LEFT JOIN identity.users u ON u.id = s.user_id`
          : `FROM ${definition.table}`;
      const count = await pool.query(`SELECT count(*)::int AS total ${fromForCount} ${where}`, values);
      values.push(pageSize, (page - 1) * pageSize);

      const selectSql =
        resource === 'suppliers'
          ? `${SUPPLIER_SELECT_SQL} ${where} ORDER BY ${orderClause} LIMIT $${values.length - 1} OFFSET $${values.length}`
          : `SELECT * FROM ${definition.table} ${where} ORDER BY ${orderClause} LIMIT $${values.length - 1} OFFSET $${values.length}`;
      const { rows } = await pool.query(selectSql, values);
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
      const rawBody = await readJson(req, maxBodyBytes);
      const loginUsername = typeof rawBody?.login_username === 'string' ? rawBody.login_username : '';
      const loginPassword = typeof rawBody?.login_password === 'string' ? rawBody.login_password : '';
      const cleanedBody = rawBody && typeof rawBody === 'object' ? { ...rawBody } : rawBody;
      if (cleanedBody && typeof cleanedBody === 'object') {
        delete cleanedBody.login_username;
        delete cleanedBody.login_password;
      }

      const entries = validate(cleanedBody, definition, true);
      const columns = entries.map(([key]) => key);
      const values = entries.map(([, value]) => value);
      const placeholders = values.map((_, index) => `$${index + 1}`);

      if (resource !== 'suppliers') {
        const { rows } = await pool.query(
          `INSERT INTO ${definition.table} (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
          values
        );
        send(res, 201, rows[0]);
        return true;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: [inserted] } = await client.query(
          `INSERT INTO catalog.suppliers (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
          values
        );
        const createdUser = await provisionSupplierUserAccount(client, inserted, {
          preferredUsername: loginUsername,
          password: loginPassword,
          actorUserId: user.id,
        });
        await client.query(
          `INSERT INTO identity.operation_log(actor_user_id, actor_role_id, actor_role_name, category, action, target, details)
           SELECT $1, a.role_id, r.name, '供应商资料', '新增供应商并生成账号', $2, $3::jsonb
           FROM identity.user_access a JOIN identity.roles r ON r.id = a.role_id WHERE a.user_id = $1`,
          [user.id, inserted.id, JSON.stringify({ supplier: inserted.name, username: createdUser.username })]
        );
        await client.query('COMMIT');
        const { rows: [enriched] } = await pool.query(`${SUPPLIER_SELECT_SQL} WHERE s.id = $1`, [inserted.id]);
        send(res, 201, enriched ?? inserted);
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        if (err.message?.includes('登录') || err.message?.includes('密码')) {
          send(res, 400, { error: err.message });
          return true;
        }
        throw err;
      } finally {
        client.release();
      }
    }

    if (req.method === 'PATCH' && id) {
      const rawBody = await readJson(req, maxBodyBytes);
      const loginPassword = typeof rawBody?.login_password === 'string' ? rawBody.login_password.trim() : '';
      const cleanedBody = rawBody && typeof rawBody === 'object' ? { ...rawBody } : rawBody;
      if (cleanedBody && typeof cleanedBody === 'object') {
        delete cleanedBody.login_username;
        delete cleanedBody.login_password;
      }

      const entries = validate(cleanedBody, definition, false);
      const values = entries.map(([, value]) => value);
      const assignments = entries.map(([key], index) => `${key}=$${index + 1}`);
      values.push(id);

      if (resource !== 'suppliers') {
        const { rows } = await pool.query(
          `UPDATE ${definition.table} SET ${assignments.join(',')}, updated_at=now() WHERE id=$${values.length} RETURNING *`,
          values
        );
        send(res, rows.length ? 200 : 404, rows[0] ?? { error: 'Not found' });
        return true;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: [updated] } = await client.query(
          `UPDATE catalog.suppliers SET ${assignments.join(',')}, updated_at=now() WHERE id=$${values.length} RETURNING *`,
          values
        );
        if (!updated) {
          await client.query('ROLLBACK');
          send(res, 404, { error: 'Not found' });
          return true;
        }

        if (updated.user_id) {
          const { rows: [linkedUser] } = await client.query(
            `SELECT id, username FROM identity.users WHERE id = $1`,
            [updated.user_id]
          );
          if (linkedUser) {
            const nextStatus = updated.enabled ? 'active' : 'disabled';
            if (linkedUser.username === 'supplier') {
              await client.query(
                `UPDATE identity.users SET status = $2, updated_at = now() WHERE id = $1`,
                [linkedUser.id, nextStatus]
              );
            } else {
              await client.query(
                `UPDATE identity.users SET display_name = $2, status = $3, updated_at = now() WHERE id = $1`,
                [linkedUser.id, buildSupplierDisplayName(updated), nextStatus]
              );
            }
            await client.query(
              `UPDATE identity.user_profiles SET title = $2 WHERE user_id = $1`,
              [linkedUser.id, `供应商协同账号 · ${updated.name}`.slice(0, 120)]
            );
            if (loginPassword) {
              if (loginPassword.length < 6 || loginPassword.length > 64) {
                await client.query('ROLLBACK');
                send(res, 400, { error: '重置登录密码长度需在 6 至 64 位之间' });
                return true;
              }
              await client.query(
                `UPDATE identity.password_credentials
                 SET password_hash = crypt($2, gen_salt('bf', 10)), password_algorithm = 'bcrypt', password_changed_at = now()
                 WHERE user_id = $1`,
                [linkedUser.id, loginPassword]
              );
            }
          }
        } else {
          await provisionSupplierUserAccount(client, updated, {
            password: loginPassword || undefined,
            actorUserId: user.id,
          });
        }

        await client.query('COMMIT');
        const { rows: [enriched] } = await pool.query(`${SUPPLIER_SELECT_SQL} WHERE s.id = $1`, [updated.id]);
        send(res, 200, enriched ?? updated);
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (req.method === 'DELETE' && id) {
      if (resource === 'suppliers') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { rows: [supRow] } = await client.query(
            `SELECT s.id, s.user_id, u.username
             FROM catalog.suppliers s
             LEFT JOIN identity.users u ON u.id = s.user_id
             WHERE s.id = $1 FOR UPDATE OF s`,
            [id]
          );
          if (!supRow) {
            await client.query('ROLLBACK');
            send(res, 404, { error: 'Not found' });
            return true;
          }
          if (supRow.username === 'supplier') {
            await client.query('ROLLBACK');
            send(res, 409, { error: '系统基准供应商账号（@supplier）受保护，请改为停用' });
            return true;
          }
          const { rowCount } = await client.query(`DELETE FROM catalog.suppliers WHERE id = $1`, [id]);
          if (supRow.user_id) {
            await client.query(`DELETE FROM identity.user_catalog_access WHERE user_id = $1`, [supRow.user_id]);
            await client.query(`DELETE FROM identity.users WHERE id = $1`, [supRow.user_id]);
          }
          await client.query('COMMIT');
          send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
          return true;
        } catch (err) {
          await client.query('ROLLBACK');
          if (err.code === '23503') {
            send(res, 409, { error: '该供应商已关联采购或入库单据，不能直接删除，请改为停用' });
            return true;
          }
          throw err;
        } finally {
          client.release();
        }
      }

      const { rowCount } = await pool.query(`DELETE FROM ${definition.table} WHERE id=$1`, [id]);
      send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
      return true;
    }

    send(res, 405, { error: 'Method not allowed' });
    return true;
  } catch (error) {
    if (
      error.message.startsWith('Invalid') ||
      error.message.startsWith('Unsupported') ||
      error.message.startsWith('Required') ||
      error.message.includes('登录') ||
      error.message.includes('密码')
    ) {
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

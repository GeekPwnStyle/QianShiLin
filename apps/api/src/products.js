import { randomBytes } from 'node:crypto';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
const DATA_IMAGE_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

const clip = (val, max = 240) => (typeof val === 'string' ? val.trim().slice(0, max) : '');

const DEFAULT_CATEGORIES = [
  { name: '太阳镜', sort: 10, readonly: false, children: [] },
  {
    name: '护理液',
    sort: 20,
    readonly: false,
    children: [
      { name: '多功能护理液', sort: 10, readonly: false },
      { name: '双氧水护理液', sort: 20, readonly: false },
    ],
  },
  {
    name: '隐形眼镜',
    sort: 30,
    readonly: false,
    children: [
      { name: '日抛/月抛片', sort: 10, readonly: false },
      { name: '散光定制隐形', sort: 20, readonly: false },
    ],
  },
  {
    name: '镜片',
    sort: 40,
    readonly: false,
    children: [
      { name: '单光/防蓝光片', sort: 10, readonly: false },
      { name: '青少年离焦/渐进片', sort: 20, readonly: false },
    ],
  },
  {
    name: '镜架',
    sort: 50,
    readonly: false,
    children: [
      { name: '纯钛/β钛架', sort: 10, readonly: false },
      { name: '板材/TR架', sort: 20, readonly: false },
    ],
  },
  { name: '辅料', sort: 60, readonly: false, children: [{ name: '鼻托/镜布/礼盒', sort: 10, readonly: false }] },
  { name: '其他', sort: 70, readonly: false, children: [{ name: '洗眼液/眼贴', sort: 10, readonly: false }] },
  { name: '老花镜', sort: 80, readonly: false, children: [] },
  { name: '加工工艺', sort: 90, readonly: false, children: [] },
  { name: '视觉训练', sort: 100, readonly: false, children: [{ name: '视功能训练工具', sort: 10, readonly: false }] },
];

const DEFAULT_TAGS = [
  ['热销爆款', 'amber', 10, '门店主推畅销款'],
  ['青少年防控', 'emerald', 20, '离焦/防控专用系列'],
  ['防蓝光', 'blue', 30, '日常数码防护'],
  ['高折射率', 'violet', 40, '1.67 / 1.74 超薄需求'],
  ['超轻纯钛', 'default', 50, '轻量化佩戴体验'],
  ['渐进多焦点', 'blue', 60, '中老年远近两用'],
  ['新品上市', 'rose', 70, '当季新款上架'],
];

const DEFAULT_DICTIONARIES = [
  ['stock_location', 'A区-精品镜架柜', 10],
  ['stock_location', 'B区-太阳镜专柜', 20],
  ['stock_location', 'C区-镜片阴凉柜', 30],
  ['stock_location', 'D区-隐形与护理专架', 40],
  ['stock_location', '总仓-待检区', 50],
  ['manufacturer', '卡尔蔡司光学（广州）有限公司', 10],
  ['manufacturer', '上海依视路光学有限公司', 20],
  ['manufacturer', '豪雅（上海）光学有限公司', 30],
  ['manufacturer', '博士伦（上海）贸易有限公司', 40],
  ['manufacturer', '宁波明星科技发展有限公司', 50],
  ['unit', '副', 10],
  ['unit', '片', 20],
  ['unit', '盒', 30],
  ['unit', '瓶', 40],
  ['unit', '件', 50],
];

const DEFAULT_SPH_RANGES = ['0.00到-6.25', '-6.25到-8.25', '-8.25到-10.25', '-10.25到-31.00'];
const DEFAULT_CYL_RANGES = ['0.00到-1.25', '-1.25到-2.25', '-2.25到-3.25', '-3.25到-4.25', '-4.25到-6.25', '-6.25到-31.00'];

let schemaReadyPromise = null;

export function ensureProductSchema(pool) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS catalog`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS catalog.product_categories (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          parent_id uuid REFERENCES catalog.product_categories(id) ON DELETE CASCADE,
          name varchar(80) NOT NULL,
          sort_order integer NOT NULL DEFAULT 0,
          is_readonly boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT product_category_name_not_blank CHECK (length(btrim(name)) > 0)
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS product_categories_parent_sort_idx
          ON catalog.product_categories (parent_id, sort_order, created_at)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS catalog.product_tags (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name varchar(60) NOT NULL,
          color varchar(24) NOT NULL DEFAULT 'default',
          sort_order integer NOT NULL DEFAULT 0,
          enabled boolean NOT NULL DEFAULT true,
          remark varchar(200) NOT NULL DEFAULT '',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT product_tag_name_not_blank CHECK (length(btrim(name)) > 0)
        )
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS product_tags_name_unique
          ON catalog.product_tags (lower(name))
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS catalog.product_dictionaries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          dict_type varchar(40) NOT NULL CHECK (dict_type IN ('stock_location', 'manufacturer', 'unit')),
          name varchar(120) NOT NULL,
          sort_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT product_dict_name_not_blank CHECK (length(btrim(name)) > 0)
        )
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS product_dict_type_name_unique
          ON catalog.product_dictionaries (dict_type, lower(name))
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS catalog.products (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          sku_code varchar(64) NOT NULL UNIQUE,
          name varchar(240) NOT NULL,
          brand_id uuid REFERENCES catalog.brands(id) ON DELETE SET NULL,
          brand_name varchar(120) NOT NULL DEFAULT '',
          category_id uuid REFERENCES catalog.product_categories(id) ON DELETE SET NULL,
          category_name varchar(120) NOT NULL DEFAULT '',
          model varchar(120) NOT NULL DEFAULT '',
          color_or_diopter varchar(120) NOT NULL DEFAULT '',
          series varchar(120) NOT NULL DEFAULT '',
          year integer,
          refractive_index varchar(32) NOT NULL DEFAULT '',
          is_custom_lens boolean NOT NULL DEFAULT false,
          axis varchar(40) NOT NULL DEFAULT '',
          coating_type varchar(80) NOT NULL DEFAULT '',
          contact_lens_type varchar(80) NOT NULL DEFAULT '',
          retail_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
          sales_discount numeric(6,2) NOT NULL DEFAULT 100.00 CHECK (sales_discount >= 0 AND sales_discount <= 1000),
          discounted_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (discounted_price >= 0),
          cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
          wholesale_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (wholesale_price >= 0),
          barcode varchar(80) NOT NULL DEFAULT '',
          stock_location varchar(120) NOT NULL DEFAULT '',
          unit varchar(32) NOT NULL DEFAULT '',
          pin_on_sale boolean NOT NULL DEFAULT false,
          tags text[] NOT NULL DEFAULT '{}',
          image_url text,
          supplier_id uuid REFERENCES catalog.suppliers(id) ON DELETE SET NULL,
          supplier_name varchar(180) NOT NULL DEFAULT '',
          min_stock integer,
          max_stock integer,
          manufacturer varchar(180) NOT NULL DEFAULT '',
          production_license_no varchar(120) NOT NULL DEFAULT '',
          filing_cert_no varchar(120) NOT NULL DEFAULT '',
          origin_place varchar(120) NOT NULL DEFAULT '',
          license_expires_on date,
          license_image_url text,
          store_id text NOT NULL DEFAULT 'c103cf20-2c1f-5bb1-b89c-90fe147b5473',
          store_name varchar(120) NOT NULL DEFAULT '杭州西湖旗舰店',
          enabled boolean NOT NULL DEFAULT true,
          created_by uuid REFERENCES identity.users(id),
          updated_by uuid REFERENCES identity.users(id),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT product_name_not_blank CHECK (length(btrim(name)) > 0)
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS products_category_idx ON catalog.products (category_id, created_at DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS products_brand_idx ON catalog.products (brand_name)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS products_supplier_idx ON catalog.products (supplier_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS products_enabled_pin_idx ON catalog.products (enabled, pin_on_sale DESC, created_at DESC)`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS catalog.lens_surcharges (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name varchar(120) NOT NULL DEFAULT '散光附加费',
          surcharge_type varchar(40) NOT NULL DEFAULT '散光附加费',
          category_id uuid REFERENCES catalog.product_categories(id) ON DELETE SET NULL,
          category_name varchar(120) NOT NULL DEFAULT '全部',
          brand_id uuid REFERENCES catalog.brands(id) ON DELETE SET NULL,
          brand_name varchar(120) NOT NULL DEFAULT '全部',
          sph_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
          cyl_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
          matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
          confirm_delete boolean NOT NULL DEFAULT true,
          enabled boolean NOT NULL DEFAULT true,
          remark varchar(300) NOT NULL DEFAULT '',
          created_by uuid REFERENCES identity.users(id),
          updated_by uuid REFERENCES identity.users(id),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      // Seed categories if empty
      const catCountRes = await pool.query(`SELECT count(*)::int AS total FROM catalog.product_categories`);
      if (process.env.QSL_ENABLE_DEMO_SEED === '1' && catCountRes.rows[0]?.total === 0) {
        for (const cat of (process.env.QSL_ENABLE_DEMO_SEED === '1' ? DEFAULT_CATEGORIES : [])) {
          const { rows: [parent] } = await pool.query(
            `INSERT INTO catalog.product_categories (parent_id, name, sort_order, is_readonly)
             VALUES (NULL, $1, $2, $3) RETURNING id`,
            [cat.name, cat.sort, cat.readonly]
          );
          for (const child of cat.children) {
            await pool.query(
              `INSERT INTO catalog.product_categories (parent_id, name, sort_order, is_readonly)
               VALUES ($1, $2, $3, $4)`,
              [parent.id, child.name, child.sort, child.readonly]
            );
          }
        }
      }

      // Seed tags
      for (const [name, color, sortOrder, remark] of (process.env.QSL_ENABLE_DEMO_SEED === '1' ? DEFAULT_TAGS : [])) {
        await pool.query(
          `INSERT INTO catalog.product_tags (name, color, sort_order, remark)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [name, color, sortOrder, remark]
        );
      }

      // Seed dictionaries
      for (const [dictType, name, sortOrder] of (process.env.QSL_ENABLE_DEMO_SEED === '1' ? DEFAULT_DICTIONARIES : [])) {
        await pool.query(
          `INSERT INTO catalog.product_dictionaries (dict_type, name, sort_order)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [dictType, name, sortOrder]
        );
      }

      // Seed initial brands if catalog.brands has none (safely)
      const { rows: brandRows } = await pool.query(`SELECT id, name FROM catalog.brands ORDER BY pinned DESC, name ASC`);
      if (process.env.QSL_ENABLE_DEMO_SEED === '1' && brandRows.length === 0) {
        const seedBrands = [
          ['卡尔蔡司', 'ZEISS', '代理品牌', ['镜片', '视觉训练'], ['小瞳堡', '泽锐', '智锐', '防蓝光'], true],
          ['依视路', 'Essilor', '代理品牌', ['镜片'], ['钻晶A4', '膜岩', '星趣控'], true],
          ['GOOD4', '', '代理品牌', ['镜架', '太阳镜'], ['经典系列'], false],
          ['都彭', 'S.T.Dupont', '代理品牌', ['镜架', '太阳镜'], ['商务系列'], false],
          ['海昌', 'Hydron', '代理品牌', ['隐形眼镜', '护理液'], ['水润清透'], false],
        ];
        for (const [name, alias, kind, natures, series, pinned] of seedBrands) {
          await pool.query(
            `INSERT INTO catalog.brands (name, alias, kind, natures, series, pinned, enabled)
             VALUES ($1, $2, $3, $4, $5, $6, true) ON CONFLICT DO NOTHING`,
            [name, alias, kind, natures, series, pinned]
          );
        }
      }

      // Seed products if empty
      const prodCountRes = await pool.query(`SELECT count(*)::int AS total FROM catalog.products`);
      if (process.env.QSL_ENABLE_DEMO_SEED === '1' && prodCountRes.rows[0]?.total === 0) {
        const { rows: allCats } = await pool.query(`SELECT id, name FROM catalog.product_categories`);
        const catIdByName = new Map(allCats.map((c) => [c.name, c.id]));
        const { rows: allBrands } = await pool.query(`SELECT id, name FROM catalog.brands`);
        const brandIdByName = new Map(allBrands.map((b) => [b.name, b.id]));
        const { rows: allSuppliers } = await pool.query(`SELECT id, name FROM catalog.suppliers ORDER BY is_default DESC, created_at ASC LIMIT 1`);
        const defaultSup = allSuppliers[0] ?? null;

        const seedProducts = [
          {
            sku_code: 'QSL-FRAME-1064',
            name: 'GOOD4镜架',
            brand_name: 'GOOD4',
            category_name: '纯钛/β钛架',
            fallback_category: '镜架',
            model: '1064',
            color_or_diopter: 'BK',
            series: '经典系列',
            year: 2026,
            refractive_index: '',
            is_custom_lens: false,
            axis: '',
            coating_type: '',
            contact_lens_type: '',
            retail_price: 5180.0,
            sales_discount: 100.0,
            discounted_price: 5180.0,
            cost_price: 2150.0,
            wholesale_price: 2880.0,
            barcode: '6901064000011',
            stock_location: 'A区-精品镜架柜',
            unit: '副',
            pin_on_sale: true,
            tags: ['热销爆款', '超轻纯钛'],
            origin_place: '中国深圳',
          },
          {
            sku_code: 'QSL-FRAME-1068',
            name: 'GOOD4镜架 1068 GM',
            brand_name: 'GOOD4',
            category_name: '镜架',
            model: '1068',
            color_or_diopter: 'GM',
            series: '经典系列',
            year: 2026,
            refractive_index: '',
            is_custom_lens: false,
            axis: '',
            coating_type: '',
            contact_lens_type: '',
            retail_price: 5180.0,
            sales_discount: 100.0,
            discounted_price: 5180.0,
            cost_price: 2150.0,
            wholesale_price: 2880.0,
            barcode: '6901068000028',
            stock_location: 'A区-精品镜架柜',
            unit: '副',
            pin_on_sale: false,
            tags: ['超轻纯钛'],
            origin_place: '中国深圳',
          },
          {
            sku_code: 'QSL-LENS-ZEISS-159',
            name: '蔡司镜片小瞳堡钻立方爱动膜 1.59',
            brand_name: '卡尔蔡司',
            category_name: '青少年离焦/渐进片',
            fallback_category: '镜片',
            model: 'ZEISS-MYOCARE-159',
            color_or_diopter: '0.00 ~ -8.00',
            series: '小瞳堡',
            year: 2026,
            refractive_index: '1.59',
            is_custom_lens: true,
            axis: '0-180',
            coating_type: '钻立方爱动膜',
            contact_lens_type: '',
            retail_price: 2240.0,
            sales_discount: 100.0,
            discounted_price: 2240.0,
            cost_price: 890.0,
            wholesale_price: 1240.0,
            barcode: '4049334101592',
            stock_location: 'C区-镜片阴凉柜',
            unit: '片',
            pin_on_sale: true,
            tags: ['青少年防控', '热销爆款'],
            manufacturer: '卡尔蔡司光学（广州）有限公司',
            origin_place: '广东广州',
          },
          {
            sku_code: 'QSL-LENS-ESS-160',
            name: '依视路星趣控膜岩防蓝光镜片 1.60',
            brand_name: '依视路',
            category_name: '单光/防蓝光片',
            fallback_category: '镜片',
            model: 'ESS-STELLEST-160',
            color_or_diopter: '0.00 ~ -10.00',
            series: '星趣控',
            year: 2026,
            refractive_index: '1.60',
            is_custom_lens: true,
            axis: '0-180',
            coating_type: '膜岩防蓝光',
            contact_lens_type: '',
            retail_price: 1980.0,
            sales_discount: 90.0,
            discounted_price: 1782.0,
            cost_price: 760.0,
            wholesale_price: 1080.0,
            barcode: '3661942160015',
            stock_location: 'C区-镜片阴凉柜',
            unit: '片',
            pin_on_sale: true,
            tags: ['青少年防控', '防蓝光'],
            manufacturer: '上海依视路光学有限公司',
            origin_place: '中国上海',
          },
          {
            sku_code: 'QSL-FRAME-DUPONT-1037',
            name: '都彭镜架 1037 枪灰',
            brand_name: '都彭',
            category_name: '镜架',
            model: '1037',
            color_or_diopter: '2',
            series: '商务系列',
            year: 2025,
            refractive_index: '',
            is_custom_lens: false,
            axis: '',
            coating_type: '',
            contact_lens_type: '',
            retail_price: 2800.0,
            sales_discount: 100.0,
            discounted_price: 2800.0,
            cost_price: 1180.0,
            wholesale_price: 1580.0,
            barcode: '3597391037024',
            stock_location: 'A区-精品镜架柜',
            unit: '副',
            pin_on_sale: false,
            tags: ['新品上市'],
            origin_place: '法国设计 / 温州制造',
          },
          {
            sku_code: 'QSL-CON-HYD-30',
            name: '海昌水润清透日抛隐形眼镜30片装',
            brand_name: '海昌',
            category_name: '日抛/月抛片',
            fallback_category: '隐形眼镜',
            model: 'HYD-DAILY-30',
            color_or_diopter: '-3.00',
            series: '水润清透',
            year: 2026,
            refractive_index: '',
            is_custom_lens: false,
            axis: '',
            coating_type: '',
            contact_lens_type: '日抛型',
            retail_price: 168.0,
            sales_discount: 95.0,
            discounted_price: 159.6,
            cost_price: 72.0,
            wholesale_price: 98.0,
            barcode: '6921168003004',
            stock_location: 'D区-隐形与护理专架',
            unit: '盒',
            pin_on_sale: false,
            tags: ['热销爆款'],
            production_license_no: '国械注准20193160081',
            origin_place: '江苏丹阳',
          },
        ];

        for (const p of seedProducts) {
          const catId = catIdByName.get(p.category_name) ?? catIdByName.get(p.fallback_category) ?? null;
          const brandId = brandIdByName.get(p.brand_name) ?? null;
          await pool.query(
            `INSERT INTO catalog.products (
               sku_code, name, brand_id, brand_name, category_id, category_name,
               model, color_or_diopter, series, year, refractive_index, is_custom_lens,
               axis, coating_type, contact_lens_type, retail_price, sales_discount,
               discounted_price, cost_price, wholesale_price, barcode, stock_location,
               unit, pin_on_sale, tags, supplier_id, supplier_name, manufacturer,
               production_license_no, origin_place, enabled
             ) VALUES (
               $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,true
             ) ON CONFLICT (sku_code) DO NOTHING`,
            [
              p.sku_code,
              p.name,
              brandId,
              p.brand_name,
              catId,
              p.category_name,
              p.model,
              p.color_or_diopter,
              p.series,
              p.year,
              p.refractive_index,
              p.is_custom_lens,
              p.axis,
              p.coating_type,
              p.contact_lens_type,
              p.retail_price,
              p.sales_discount,
              p.discounted_price,
              p.cost_price,
              p.wholesale_price,
              p.barcode,
              p.stock_location,
              p.unit,
              p.pin_on_sale,
              p.tags,
              defaultSup?.id ?? null,
              defaultSup?.name ?? '',
              p.manufacturer ?? '',
              p.production_license_no ?? '',
              p.origin_place ?? '',
            ]
          );
        }
      }

      // Seed default lens surcharge rule if empty
      const surCountRes = await pool.query(`SELECT count(*)::int AS total FROM catalog.lens_surcharges`);
      if (process.env.QSL_ENABLE_DEMO_SEED === '1' && surCountRes.rows[0]?.total === 0) {
        await pool.query(
          `INSERT INTO catalog.lens_surcharges (
             name, surcharge_type, category_name, brand_name,
             sph_ranges, cyl_ranges, matrix, confirm_delete, enabled, remark
           ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, true, true, $8)`,
          [
            '通用散光附加费标准',
            '散光附加费',
            '全部',
            '全部',
            JSON.stringify(DEFAULT_SPH_RANGES),
            JSON.stringify(DEFAULT_CYL_RANGES),
            JSON.stringify([
              [0, 0, 120, 200, 300, 480],
              [0, 80, 160, 260, 380, 560],
              [100, 160, 240, 340, 460, 680],
              [220, 280, 360, 480, 620, 880],
            ]),
            '度数范围按前闭后开 [起始, 结束) 匹配，如柱镜 -2.25 落在 -2.25到-3.25 区间。',
          ]
        );
      }
    })().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

async function getProductActor(pool, user) {
  const { rows } = await pool.query(
    `SELECT a.role_id, a.store_ids, a.permission_denies, r.identity_type, r.permissions, r.sensitive_fields,
            uca.supplier_id
     FROM identity.user_access a
     JOIN identity.roles r ON r.id = a.role_id
     LEFT JOIN identity.user_catalog_access uca ON uca.user_id = a.user_id
     WHERE a.user_id = $1`,
    [user.id]
  );
  const actor = rows[0];
  if (!actor) return null;
  const hasPerm = (code) =>
    actor.permissions.includes(code) && !actor.permission_denies.includes(code);
  return {
    ...actor,
    hasPerm,
    canRead: hasPerm('basic.product.read'),
    canCreate: hasPerm('basic.product.create') || actor.identity_type === 'admin',
    canUpdate: hasPerm('basic.product.update') || actor.identity_type === 'admin',
    canDelete: hasPerm('basic.product.delete') || actor.identity_type === 'admin',
    canImport: hasPerm('basic.product.import') || actor.identity_type === 'admin',
    canExport: hasPerm('basic.product.export') && Boolean(actor.sensitive_fields?.batchExport),
    canSeeCost: hasPerm('basic.product.cost.read') && Boolean(actor.sensitive_fields?.viewCostPrice),
    canSeeWholesale: Boolean(actor.sensitive_fields?.viewWholesalePrice),
  };
}

function shapeProduct(row, actor) {
  return {
    id: row.id,
    skuCode: row.sku_code,
    name: row.name,
    brandId: row.brand_id ?? '',
    brandName: row.brand_name ?? '',
    categoryId: row.category_id ?? '',
    categoryName: row.category_name ?? '',
    model: row.model ?? '',
    colorOrDiopter: row.color_or_diopter ?? '',
    series: row.series ?? '',
    year: row.year === null || row.year === undefined ? null : Number(row.year),
    refractiveIndex: row.refractive_index ?? '',
    isCustomLens: Boolean(row.is_custom_lens),
    axis: row.axis ?? '',
    coatingType: row.coating_type ?? '',
    contactLensType: row.contact_lens_type ?? '',
    retailPrice: Number(row.retail_price ?? 0).toFixed(2),
    salesDiscount: Number(row.sales_discount ?? 100).toFixed(2),
    discountedPrice: Number(row.discounted_price ?? 0).toFixed(2),
    ...(actor.canSeeCost ? { costPrice: Number(row.cost_price ?? 0).toFixed(2) } : {}),
    ...(actor.canSeeWholesale ? { wholesalePrice: Number(row.wholesale_price ?? 0).toFixed(2) } : {}),
    barcode: row.barcode ?? '',
    stockLocation: row.stock_location ?? '',
    unit: row.unit ?? '',
    pinOnSale: Boolean(row.pin_on_sale),
    tags: Array.isArray(row.tags) ? row.tags : [],
    imageUrl: row.image_url ?? undefined,
    supplierId: row.supplier_id ?? '',
    supplierName: row.supplier_name ?? '',
    minStock: row.min_stock === null || row.min_stock === undefined ? null : Number(row.min_stock),
    maxStock: row.max_stock === null || row.max_stock === undefined ? null : Number(row.max_stock),
    manufacturer: row.manufacturer ?? '',
    productionLicenseNo: row.production_license_no ?? '',
    filingCertNo: row.filing_cert_no ?? '',
    originPlace: row.origin_place ?? '',
    licenseExpiresOn: row.license_expires_on
      ? (row.license_expires_on instanceof Date
        ? row.license_expires_on.toISOString().slice(0, 10)
        : String(row.license_expires_on).slice(0, 10))
      : '',
    licenseImageUrl: row.license_image_url ?? undefined,
    storeId: row.store_id ?? 'c103cf20-2c1f-5bb1-b89c-90fe147b5473',
    storeName: row.store_name ?? '杭州西湖旗舰店',
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseMoney(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0 || num > 100000000) {
    throw new Error('价格金额数值无效');
  }
  return Math.round(num * 100) / 100;
}

function parseOptionalInt(val, min, max, label) {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`${label}须为 ${min} 至 ${max} 的整数`);
  }
  return num;
}

function validateImageUrl(val, label) {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  if (typeof val !== 'string' || val.length > 160000 || !DATA_IMAGE_URL_RE.test(val)) {
    throw new Error(`${label}图片格式无效或体积过大`);
  }
  return val;
}

function validateProductPayload(body, creating, actor, existing = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('请求格式无效');
  }

  const name = 'name' in body ? clip(body.name, 240) : existing?.name ?? '';
  if (!name) throw new Error('请输入商品名称');

  const brandName = 'brandName' in body ? clip(body.brandName, 120) : existing?.brand_name ?? '';
  if (!brandName) throw new Error('请选择或填写品牌');

  const categoryName = 'categoryName' in body ? clip(body.categoryName, 120) : existing?.category_name ?? '';
  const categoryId = 'categoryId' in body
    ? (uuidRe.test(body.categoryId || '') ? body.categoryId : null)
    : existing?.category_id ?? null;
  if (!categoryId && !categoryName) throw new Error('请选择商品品类');

  const model = 'model' in body ? clip(body.model, 120) : existing?.model ?? '';
  if (!model) throw new Error('请输入商品型号');

  let skuCode = existing?.sku_code ?? '';
  if ('skuCode' in body && clip(body.skuCode, 64)) {
    skuCode = clip(body.skuCode, 64);
  } else if (creating) {
    skuCode = `QSL-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  const brandId = 'brandId' in body
    ? (uuidRe.test(body.brandId || '') ? body.brandId : null)
    : existing?.brand_id ?? null;

  const supplierId = 'supplierId' in body
    ? (uuidRe.test(body.supplierId || '') ? body.supplierId : null)
    : existing?.supplier_id ?? null;
  const supplierName = 'supplierName' in body ? clip(body.supplierName, 180) : existing?.supplier_name ?? '';

  const retailPrice = 'retailPrice' in body ? parseMoney(body.retailPrice, 0) : Number(existing?.retail_price ?? 0);
  const salesDiscount = 'salesDiscount' in body
    ? Math.min(1000, Math.max(0, parseMoney(body.salesDiscount, 100)))
    : Number(existing?.sales_discount ?? 100);
  const discountedPrice = 'discountedPrice' in body
    ? parseMoney(body.discountedPrice, Math.round(retailPrice * (salesDiscount / 100) * 100) / 100)
    : Math.round(retailPrice * (salesDiscount / 100) * 100) / 100;

  const costPrice = actor.canSeeCost && 'costPrice' in body
    ? parseMoney(body.costPrice, 0)
    : Number(existing?.cost_price ?? 0);
  const wholesalePrice = actor.canSeeWholesale && 'wholesalePrice' in body
    ? parseMoney(body.wholesalePrice, 0)
    : Number(existing?.wholesale_price ?? 0);

  const year = 'year' in body ? parseOptionalInt(body.year, 1990, 2099, '年份') : existing?.year ?? null;
  const minStock = 'minStock' in body ? parseOptionalInt(body.minStock, 0, 999999, '最低库存') : existing?.min_stock ?? null;
  const maxStock = 'maxStock' in body ? parseOptionalInt(body.maxStock, 0, 999999, '最高库存') : existing?.max_stock ?? null;

  let licenseExpiresOn = existing?.license_expires_on ?? null;
  if ('licenseExpiresOn' in body) {
    if (!body.licenseExpiresOn) licenseExpiresOn = null;
    else if (typeof body.licenseExpiresOn === 'string' && isoDateRe.test(body.licenseExpiresOn.trim())) {
      licenseExpiresOn = body.licenseExpiresOn.trim();
    } else {
      throw new Error('生产许可证过期时间格式无效');
    }
  }

  let tags = existing?.tags ?? [];
  if ('tags' in body) {
    if (!Array.isArray(body.tags) || body.tags.length > 30) throw new Error('标签格式无效');
    tags = [...new Set(body.tags.map((t) => clip(t, 60)).filter(Boolean))];
  }

  const originPlace = 'originPlace' in body ? clip(body.originPlace, 100) : existing?.origin_place ?? '';
  const imageUrl = 'imageUrl' in body ? validateImageUrl(body.imageUrl, '商品主图') : existing?.image_url ?? null;
  const licenseImageUrl = 'licenseImageUrl' in body
    ? validateImageUrl(body.licenseImageUrl, '生产许可证')
    : existing?.license_image_url ?? null;

  return {
    skuCode,
    name,
    brandId,
    brandName,
    categoryId,
    categoryName,
    model,
    colorOrDiopter: 'colorOrDiopter' in body ? clip(body.colorOrDiopter, 120) : existing?.color_or_diopter ?? '',
    series: 'series' in body ? clip(body.series, 120) : existing?.series ?? '',
    year,
    refractiveIndex: 'refractiveIndex' in body ? clip(body.refractiveIndex, 32) : existing?.refractive_index ?? '',
    isCustomLens: 'isCustomLens' in body ? Boolean(body.isCustomLens) : Boolean(existing?.is_custom_lens),
    axis: 'axis' in body ? clip(body.axis, 40) : existing?.axis ?? '',
    coatingType: 'coatingType' in body ? clip(body.coatingType, 80) : existing?.coating_type ?? '',
    contactLensType: 'contactLensType' in body ? clip(body.contactLensType, 80) : existing?.contact_lens_type ?? '',
    retailPrice,
    salesDiscount,
    discountedPrice,
    costPrice,
    wholesalePrice,
    barcode: 'barcode' in body ? clip(body.barcode, 80) : existing?.barcode ?? '',
    stockLocation: 'stockLocation' in body ? clip(body.stockLocation, 120) : existing?.stock_location ?? '',
    unit: 'unit' in body ? clip(body.unit, 32) : existing?.unit ?? '',
    pinOnSale: 'pinOnSale' in body ? Boolean(body.pinOnSale) : Boolean(existing?.pin_on_sale),
    tags,
    imageUrl,
    supplierId,
    supplierName,
    minStock,
    maxStock,
    manufacturer: 'manufacturer' in body ? clip(body.manufacturer, 180) : existing?.manufacturer ?? '',
    productionLicenseNo: 'productionLicenseNo' in body ? clip(body.productionLicenseNo, 120) : existing?.production_license_no ?? '',
    filingCertNo: 'filingCertNo' in body ? clip(body.filingCertNo, 120) : existing?.filing_cert_no ?? '',
    originPlace,
    licenseExpiresOn,
    licenseImageUrl,
    storeId: 'storeId' in body ? clip(body.storeId, 80) || 'c103cf20-2c1f-5bb1-b89c-90fe147b5473' : existing?.store_id ?? 'c103cf20-2c1f-5bb1-b89c-90fe147b5473',
    storeName: 'storeName' in body ? clip(body.storeName, 120) || '杭州西湖旗舰店' : existing?.store_name ?? '杭州西湖旗舰店',
    enabled: 'enabled' in body ? Boolean(body.enabled) : (existing ? Boolean(existing.enabled) : true),
  };
}

async function writeProductLog(client, userId, action, target, details, ipAddress) {
  await client.query(
    `INSERT INTO identity.operation_log(actor_user_id, actor_role_id, actor_role_name, category, action, target, details, ip_address)
     SELECT $1, a.role_id, r.name, '商品档案', $2, $3, $4::jsonb, $5
     FROM identity.user_access a
     JOIN identity.roles r ON r.id = a.role_id
     WHERE a.user_id = $1`,
    [userId, action, target, JSON.stringify(details), ipAddress]
  );
}

function collectDescendantCategoryIds(categories, rootId) {
  const byParent = new Map();
  for (const c of categories) {
    const key = c.parent_id ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c.id);
  }
  const result = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift();
    for (const childId of byParent.get(cur) ?? []) {
      result.push(childId);
      queue.push(childId);
    }
  }
  return result;
}

export async function handleProducts({ req, res, url, user, pool, send, readJson, clientIp }) {
  const path = url.pathname;
  const handled =
    path === '/products' ||
    path.startsWith('/products/') ||
    path === '/product-categories' ||
    path.startsWith('/product-categories/') ||
    path === '/product-tags' ||
    path.startsWith('/product-tags/') ||
    path === '/product-dictionaries' ||
    path.startsWith('/product-dictionaries/') ||
    path === '/lens-surcharges' ||
    path.startsWith('/lens-surcharges/');

  if (!handled) return false;
  if (!user) {
    send(res, 401, { error: 'Unauthorized' });
    return true;
  }

  await ensureProductSchema(pool);
  const actor = await getProductActor(pool, user);
  if (!actor || !actor.canRead) {
    send(res, 403, { error: '无商品档案查看权限' });
    return true;
  }

  if (path === '/products/quick-brand' && req.method === 'POST') {
    if (!actor.canCreate && !actor.canUpdate) {
      send(res, 403, { error: '无新增品牌权限' });
      return true;
    }
    const body = await readJson(req);
    const name = clip(body?.name, 120);
    const kind = body?.kind === '自营品牌' ? '自营品牌' : '代理品牌';
    const series = Array.isArray(body?.series) ? body.series.map((s) => clip(s, 60)).filter(Boolean) : [];
    if (!name) {
      send(res, 400, { error: '请输入品牌名称' });
      return true;
    }
    try {
      const { rows: [created] } = await pool.query(
        `INSERT INTO catalog.brands (name, kind, series, enabled)
         VALUES ($1, $2, $3, true) RETURNING id, name, series, enabled`,
        [name, kind, series]
      );
      send(res, 201, { item: created });
    } catch (error) {
      if (error.code === '23505') {
        const { rows: [existing] } = await pool.query(`SELECT id, name, series, enabled FROM catalog.brands WHERE lower(name)=lower($1) LIMIT 1`, [name]);
        send(res, 200, { item: existing });
        return true;
      }
      throw error;
    }
    return true;
  }

  // ==================== 1. META ====================
  if (path === '/products/meta' && req.method === 'GET') {
    const [cats, brands, suppliers, tags, dicts] = await Promise.all([
      pool.query(`SELECT id, parent_id, name, sort_order, is_readonly, created_at FROM catalog.product_categories ORDER BY sort_order ASC, created_at ASC`),
      pool.query(`SELECT id, name, series, enabled FROM catalog.brands WHERE enabled = true ORDER BY pinned DESC, name ASC`),
      actor.identity_type === 'supplier'
        ? pool.query(`SELECT id, name, contact, phone FROM catalog.suppliers WHERE id = $1`, [actor.supplier_id])
        : pool.query(`SELECT id, name, contact, phone FROM catalog.suppliers WHERE enabled = true ORDER BY is_default DESC, name ASC`),
      pool.query(`SELECT id, name, color, sort_order, enabled, remark FROM catalog.product_tags ORDER BY sort_order ASC, created_at ASC`),
      pool.query(`SELECT id, dict_type, name, sort_order FROM catalog.product_dictionaries ORDER BY sort_order ASC, created_at ASC`),
    ]);

    send(res, 200, {
      categories: cats.rows,
      brands: brands.rows,
      suppliers: suppliers.rows,
      tags: tags.rows,
      dictionaries: dicts.rows,
    });
    return true;
  }

  // ==================== 2. PRODUCT CATEGORIES ====================
  if (path === '/product-categories' && req.method === 'GET') {
    const [{ rows: cats }, { rows: countRows }] = await Promise.all([
      pool.query(`SELECT id, parent_id, name, sort_order, is_readonly, created_at, updated_at FROM catalog.product_categories ORDER BY sort_order ASC, created_at ASC`),
      pool.query(`SELECT category_id, count(*)::int AS cnt FROM catalog.products WHERE ($1::uuid IS NULL OR supplier_id = $1) GROUP BY category_id`, [
        actor.identity_type === 'supplier' ? actor.supplier_id : null,
      ]),
    ]);
    const directCounts = new Map(countRows.map((r) => [r.category_id, r.cnt]));
    const items = cats.map((c) => {
      const subtreeIds = collectDescendantCategoryIds(cats, c.id);
      const count = subtreeIds.reduce((sum, id) => sum + (directCounts.get(id) ?? 0), 0);
      return {
        id: c.id,
        parentId: c.parent_id,
        name: c.name,
        sortOrder: c.sort_order,
        isReadonly: Boolean(c.is_readonly),
        productCount: count,
        createdAt: c.created_at,
      };
    });
    const totalRes = await pool.query(
      `SELECT count(*)::int AS total FROM catalog.products WHERE ($1::uuid IS NULL OR supplier_id = $1)`,
      [actor.identity_type === 'supplier' ? actor.supplier_id : null]
    );
    send(res, 200, { items, totalProducts: totalRes.rows[0]?.total ?? 0 });
    return true;
  }

  if (path === '/product-categories' && req.method === 'POST') {
    if (!actor.canCreate && !actor.canUpdate) {
      send(res, 403, { error: '无商品品类维护权限' });
      return true;
    }
    const body = await readJson(req);
    const name = clip(body?.name, 80);
    if (!name) {
      send(res, 400, { error: '请输入品类名称' });
      return true;
    }
    const parentId = body?.parentId && uuidRe.test(body.parentId) ? body.parentId : null;
    const isReadonly = Boolean(body?.isReadonly);
    const sortOrder = Number.isInteger(body?.sortOrder) ? body.sortOrder : 100;

    const { rows } = await pool.query(
      `INSERT INTO catalog.product_categories (parent_id, name, sort_order, is_readonly)
       VALUES ($1, $2, $3, $4) RETURNING id, parent_id, name, sort_order, is_readonly, created_at`,
      [parentId, name, sortOrder, isReadonly]
    );
    const created = rows[0];
    send(res, 201, {
      item: {
        id: created.id,
        parentId: created.parent_id,
        name: created.name,
        sortOrder: created.sort_order,
        isReadonly: Boolean(created.is_readonly),
        productCount: 0,
      },
    });
    return true;
  }

  if (path === '/product-categories/batch-delete' && req.method === 'POST') {
    if (!actor.canDelete) {
      send(res, 403, { error: '无商品品类删除权限' });
      return true;
    }
    const body = await readJson(req);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string' && uuidRe.test(id)) : [];
    if (!ids.length) {
      send(res, 400, { error: '请选择要删除的品类' });
      return true;
    }
    const { rows: targetCats } = await pool.query(
      `SELECT id, name, is_readonly FROM catalog.product_categories WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    const readonlyCat = targetCats.find((c) => c.is_readonly);
    if (readonlyCat) {
      send(res, 400, { error: `品类「${readonlyCat.name}」处于只读锁定状态，请先切换为可编辑后再删除` });
      return true;
    }
    const { rows: usedRows } = await pool.query(
      `SELECT count(*)::int AS cnt FROM catalog.products WHERE category_id = ANY($1::uuid[])`,
      [ids]
    );
    if (usedRows[0]?.cnt > 0) {
      send(res, 400, { error: `所选品类下已有 ${usedRows[0].cnt} 个商品，请先调整商品品类后再删除` });
      return true;
    }
    const { rowCount } = await pool.query(`DELETE FROM catalog.product_categories WHERE id = ANY($1::uuid[])`, [ids]);
    send(res, 200, { deletedCount: rowCount });
    return true;
  }

  const catMatch = /^\/product-categories\/([^/]+)$/.exec(path);
  if (catMatch) {
    const id = catMatch[1];
    if (!uuidRe.test(id)) {
      send(res, 400, { error: 'Invalid category id' });
      return true;
    }
    if (req.method === 'PATCH') {
      if (!actor.canUpdate) {
        send(res, 403, { error: '无商品品类编辑权限' });
        return true;
      }
      const body = await readJson(req);
      const { rows: existingRows } = await pool.query(`SELECT * FROM catalog.product_categories WHERE id = $1`, [id]);
      if (!existingRows.length) {
        send(res, 404, { error: '未找到该品类' });
        return true;
      }
      const existing = existingRows[0];
      if (existing.is_readonly && 'name' in body && clip(body.name, 80) !== existing.name && body.isReadonly !== false) {
        send(res, 400, { error: '只读品类禁止修改名称，请先设为可编辑' });
        return true;
      }
      const nextName = 'name' in body ? clip(body.name, 80) : existing.name;
      if (!nextName) {
        send(res, 400, { error: '品类名称不能为空' });
        return true;
      }
      const nextReadonly = 'isReadonly' in body ? Boolean(body.isReadonly) : existing.is_readonly;
      const nextSort = 'sortOrder' in body && Number.isInteger(body.sortOrder) ? body.sortOrder : existing.sort_order;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: [updated] } = await client.query(
          `UPDATE catalog.product_categories
           SET name = $2, is_readonly = $3, sort_order = $4, updated_at = now()
           WHERE id = $1 RETURNING id, parent_id, name, sort_order, is_readonly`,
          [id, nextName, nextReadonly, nextSort]
        );
        if (nextName !== existing.name) {
          await client.query(`UPDATE catalog.products SET category_name = $2 WHERE category_id = $1`, [id, nextName]);
        }
        await client.query('COMMIT');
        send(res, 200, {
          item: {
            id: updated.id,
            parentId: updated.parent_id,
            name: updated.name,
            sortOrder: updated.sort_order,
            isReadonly: Boolean(updated.is_readonly),
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      return true;
    }
    if (req.method === 'DELETE') {
      if (!actor.canDelete) {
        send(res, 403, { error: '无商品品类删除权限' });
        return true;
      }
      const { rows: existingRows } = await pool.query(`SELECT id, name, is_readonly FROM catalog.product_categories WHERE id = $1`, [id]);
      if (!existingRows.length) {
        send(res, 404, { error: '未找到该品类' });
        return true;
      }
      if (existingRows[0].is_readonly) {
        send(res, 400, { error: '只读品类禁止删除，请先切换为可编辑' });
        return true;
      }
      const { rows: usedRows } = await pool.query(`SELECT count(*)::int AS cnt FROM catalog.products WHERE category_id = $1`, [id]);
      if (usedRows[0]?.cnt > 0) {
        send(res, 400, { error: `该品类下仍有 ${usedRows[0].cnt} 个商品，无法删除` });
        return true;
      }
      await pool.query(`DELETE FROM catalog.product_categories WHERE id = $1`, [id]);
      send(res, 200, { ok: true });
      return true;
    }
  }

  // ==================== 3. PRODUCT TAGS ====================
  if (path === '/product-tags' && req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT id, name, color, sort_order, enabled, remark, created_at
       FROM catalog.product_tags ORDER BY sort_order ASC, created_at ASC`
    );
    send(res, 200, {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        sortOrder: r.sort_order,
        enabled: Boolean(r.enabled),
        remark: r.remark ?? '',
        createdAt: r.created_at,
      })),
    });
    return true;
  }

  if (path === '/product-tags' && req.method === 'POST') {
    if (!actor.canCreate && !actor.canUpdate) {
      send(res, 403, { error: '无选品标签维护权限' });
      return true;
    }
    const body = await readJson(req);
    const name = clip(body?.name, 60);
    if (!name) {
      send(res, 400, { error: '请输入标签名称' });
      return true;
    }
    const color = clip(body?.color, 24) || 'default';
    const remark = clip(body?.remark, 200);
    const enabled = body?.enabled === undefined ? true : Boolean(body.enabled);
    const sortOrder = Number.isInteger(body?.sortOrder) ? body.sortOrder : null;
    try {
      const { rows: [created] } = await pool.query(
        `INSERT INTO catalog.product_tags (name, color, sort_order, enabled, remark)
         VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(max(sort_order), 0) + 10 FROM catalog.product_tags)), $4, $5)
         RETURNING id, name, color, sort_order, enabled, remark, created_at`,
        [name, color, sortOrder, enabled, remark]
      );
      send(res, 201, {
        item: {
          id: created.id,
          name: created.name,
          color: created.color,
          sortOrder: created.sort_order,
          enabled: Boolean(created.enabled),
          remark: created.remark ?? '',
          createdAt: created.created_at,
        },
      });
    } catch (error) {
      if (error.code === '23505') {
        send(res, 409, { error: '该选品标签已存在' });
        return true;
      }
      throw error;
    }
    return true;
  }

  const tagMatch = /^\/product-tags\/([^/]+)$/.exec(path);
  if (tagMatch) {
    const id = tagMatch[1];
    if (!uuidRe.test(id)) {
      send(res, 400, { error: 'Invalid tag id' });
      return true;
    }
    if (req.method === 'PATCH') {
      if (!actor.canUpdate) {
        send(res, 403, { error: '无选品标签编辑权限' });
        return true;
      }
      const body = await readJson(req);
      const { rows: existingRows } = await pool.query(`SELECT * FROM catalog.product_tags WHERE id = $1`, [id]);
      if (!existingRows.length) {
        send(res, 404, { error: '标签不存在' });
        return true;
      }
      const existing = existingRows[0];
      const nextName = 'name' in body ? clip(body.name, 60) : existing.name;
      if (!nextName) {
        send(res, 400, { error: '标签名称不能为空' });
        return true;
      }
      const nextColor = 'color' in body ? clip(body.color, 24) || 'default' : existing.color;
      const nextSort = 'sortOrder' in body && Number.isInteger(body.sortOrder) ? body.sortOrder : existing.sort_order;
      const nextEnabled = 'enabled' in body ? Boolean(body.enabled) : existing.enabled;
      const nextRemark = 'remark' in body ? clip(body.remark, 200) : existing.remark;
      try {
        const { rows: [updated] } = await pool.query(
          `UPDATE catalog.product_tags
           SET name = $2, color = $3, sort_order = $4, enabled = $5, remark = $6, updated_at = now()
           WHERE id = $1 RETURNING id, name, color, sort_order, enabled, remark, created_at`,
          [id, nextName, nextColor, nextSort, nextEnabled, nextRemark]
        );
        send(res, 200, {
          item: {
            id: updated.id,
            name: updated.name,
            color: updated.color,
            sortOrder: updated.sort_order,
            enabled: Boolean(updated.enabled),
            remark: updated.remark ?? '',
            createdAt: updated.created_at,
          },
        });
      } catch (error) {
        if (error.code === '23505') {
          send(res, 409, { error: '该选品标签名称已存在' });
          return true;
        }
        throw error;
      }
      return true;
    }
    if (req.method === 'DELETE') {
      if (!actor.canDelete) {
        send(res, 403, { error: '无选品标签删除权限' });
        return true;
      }
      const { rowCount } = await pool.query(`DELETE FROM catalog.product_tags WHERE id = $1`, [id]);
      send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
      return true;
    }
  }

  // ==================== 4. PRODUCT DICTIONARIES (摆放位置 / 生产企业 / 单位) ====================
  if (path === '/product-dictionaries' && req.method === 'GET') {
    const type = clip(url.searchParams.get('type'), 40);
    const { rows } = await pool.query(
      `SELECT id, dict_type, name, sort_order FROM catalog.product_dictionaries
       WHERE ($1::text = '' OR dict_type = $1)
       ORDER BY sort_order ASC, created_at ASC`,
      [type]
    );
    send(res, 200, { items: rows.map((r) => ({ id: r.id, dictType: r.dict_type, name: r.name, sortOrder: r.sort_order })) });
    return true;
  }

  if (path === '/product-dictionaries' && req.method === 'POST') {
    if (!actor.canCreate && !actor.canUpdate) {
      send(res, 403, { error: '无参数设置权限' });
      return true;
    }
    const body = await readJson(req);
    const dictType = clip(body?.dictType, 40);
    const name = clip(body?.name, 120);
    if (!['stock_location', 'manufacturer', 'unit'].includes(dictType) || !name) {
      send(res, 400, { error: '请输入有效的字典类型和名称' });
      return true;
    }
    try {
      const { rows: [created] } = await pool.query(
        `INSERT INTO catalog.product_dictionaries (dict_type, name, sort_order)
         VALUES ($1, $2, COALESCE((SELECT max(sort_order) + 10 FROM catalog.product_dictionaries WHERE dict_type = $1), 10))
         RETURNING id, dict_type, name, sort_order`,
        [dictType, name]
      );
      send(res, 201, { item: { id: created.id, dictType: created.dict_type, name: created.name, sortOrder: created.sort_order } });
    } catch (error) {
      if (error.code === '23505') {
        send(res, 409, { error: '该选项已存在' });
        return true;
      }
      throw error;
    }
    return true;
  }

  const dictMatch = /^\/product-dictionaries\/([^/]+)$/.exec(path);
  if (dictMatch && req.method === 'DELETE') {
    if (!actor.canUpdate && !actor.canDelete) {
      send(res, 403, { error: '无删除权限' });
      return true;
    }
    const id = dictMatch[1];
    if (!uuidRe.test(id)) {
      send(res, 400, { error: 'Invalid id' });
      return true;
    }
    const { rowCount } = await pool.query(`DELETE FROM catalog.product_dictionaries WHERE id = $1`, [id]);
    send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
    return true;
  }

  // ==================== 5. LENS SURCHARGES (镜片工艺加价 / 散光附加费) ====================
  if (path === '/lens-surcharges' && req.method === 'GET') {
    const search = clip(url.searchParams.get('search'), 120);
    const { rows } = await pool.query(
      `SELECT * FROM catalog.lens_surcharges
       WHERE ($1::text = '' OR name ILIKE $2 OR category_name ILIKE $2 OR brand_name ILIKE $2)
       ORDER BY updated_at DESC, created_at DESC`,
      [search, `%${search.replace(/[\\%_]/g, '\\$&')}%`]
    );
    send(res, 200, {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        surchargeType: r.surcharge_type,
        categoryId: r.category_id ?? '',
        categoryName: r.category_name,
        brandId: r.brand_id ?? '',
        brandName: r.brand_name,
        sphRanges: Array.isArray(r.sph_ranges) ? r.sph_ranges : DEFAULT_SPH_RANGES,
        cylRanges: Array.isArray(r.cyl_ranges) ? r.cyl_ranges : DEFAULT_CYL_RANGES,
        matrix: Array.isArray(r.matrix) ? r.matrix : [],
        confirmDelete: Boolean(r.confirm_delete),
        enabled: Boolean(r.enabled),
        remark: r.remark ?? '',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
    return true;
  }

  if (path === '/lens-surcharges' && req.method === 'POST') {
    if (!actor.canCreate && !actor.canUpdate) {
      send(res, 403, { error: '无镜片工艺加价配置权限' });
      return true;
    }
    const body = await readJson(req, 131072);
    const name = clip(body?.name, 120) || '散光附加费';
    const surchargeType = clip(body?.surchargeType, 40) || '散光附加费';
    const categoryId = body?.categoryId && uuidRe.test(body.categoryId) ? body.categoryId : null;
    const categoryName = clip(body?.categoryName, 120) || '全部';
    const brandId = body?.brandId && uuidRe.test(body.brandId) ? body.brandId : null;
    const brandName = clip(body?.brandName, 120) || '全部';
    const sphRanges = Array.isArray(body?.sphRanges) && body.sphRanges.length ? body.sphRanges.map((s) => clip(s, 40)).filter(Boolean) : DEFAULT_SPH_RANGES;
    const cylRanges = Array.isArray(body?.cylRanges) && body.cylRanges.length ? body.cylRanges.map((s) => clip(s, 40)).filter(Boolean) : DEFAULT_CYL_RANGES;
    const matrix = Array.isArray(body?.matrix)
      ? sphRanges.map((_, rIdx) => cylRanges.map((__, cIdx) => {
          const v = Number(body.matrix?.[rIdx]?.[cIdx] ?? 0);
          return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        }))
      : sphRanges.map(() => cylRanges.map(() => 0));
    const confirmDelete = body?.confirmDelete === undefined ? true : Boolean(body.confirmDelete);
    const enabled = body?.enabled === undefined ? true : Boolean(body.enabled);
    const remark = clip(body?.remark, 300);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [created] } = await client.query(
        `INSERT INTO catalog.lens_surcharges (
           name, surcharge_type, category_id, category_name, brand_id, brand_name,
           sph_ranges, cyl_ranges, matrix, confirm_delete, enabled, remark, created_by, updated_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$13)
         RETURNING *`,
        [
          name, surchargeType, categoryId, categoryName, brandId, brandName,
          JSON.stringify(sphRanges), JSON.stringify(cylRanges), JSON.stringify(matrix),
          confirmDelete, enabled, remark, user.id,
        ]
      );
      await writeProductLog(client, user.id, '新增镜片工艺加价', created.name, { brandName, categoryName }, clientIp?.(req) ?? null);
      await client.query('COMMIT');
      send(res, 201, {
        item: {
          id: created.id,
          name: created.name,
          surchargeType: created.surcharge_type,
          categoryId: created.category_id ?? '',
          categoryName: created.category_name,
          brandId: created.brand_id ?? '',
          brandName: created.brand_name,
          sphRanges: created.sph_ranges,
          cylRanges: created.cyl_ranges,
          matrix: created.matrix,
          confirmDelete: Boolean(created.confirm_delete),
          enabled: Boolean(created.enabled),
          remark: created.remark ?? '',
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return true;
  }

  const surMatch = /^\/lens-surcharges\/([^/]+)$/.exec(path);
  if (surMatch) {
    const id = surMatch[1];
    if (!uuidRe.test(id)) {
      send(res, 400, { error: 'Invalid id' });
      return true;
    }
    if (req.method === 'PATCH') {
      if (!actor.canUpdate) {
        send(res, 403, { error: '无镜片工艺加价编辑权限' });
        return true;
      }
      const body = await readJson(req, 131072);
      const { rows: existingRows } = await pool.query(`SELECT * FROM catalog.lens_surcharges WHERE id = $1`, [id]);
      if (!existingRows.length) {
        send(res, 404, { error: '未找到加价规则' });
        return true;
      }
      const ex = existingRows[0];
      const name = 'name' in body ? (clip(body.name, 120) || ex.name) : ex.name;
      const surchargeType = 'surchargeType' in body ? (clip(body.surchargeType, 40) || ex.surcharge_type) : ex.surcharge_type;
      const categoryId = 'categoryId' in body ? (uuidRe.test(body.categoryId || '') ? body.categoryId : null) : ex.category_id;
      const categoryName = 'categoryName' in body ? (clip(body.categoryName, 120) || '全部') : ex.category_name;
      const brandId = 'brandId' in body ? (uuidRe.test(body.brandId || '') ? body.brandId : null) : ex.brand_id;
      const brandName = 'brandName' in body ? (clip(body.brandName, 120) || '全部') : ex.brand_name;
      const sphRanges = Array.isArray(body?.sphRanges) && body.sphRanges.length ? body.sphRanges.map((s) => clip(s, 40)).filter(Boolean) : ex.sph_ranges;
      const cylRanges = Array.isArray(body?.cylRanges) && body.cylRanges.length ? body.cylRanges.map((s) => clip(s, 40)).filter(Boolean) : ex.cyl_ranges;
      const matrix = Array.isArray(body?.matrix)
        ? sphRanges.map((_, rIdx) => cylRanges.map((__, cIdx) => {
            const v = Number(body.matrix?.[rIdx]?.[cIdx] ?? 0);
            return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
          }))
        : ex.matrix;
      const confirmDelete = 'confirmDelete' in body ? Boolean(body.confirmDelete) : ex.confirm_delete;
      const enabled = 'enabled' in body ? Boolean(body.enabled) : ex.enabled;
      const remark = 'remark' in body ? clip(body.remark, 300) : ex.remark;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: [updated] } = await client.query(
          `UPDATE catalog.lens_surcharges
           SET name=$2, surcharge_type=$3, category_id=$4, category_name=$5, brand_id=$6, brand_name=$7,
               sph_ranges=$8::jsonb, cyl_ranges=$9::jsonb, matrix=$10::jsonb,
               confirm_delete=$11, enabled=$12, remark=$13, updated_by=$14, updated_at=now()
           WHERE id=$1 RETURNING *`,
          [
            id, name, surchargeType, categoryId, categoryName, brandId, brandName,
            JSON.stringify(sphRanges), JSON.stringify(cylRanges), JSON.stringify(matrix),
            confirmDelete, enabled, remark, user.id,
          ]
        );
        await writeProductLog(client, user.id, '更新镜片工艺加价', updated.name, { brandName, categoryName }, clientIp?.(req) ?? null);
        await client.query('COMMIT');
        send(res, 200, {
          item: {
            id: updated.id,
            name: updated.name,
            surchargeType: updated.surcharge_type,
            categoryId: updated.category_id ?? '',
            categoryName: updated.category_name,
            brandId: updated.brand_id ?? '',
            brandName: updated.brand_name,
            sphRanges: updated.sph_ranges,
            cylRanges: updated.cyl_ranges,
            matrix: updated.matrix,
            confirmDelete: Boolean(updated.confirm_delete),
            enabled: Boolean(updated.enabled),
            remark: updated.remark ?? '',
            createdAt: updated.created_at,
            updatedAt: updated.updated_at,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      return true;
    }
    if (req.method === 'DELETE') {
      if (!actor.canDelete) {
        send(res, 403, { error: '无删除权限' });
        return true;
      }
      const { rowCount } = await pool.query(`DELETE FROM catalog.lens_surcharges WHERE id = $1`, [id]);
      send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
      return true;
    }
  }

  // ==================== 6. PRODUCTS BATCH & IMPORT ====================
  if (path === '/products/batch-delete' && req.method === 'POST') {
    if (!actor.canDelete) {
      send(res, 403, { error: '无商品删除权限' });
      return true;
    }
    const body = await readJson(req);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string' && uuidRe.test(id)) : [];
    if (!ids.length || ids.length > 200) {
      send(res, 400, { error: '请选择有效的商品记录' });
      return true;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: deleted } = await client.query(
        `DELETE FROM catalog.products WHERE id = ANY($1::uuid[]) RETURNING id, sku_code, name`,
        [ids]
      );
      if (deleted.length) {
        await writeProductLog(client, user.id, '批量删除商品', `${deleted.length}个商品`, { count: deleted.length }, clientIp?.(req) ?? null);
      }
      await client.query('COMMIT');
      send(res, 200, { deletedCount: deleted.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return true;
  }

  if (path === '/products/batch-update' && req.method === 'POST') {
    if (!actor.canUpdate) {
      send(res, 403, { error: '无商品批量编辑权限' });
      return true;
    }
    const body = await readJson(req);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string' && uuidRe.test(id)) : [];
    const patch = body?.patch;
    if (!ids.length || !patch || typeof patch !== 'object') {
      send(res, 400, { error: '参数无效' });
      return true;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updatedCount = 0;
      const { rows: targets } = await client.query(`SELECT * FROM catalog.products WHERE id = ANY($1::uuid[]) FOR UPDATE`, [ids]);
      for (const row of targets) {
        const nextEnabled = typeof patch.enabled === 'boolean' ? patch.enabled : row.enabled;
        const nextDiscount = patch.salesDiscount !== undefined && patch.salesDiscount !== ''
          ? Math.min(1000, Math.max(0, parseMoney(patch.salesDiscount, Number(row.sales_discount))))
          : Number(row.sales_discount);
        const nextDiscounted = Math.round(Number(row.retail_price) * (nextDiscount / 100) * 100) / 100;
        const nextLocation = typeof patch.stockLocation === 'string' && patch.stockLocation.trim()
          ? clip(patch.stockLocation, 120)
          : row.stock_location;
        const nextPin = typeof patch.pinOnSale === 'boolean' ? patch.pinOnSale : row.pin_on_sale;
        const nextTags = Array.isArray(patch.tags) ? [...new Set(patch.tags.map((t) => clip(t, 60)).filter(Boolean))] : row.tags;

        await client.query(
          `UPDATE catalog.products
           SET enabled=$2, sales_discount=$3, discounted_price=$4, stock_location=$5, pin_on_sale=$6, tags=$7, updated_by=$8, updated_at=now()
           WHERE id=$1`,
          [row.id, nextEnabled, nextDiscount, nextDiscounted, nextLocation, nextPin, nextTags, user.id]
        );
        updatedCount += 1;
      }
      if (updatedCount) {
        await writeProductLog(client, user.id, '批量设置商品属性', `${updatedCount}个商品`, patch, clientIp?.(req) ?? null);
      }
      await client.query('COMMIT');
      send(res, 200, { updatedCount });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return true;
  }

  if (path === '/products/import' && req.method === 'POST') {
    if (!actor.canImport) {
      send(res, 403, { error: '无商品导入权限' });
      return true;
    }
    const body = await readJson(req, 524288);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length || items.length > 200) {
      send(res, 400, { error: '单次导入行数须在 1 至 200 之间' });
      return true;
    }
    const { rows: cats } = await pool.query(`SELECT id, name FROM catalog.product_categories`);
    const catByName = new Map(cats.map((c) => [c.name, c.id]));
    const { rows: brands } = await pool.query(`SELECT id, name FROM catalog.brands`);
    const brandByName = new Map(brands.map((b) => [b.name, b.id]));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let successCount = 0;
      for (const raw of items) {
        const brandName = clip(raw.brandName, 120);
        const categoryName = clip(raw.categoryName, 120);
        const name = clip(raw.name, 240);
        const model = clip(raw.model, 120);
        if (!brandName || !categoryName || !name || !model) continue;
        const retailPrice = parseMoney(raw.retailPrice, 0);
        const salesDiscount = raw.salesDiscount !== undefined ? parseMoney(raw.salesDiscount, 100) : 100;
        const discountedPrice = Math.round(retailPrice * (salesDiscount / 100) * 100) / 100;
        const skuCode = clip(raw.skuCode, 64) || `QSL-IMP-${randomBytes(4).toString('hex').toUpperCase()}`;

        await client.query(
          `INSERT INTO catalog.products (
             sku_code, name, brand_id, brand_name, category_id, category_name, model,
             color_or_diopter, retail_price, sales_discount, discounted_price,
             created_by, updated_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
           ON CONFLICT (sku_code) DO UPDATE SET
             name=EXCLUDED.name, brand_id=EXCLUDED.brand_id, brand_name=EXCLUDED.brand_name,
             category_id=EXCLUDED.category_id, category_name=EXCLUDED.category_name,
             model=EXCLUDED.model, retail_price=EXCLUDED.retail_price,
             sales_discount=EXCLUDED.sales_discount, discounted_price=EXCLUDED.discounted_price,
             updated_by=EXCLUDED.updated_by, updated_at=now()`,
          [
            skuCode, name, brandByName.get(brandName) ?? null, brandName,
            catByName.get(categoryName) ?? null, categoryName, model,
            clip(raw.colorOrDiopter, 120), retailPrice, salesDiscount, discountedPrice, user.id,
          ]
        );
        successCount += 1;
      }
      await writeProductLog(client, user.id, '批量导入商品档案', `${successCount}条`, { successCount }, clientIp?.(req) ?? null);
      await client.query('COMMIT');
      send(res, 200, { importedCount: successCount });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return true;
  }

  // ==================== 7. PRODUCTS CRUD ====================
  const prodMatch = /^\/products(?:\/([^/]+))?$/.exec(path);
  if (!prodMatch) return false;
  const prodId = prodMatch[1];
  if (prodId && !uuidRe.test(prodId)) {
    send(res, 400, { error: 'Invalid product id' });
    return true;
  }

  if (req.method === 'GET' && !prodId) {
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1));
    const pageSize = Math.max(1, Math.min(200, Number.parseInt(url.searchParams.get('pageSize') ?? '10', 10) || 10));
    const keyword = clip(url.searchParams.get('keyword'), 120);
    const categoryId = clip(url.searchParams.get('categoryId'), 64);
    const brand = clip(url.searchParams.get('brand'), 120);
    const enabled = clip(url.searchParams.get('enabled'), 16);
    const isCustomLens = clip(url.searchParams.get('isCustomLens'), 16);
    const tag = clip(url.searchParams.get('tag'), 60);
    const sortByRaw = clip(url.searchParams.get('sortBy'), 40);
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

    const sortColumnMap = {
      name: 'name',
      brandName: 'brand_name',
      categoryName: 'category_name',
      model: 'model',
      retailPrice: 'retail_price',
      discountedPrice: 'discounted_price',
      createdAt: 'created_at',
    };
    const sortCol = sortColumnMap[sortByRaw] ?? 'created_at';

    let categoryIds = null;
    if (categoryId && categoryId !== 'all' && uuidRe.test(categoryId)) {
      const { rows: allCats } = await pool.query(`SELECT id, parent_id FROM catalog.product_categories`);
      categoryIds = collectDescendantCategoryIds(allCats, categoryId);
    }

    const kwPattern = keyword ? `%${keyword.replace(/[\\%_]/g, '\\$&')}%` : null;
    const values = [
      actor.identity_type === 'supplier' ? actor.supplier_id : null,
      categoryIds,
      brand && brand !== 'all' ? brand : null,
      enabled === 'true' ? true : enabled === 'false' ? false : null,
      isCustomLens === 'true' ? true : isCustomLens === 'false' ? false : null,
      tag && tag !== 'all' ? tag : null,
      kwPattern,
    ];
    const where = `
      WHERE ($1::uuid IS NULL OR supplier_id = $1)
        AND ($2::uuid[] IS NULL OR category_id = ANY($2::uuid[]))
        AND ($3::text IS NULL OR brand_name = $3)
        AND ($4::boolean IS NULL OR enabled = $4)
        AND ($5::boolean IS NULL OR is_custom_lens = $5)
        AND ($6::text IS NULL OR $6 = ANY(tags))
        AND (
          $7::text IS NULL
          OR name ILIKE $7 ESCAPE '\\'
          OR sku_code ILIKE $7 ESCAPE '\\'
          OR brand_name ILIKE $7 ESCAPE '\\'
          OR model ILIKE $7 ESCAPE '\\'
          OR color_or_diopter ILIKE $7 ESCAPE '\\'
          OR barcode ILIKE $7 ESCAPE '\\'
        )
    `;
    const countRes = await pool.query(`SELECT count(*)::int AS total FROM catalog.products ${where}`, values);
    const { rows } = await pool.query(
      `SELECT * FROM catalog.products ${where}
       ORDER BY pin_on_sale DESC, ${sortCol} ${sortOrder}, id DESC
       LIMIT $8 OFFSET $9`,
      [...values, pageSize, (page - 1) * pageSize]
    );

    send(res, 200, {
      items: rows.map((r) => shapeProduct(r, actor)),
      total: countRes.rows[0]?.total ?? 0,
      page,
      pageSize,
    });
    return true;
  }

  if (req.method === 'POST' && !prodId) {
    if (!actor.canCreate) {
      send(res, 403, { error: '无新增商品权限' });
      return true;
    }
    let body;
    try {
      body = await readJson(req, 524288);
    } catch (error) {
      send(res, 400, { error: error.message === 'Request too large' ? '图片或请求体过大' : 'Invalid JSON' });
      return true;
    }
    let data;
    try {
      data = validateProductPayload(body, true, actor);
    } catch (error) {
      send(res, 400, { error: error.message });
      return true;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (!data.categoryName && data.categoryId) {
        const { rows: [c] } = await client.query(`SELECT name FROM catalog.product_categories WHERE id=$1`, [data.categoryId]);
        if (c) data.categoryName = c.name;
      }
      if (!data.brandId && data.brandName) {
        const { rows: [b] } = await client.query(`SELECT id FROM catalog.brands WHERE lower(name)=lower($1) LIMIT 1`, [data.brandName]);
        if (b) data.brandId = b.id;
      }
      const { rows: [created] } = await client.query(
        `INSERT INTO catalog.products (
           sku_code, name, brand_id, brand_name, category_id, category_name,
           model, color_or_diopter, series, year, refractive_index, is_custom_lens,
           axis, coating_type, contact_lens_type, retail_price, sales_discount,
           discounted_price, cost_price, wholesale_price, barcode, stock_location,
           unit, pin_on_sale, tags, image_url, supplier_id, supplier_name,
           min_stock, max_stock, manufacturer, production_license_no, filing_cert_no,
           origin_place, license_expires_on, license_image_url, store_id, store_name,
           enabled, created_by, updated_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
           $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$40
         ) RETURNING *`,
        [
          data.skuCode, data.name, data.brandId, data.brandName, data.categoryId, data.categoryName,
          data.model, data.colorOrDiopter, data.series, data.year, data.refractiveIndex, data.isCustomLens,
          data.axis, data.coatingType, data.contactLensType, data.retailPrice, data.salesDiscount,
          data.discountedPrice, data.costPrice, data.wholesalePrice, data.barcode, data.stockLocation,
          data.unit, data.pinOnSale, data.tags, data.imageUrl, data.supplierId, data.supplierName,
          data.minStock, data.maxStock, data.manufacturer, data.productionLicenseNo, data.filingCertNo,
          data.originPlace, data.licenseExpiresOn, data.licenseImageUrl, data.storeId, data.storeName,
          data.enabled, user.id,
        ]
      );
      await writeProductLog(client, user.id, '新增商品资料', created.sku_code, { name: created.name, brandName: created.brand_name }, clientIp?.(req) ?? null);
      await client.query('COMMIT');
      send(res, 201, { item: shapeProduct(created, actor) });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        send(res, 409, { error: '商品编码已存在，请更换后重试' });
        return true;
      }
      throw error;
    } finally {
      client.release();
    }
    return true;
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && prodId) {
    if (!actor.canUpdate) {
      send(res, 403, { error: '无商品编辑权限' });
      return true;
    }
    let body;
    try {
      body = await readJson(req, 524288);
    } catch (error) {
      send(res, 400, { error: error.message === 'Request too large' ? '图片或请求体过大' : 'Invalid JSON' });
      return true;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existingRows } = await client.query(`SELECT * FROM catalog.products WHERE id = $1 FOR UPDATE`, [prodId]);
      if (!existingRows.length) {
        await client.query('ROLLBACK');
        send(res, 404, { error: '未找到该商品' });
        return true;
      }
      let data;
      try {
        data = validateProductPayload(body, false, actor, existingRows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        send(res, 400, { error: error.message });
        return true;
      }
      if (!data.categoryName && data.categoryId) {
        const { rows: [c] } = await client.query(`SELECT name FROM catalog.product_categories WHERE id=$1`, [data.categoryId]);
        if (c) data.categoryName = c.name;
      }
      const { rows: [updated] } = await client.query(
        `UPDATE catalog.products SET
           sku_code=$2, name=$3, brand_id=$4, brand_name=$5, category_id=$6, category_name=$7,
           model=$8, color_or_diopter=$9, series=$10, year=$11, refractive_index=$12, is_custom_lens=$13,
           axis=$14, coating_type=$15, contact_lens_type=$16, retail_price=$17, sales_discount=$18,
           discounted_price=$19, cost_price=$20, wholesale_price=$21, barcode=$22, stock_location=$23,
           unit=$24, pin_on_sale=$25, tags=$26, image_url=$27, supplier_id=$28, supplier_name=$29,
           min_stock=$30, max_stock=$31, manufacturer=$32, production_license_no=$33, filing_cert_no=$34,
           origin_place=$35, license_expires_on=$36, license_image_url=$37, store_id=$38, store_name=$39,
           enabled=$40, updated_by=$41, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [
          prodId,
          data.skuCode, data.name, data.brandId, data.brandName, data.categoryId, data.categoryName,
          data.model, data.colorOrDiopter, data.series, data.year, data.refractiveIndex, data.isCustomLens,
          data.axis, data.coatingType, data.contactLensType, data.retailPrice, data.salesDiscount,
          data.discountedPrice, data.costPrice, data.wholesalePrice, data.barcode, data.stockLocation,
          data.unit, data.pinOnSale, data.tags, data.imageUrl, data.supplierId, data.supplierName,
          data.minStock, data.maxStock, data.manufacturer, data.productionLicenseNo, data.filingCertNo,
          data.originPlace, data.licenseExpiresOn, data.licenseImageUrl, data.storeId, data.storeName,
          data.enabled, user.id,
        ]
      );
      await writeProductLog(client, user.id, '编辑商品资料', updated.sku_code, { name: updated.name }, clientIp?.(req) ?? null);
      await client.query('COMMIT');
      send(res, 200, { item: shapeProduct(updated, actor) });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        send(res, 409, { error: '商品编码已存在' });
        return true;
      }
      throw error;
    } finally {
      client.release();
    }
    return true;
  }

  if (req.method === 'DELETE' && prodId) {
    if (!actor.canDelete) {
      send(res, 403, { error: '无商品删除权限' });
      return true;
    }
    const { rowCount } = await pool.query(`DELETE FROM catalog.products WHERE id = $1`, [prodId]);
    send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' });
    return true;
  }

  send(res, 405, { error: 'Method not allowed' });
  return true;
}

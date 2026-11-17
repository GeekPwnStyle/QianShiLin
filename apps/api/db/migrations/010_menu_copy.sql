BEGIN;
UPDATE identity.roles AS r SET description=v.new_description
FROM (VALUES
  ('role_hq_admin', '可管理全部18个授权业务模块与跨门店范围；成本价与期末处理需单独开启。', '可管理全部18个授权业务模块与跨门店范围；成本价与账期结转需单独开启。'),
  ('role_store_manager', '仅访问所辖门店的销售、库存、会员、视光、加工与门店报表，无系统全局设置权。', '仅访问所辖门店的门店交易、库存运营、客户经营、视力健康档案、交付加工与经营分析，无系统全局设置权。'),
  ('role_store_guide', '聚焦门店开单、商品查询、会员接待与复查提醒，受限查看采购成本与财务台账。', '聚焦门店收银工作台、商品查询、客户接待与复查邀约，受限查看采购成本与资金往来。'),
  ('role_store_optometrist', '负责视光档案、角膜塑形检查、视力筛查与复查通知，不接触成本及财务审批。', '负责屈光检查记录、塑形镜随访、校园视力项目与复查邀约，不接触成本及财务审批。'),
  ('role_supplier_partner', '供应商专属工作台与品牌专区：仅查看自身供货商品、采购交付、退货及往来对账，严格隔离顾客、会员、视光与内部利润。', '供应商专属工作台与品牌采购门户：仅查看自身供货商品、采购交付、退货及供应链对账，严格隔离客户、视力健康与内部利润。')
) AS v(id,old_description,new_description)
WHERE r.id=v.id AND r.description=v.old_description;
UPDATE identity.roles SET description='可管理全部18个授权业务模块与跨门店范围；成本价与账期结转需单独开启。'
WHERE id='role_hq_admin' AND description='可管理全部18个授权业务模块与跨门店范围；成本价与月结作业需单独开启。';
COMMIT;

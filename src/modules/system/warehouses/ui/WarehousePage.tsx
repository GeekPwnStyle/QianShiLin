import React from 'react';
import { CatalogResourcePage, type CatalogConfig } from '@/src/modules/catalog/ui/CatalogResourcePage';

const config: CatalogConfig = {
  resource: 'warehouses', title: '加工仓库设置',
  description: '维护仓库代号、名称、联系人、类型及排序。',
  columns: ['code', 'name', 'contact_phone', 'warehouse_type', 'display_order', 'enabled'],
  fields: [
    { key: 'code', label: '仓库代号', required: true },
    { key: 'name', label: '仓库名称', required: true },
    { key: 'contact_phone', label: '仓库联系人' },
    { key: 'warehouse_type', label: '仓库类型', type: 'select',
      options: ['加工仓', '成品仓', '门店仓', '退货仓'], required: true },
    { key: 'remark', label: '仓库备注' },
    { key: 'display_order', label: '显示顺序', type: 'integer' },
    { key: 'enabled', label: '启用状态', type: 'boolean' },
  ],
};
export const WarehousePage: React.FC = () => <CatalogResourcePage config={config} />;

import React from 'react';
import { CatalogResourcePage, type CatalogConfig } from '@/src/modules/catalog/ui/CatalogResourcePage';

const config: CatalogConfig = {
  resource: 'brands', title: '品牌资料',
  description: '管理品牌性质、售卖品类、系列及启用状态。',
  columns: ['name', 'alias', 'kind', 'natures', 'series', 'pinned', 'enabled'],
  fields: [
    { key: 'name', label: '品牌名称', required: true },
    { key: 'alias', label: '品牌别名' },
    { key: 'kind', label: '品牌性质', type: 'select', options: ['自营品牌', '代理品牌'], required: true },
    { key: 'natures', label: '售卖品类', type: 'array' },
    { key: 'series', label: '系列（使用顿号分隔）', type: 'array' },
    { key: 'remark', label: '品牌备注' },
    { key: 'pinned', label: '是否置顶', type: 'boolean' },
    { key: 'enabled', label: '是否启用', type: 'boolean' },
  ],
};
export const BrandPage: React.FC = () => <CatalogResourcePage config={config} />;

import React from 'react';
import { CatalogResourcePage, type CatalogConfig } from '@/src/modules/catalog/ui/CatalogResourcePage';

const config: CatalogConfig = {
  resource: 'suppliers', title: '供应商资料',
  description: '维护联系人、供应品类、经营资质与证照有效期。银行资料属于敏感字段。',
  columns: ['name', 'contact', 'phone', 'categories', 'province', 'device_license_expires_on', 'enabled'],
  fields: [
    { key: 'name', label: '供应商名称', required: true },
    { key: 'alias', label: '供应商别名' },
    { key: 'contact', label: '联系人' },
    { key: 'phone', label: '联系电话' },
    { key: 'categories', label: '供应品类（使用顿号分隔）', type: 'array' },
    { key: 'is_default', label: '默认供应商', type: 'boolean' },
    { key: 'province', label: '省份' },
    { key: 'city', label: '城市' },
    { key: 'district', label: '区县' },
    { key: 'detail_address', label: '详细地址' },
    { key: 'scope', label: '经营范围' },
    { key: 'credit_code', label: '统一社会信用代码' },
    { key: 'business_license_expires_on', label: '营业执照到期日', type: 'date' },
    { key: 'device_license_number', label: '医疗器械经营许可证号' },
    { key: 'device_license_expires_on', label: '医疗器械经营许可证到期日', type: 'date' },
    { key: 'remark', label: '备注' },
    { key: 'enabled', label: '启用状态', type: 'boolean' },
  ],
};
export const SupplierPage: React.FC = () => <CatalogResourcePage config={config} />;

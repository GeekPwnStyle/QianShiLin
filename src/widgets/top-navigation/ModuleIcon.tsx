import React from 'react';
import {
  Activity,
  ArrowLeftRight,
  Award,
  BadgePercent,
  BarChart3,
  BookOpen,
  Box,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Coins,
  CreditCard,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Glasses,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  Megaphone,
  MessageSquareMore,
  Package,
  PhoneCall,
  PieChart,
  Receipt,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  School,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sparkles,
  Store,
  Tag,
  Target,
  Thermometer,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Layers,
  ShoppingBag,
  Truck,
  ArrowLeftRight,
  Package,
  Wrench,
  BarChart3,
  Receipt,
  Eye,
  Users,
  Sliders,
  ClipboardList,
  School,
  Activity,
  Award,
  Megaphone,
  Settings,
  HelpCircle,
  LayoutDashboard,
  FileText,
};

export const ModuleIcon: React.FC<{
  name: string;
  className?: string;
  strokeWidth?: number;
}> = ({ name, className = 'w-4 h-4', strokeWidth }) => {
  const IconComp = ICON_MAP[name] ?? FileText;
  return <IconComp className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
};

export const L2MenuIcon: React.FC<{ nodeId: string; label: string; className?: string }> = ({
  nodeId,
  label,
  className = 'w-[18px] h-[18px]',
}) => {
  const pick = (): React.ComponentType<{ className?: string }> => {
    if (nodeId.includes('product') || label.includes('商品')) return Glasses;
    if (nodeId.includes('customer') || label.includes('顾客')) return Users;
    if (nodeId.includes('staff') || label.includes('员工')) return UserCheck;
    if (nodeId.includes('supplier') || label.includes('供应商')) return Truck;
    if (nodeId.includes('brand') || label.includes('品牌')) return Award;
    if (nodeId.includes('fee') || label.includes('定价')) return Coins;
    if (nodeId.includes('pos') || label.includes('开单')) return ShoppingCart;
    if (nodeId.includes('processing') || label.includes('加工')) return Sliders;
    if (nodeId.includes('approval') || label.includes('审核') || label.includes('审批')) return ClipboardCheck;
    if (nodeId.includes('setting') || label.includes('设置') || label.includes('参数')) return Settings;
    if (nodeId.includes('campaign') || label.includes('活动') || label.includes('营销')) return Sparkles;
    if (nodeId.includes('target') || label.includes('任务')) return Target;
    if (nodeId.includes('scan') || label.includes('扫码')) return ScanBarcode;
    if (nodeId.includes('return') || label.includes('退货')) return RotateCcw;
    if (nodeId.includes('in_transit') || label.includes('在途')) return Truck;
    if (nodeId.includes('replenish') || label.includes('补货')) return RefreshCw;
    if (nodeId.includes('outbound') || nodeId.includes('inbound') || label.includes('协同')) return ArrowLeftRight;
    if (nodeId.includes('stocktake') || label.includes('盘点')) return CheckSquare;
    if (nodeId.includes('crosstab') || label.includes('交叉')) return FolderKanban;
    if (nodeId.includes('inventory') || label.includes('库存')) return Box;
    if (nodeId.includes('after_sales') || label.includes('维修')) return Wrench;
    if (nodeId.includes('performance') || label.includes('业绩')) return LineChart;
    if (nodeId.includes('report') || label.includes('报表') || label.includes('统计')) return PieChart;
    if (nodeId.includes('reconciliation') || label.includes('对账')) return FileCheck2;
    if (nodeId.includes('payment') || nodeId.includes('ap_') || label.includes('付款') || label.includes('应付')) return Wallet;
    if (nodeId.includes('receipt') || nodeId.includes('ar_') || label.includes('收款') || label.includes('应收')) return CreditCard;
    if (nodeId.includes('expense') || label.includes('费用')) return Receipt;
    if (nodeId.includes('temp_humidity') || label.includes('温湿度')) return Thermometer;
    if (nodeId.includes('near_expiry') || label.includes('效期')) return Activity;
    if (nodeId.includes('udi') || label.includes('首营')) return FileSpreadsheet;
    if (nodeId.includes('profile') || label.includes('客户中心')) return UserPlus;
    if (nodeId.includes('followup') || label.includes('回访')) return PhoneCall;
    if (nodeId.includes('points') || label.includes('积分')) return BadgePercent;
    if (nodeId.includes('recharge') || label.includes('充值')) return Wallet;
    if (nodeId.includes('appointment') || label.includes('预约')) return CalendarCheck;
    if (nodeId.includes('bind_guide') || label.includes('导购')) return UserCheck;
    if (nodeId.includes('reception') || label.includes('接待')) return MessageSquareMore;
    if (nodeId.includes('persona') || label.includes('画像')) return Users;
    if (nodeId.includes('analytics') || label.includes('分析')) return BarChart3;
    if (nodeId.includes('optometry') || nodeId.includes('验光') || nodeId.includes('视光') || nodeId.includes('视力')) return Eye;
    if (nodeId.includes('school') || label.includes('学校')) return School;
    if (nodeId.includes('role') || label.includes('权限')) return Shield;
    if (nodeId.includes('store') || label.includes('门店')) return Store;
    if (nodeId.includes('warehouse') || label.includes('仓库')) return Building2;
    if (nodeId.includes('bank') || label.includes('银行')) return Briefcase;
    if (nodeId.includes('audit') || label.includes('日志')) return History;
    if (nodeId.includes('docs') || label.includes('文档') || label.includes('指引')) return BookOpen;
    if (nodeId.includes('tag') || label.includes('标签')) return Tag;
    return FileText;
  };
  const Icon = pick();
  return <Icon className={className} aria-hidden="true" />;
};

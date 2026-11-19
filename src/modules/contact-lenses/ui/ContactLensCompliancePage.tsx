import React, { useState } from 'react';
import { Plus, Thermometer } from 'lucide-react';
import { Button } from '@/src/shared/ui/Button';
import { ThinLineChart } from '@/src/shared/ui/Charts';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

interface TempLogRow {
  id: string;
  recordedAt: string;
  warehouse: string;
  tempCelsius: string;
  humidityPct: string;
  recorder: string;
  status: '正常 (10~25°C)' | '湿度偏高预警';
}

const TEMP_LOGS: TempLogRow[] = [
  { id: 'th_01', recordedAt: '2026-11-16 09:00', warehouse: '西湖旗舰店隐形阴凉库', tempCelsius: '19.4°C', humidityPct: '48%', recorder: '周婉宁', status: '正常 (10~25°C)' },
  { id: 'th_02', recordedAt: '2026-11-15 18:00', warehouse: '西湖旗舰店隐形阴凉库', tempCelsius: '20.1°C', humidityPct: '52%', recorder: '苏晓晴', status: '正常 (10~25°C)' },
  { id: 'th_03', recordedAt: '2026-11-15 09:00', warehouse: '静安嘉里隐形器械库', tempCelsius: '21.3°C', humidityPct: '69%', recorder: '林语嫣', status: '湿度偏高预警' },
];

interface ComplianceBatchRow {
  id: string;
  batchNo: string;
  udiCode: string;
  productName: string;
  regCertNo: string;
  expiryDate: string;
  daysLeft: number;
  qtyBoxes: number;
}

const COMPLIANCE_BATCHES: ComplianceBatchRow[] = [
  { id: 'cl_01', batchNo: 'B25091', udiCode: '(01)00733905123456(17)270112', productName: '安视优欧舒适硅水凝胶日抛 30片装', regCertNo: '国械注进20173161882', expiryDate: '2027-01-12', daysLeft: 57, qtyBoxes: 14 },
  { id: 'cl_02', batchNo: 'K26014', udiCode: '(01)06921188300112(17)270425', productName: '库博光学硅水凝胶月抛 6片装', regCertNo: '国械注进20183160412', expiryDate: '2027-04-25', daysLeft: 160, qtyBoxes: 26 },
  { id: 'cl_03', batchNo: 'H24112', udiCode: '(01)06934512009811(17)261205', productName: '海昌高透氧半年抛护理套装', regCertNo: '国械注准20193160721', expiryDate: '2026-12-05', daysLeft: 19, qtyBoxes: 5 },
];

export const ContactLensCompliancePage: React.FC<{ nodeId: string; pageTitle: string }> = ({
  nodeId,
  pageTitle,
}) => {
  const isTempHumidity = nodeId === 'contact_lenses.temp_humidity';
  const [logs, setLogs] = useState(TEMP_LOGS);
  const [tempVal, setTempVal] = useState('19.8');
  const [humVal, setHumVal] = useState('50');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleAddTemp = () => {
    const t = Number.parseFloat(tempVal);
    const h = Number.parseFloat(humVal);
    if (Number.isNaN(t) || Number.isNaN(h)) return;
    setLogs([
      {
        id: `th_${Date.now()}`,
        recordedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        warehouse: '西湖旗舰店隐形阴凉库',
        tempCelsius: `${t.toFixed(1)}°C`,
        humidityPct: `${Math.round(h)}%`,
        recorder: '当前值班质管员',
        status: h > 65 ? '湿度偏高预警' : '正常 (10~25°C)',
      },
      ...logs,
    ]);
  };

  if (isTempHumidity) {
    const tempColumns: TableColumn<TempLogRow>[] = [
      { key: 'recordedAt', header: '监测时间', render: (r) => <span className="tabular-nums">{r.recordedAt}</span> },
      { key: 'warehouse', header: '医疗器械库区', render: (r) => r.warehouse },
      { key: 'tempCelsius', header: '实测温度', align: 'right', render: (r) => <span className="font-mono font-semibold">{r.tempCelsius}</span> },
      { key: 'humidityPct', header: '相对湿度', align: 'right', render: (r) => <span className="font-mono font-semibold">{r.humidityPct}</span> },
      { key: 'recorder', header: '记录人', render: (r) => r.recorder },
      {
        key: 'status',
        header: 'GSP合规判定',
        render: (r) => (
          <StatusLabel tone={r.status.includes('预警') ? 'warning' : 'success'} label={r.status} />
        ),
      },
    ];

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 bg-white border border-[#D9DDD4] rounded-[20px] p-5">
            <h2 className="text-[18px] font-semibold text-[#171916] mb-1">
              隐形眼镜阴凉库 7日温湿度趋势
            </h2>
            <p className="text-[14px] text-[#73796F] mb-3">
              三类医疗器械储存要求：温度 10~25°C，相对湿度 35%~65%RH
            </p>
            <ThinLineChart
              data={[
                { label: '11-11', primary: 19.2, secondary: 49 },
                { label: '11-12', primary: 19.8, secondary: 52 },
                { label: '11-13', primary: 20.4, secondary: 54 },
                { label: '11-14', primary: 20.1, secondary: 51 },
                { label: '11-15', primary: 21.3, secondary: 69 },
                { label: '11-16', primary: 19.4, secondary: 48 },
              ]}
              primaryLabel="温度 (°C)"
              secondaryLabel="相对湿度 (%RH)"
              valueFormatter={(v) => String(v)}
            />
          </div>

          <div className="lg:col-span-4 bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-3 text-[15px]">
            <div className="flex items-center gap-2 font-semibold text-[#171916]">
              <Thermometer className="w-4 h-4" />
              <span>补录今日库房温湿度</span>
            </div>
            <div>
              <label className="block text-[14px] text-[#5F645D] mb-1">温度 (°C)</label>
              <input value={tempVal} onChange={(e) => setTempVal(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4] font-mono" />
            </div>
            <div>
              <label className="block text-[14px] text-[#5F645D] mb-1">相对湿度 (%RH)</label>
              <input value={humVal} onChange={(e) => setHumVal(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4] font-mono" />
            </div>
            <Button variant="primary" className="w-full" icon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddTemp}>
              登记监测记录
            </Button>
          </div>
        </div>

        <DataTable
          columns={tempColumns}
          rows={logs}
          total={logs.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>
    );
  }

  const batchColumns: TableColumn<ComplianceBatchRow>[] = [
    { key: 'batchNo', header: '生产批号', sticky: true, render: (r) => <span className="font-mono font-semibold">{r.batchNo}</span> },
    { key: 'productName', header: '医疗器械商品名称', render: (r) => r.productName },
    { key: 'regCertNo', header: '注册证号', render: (r) => <span className="font-mono text-[14px]">{r.regCertNo}</span> },
    { key: 'udiCode', header: 'UDI唯一标识', render: (r) => <span className="font-mono text-[13px] text-[#5F645D]">{r.udiCode}</span> },
    { key: 'expiryDate', header: '失效日期', render: (r) => <span className="tabular-nums">{r.expiryDate}</span> },
    {
      key: 'daysLeft',
      header: '近效期预警',
      render: (r) => (
        <StatusLabel
          tone={r.daysLeft <= 30 ? 'error' : r.daysLeft <= 90 ? 'warning' : 'success'}
          label={`距失效 ${r.daysLeft} 天`}
        />
      ),
    },
    { key: 'qtyBoxes', header: '在库盒数', align: 'right', render: (r) => `${r.qtyBoxes} 盒` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-semibold text-[#171916]">{pageTitle} · 合规追踪台账</h2>
        <HelpTooltip
          title="三类医疗器械 GSP 合规说明"
          content={`当前模块「${pageTitle}」按三类医疗器械 GSP 合规规范追踪注册证号、生产批号与 UDI 唯一标识。`}
          ariaLabel="查看三类医疗器械合规说明"
        />
      </div>
      <DataTable
        columns={batchColumns}
        rows={COMPLIANCE_BATCHES}
        total={COMPLIANCE_BATCHES.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />
    </div>
  );
};

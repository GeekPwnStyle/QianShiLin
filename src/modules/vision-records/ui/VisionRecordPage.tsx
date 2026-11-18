import React, { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { Button } from '@/src/shared/ui/Button';
import { Modal } from '@/src/shared/ui/Modal';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';

interface OptometryExamRecord {
  id: string;
  recordNo: string;
  customerName: string;
  age: number;
  storeName: string;
  examDate: string;
  optometrist: string;
  examType: '常规医学验光' | '青少年眼轴复查' | '角膜塑形镜评估';
  od: { sph: string; cyl: string; axis: string; add: string; va: string; axialMm?: string; k1k2?: string };
  os: { sph: string; cyl: string; axis: string; add: string; va: string; axialMm?: string; k1k2?: string };
  pdFarMm: string;
  pdNearMm: string;
  recommendation: string;
}

const INITIAL_RECORDS: OptometryExamRecord[] = [
  {
    id: 'opt_01',
    recordNo: 'VG-20261114-01',
    customerName: '沈佳宁',
    age: 13,
    storeName: '杭州西湖旗舰店',
    examDate: '2026-11-14',
    optometrist: '许文博（高级验光师）',
    examType: '青少年眼轴复查',
    od: { sph: '-2.25D', cyl: '-0.75D', axis: '175°', add: '0.00D', va: '1.0', axialMm: '24.32 mm', k1k2: '42.50 / 43.25 D' },
    os: { sph: '-2.00D', cyl: '-0.50D', axis: '5°', add: '0.00D', va: '1.0', axialMm: '24.18 mm', k1k2: '42.75 / 43.40 D' },
    pdFarMm: '60.5 mm',
    pdNearMm: '57.5 mm',
    recommendation: '近半年眼轴增长 0.08mm，控制稳定，维持小乐圆方案并每3个月复测。',
  },
  {
    id: 'opt_02',
    recordNo: 'VG-20261112-09',
    customerName: '高宇航',
    age: 10,
    storeName: '上海静安嘉里中心店',
    examDate: '2026-11-12',
    optometrist: '冯思远（视光主任）',
    examType: '角膜塑形镜评估',
    od: { sph: '0.00D (戴镜后)', cyl: '-0.25D', axis: '180°', add: '-', va: '1.0', axialMm: '23.95 mm', k1k2: '41.80 / 42.60 D' },
    os: { sph: '0.00D (戴镜后)', cyl: '-0.25D', axis: '175°', add: '-', va: '1.0', axialMm: '23.88 mm', k1k2: '41.90 / 42.70 D' },
    pdFarMm: '58.0 mm',
    pdNearMm: '55.5 mm',
    recommendation: '角膜荧光染色0级，地形图牛眼征居中，嘱每日规范除蛋白护理。',
  },
  {
    id: 'opt_03',
    recordNo: 'VG-20261110-04',
    customerName: '宋致谦',
    age: 48,
    storeName: '南京新街口视光中心',
    examDate: '2026-11-10',
    optometrist: '何敏（资深验光师）',
    examType: '常规医学验光',
    od: { sph: '-2.75D', cyl: '-0.50D', axis: '85°', add: '+1.50D', va: '1.0' },
    os: { sph: '-2.50D', cyl: '-0.50D', axis: '95°', add: '+1.50D', va: '1.0' },
    pdFarMm: '64.0 mm',
    pdNearMm: '61.0 mm',
    recommendation: '渐进多焦点通道建议 14mm，适配日常电脑办公与驾车需求。',
  },
];

export const VisionRecordPage: React.FC<{ isOrtho?: boolean; pageTitle: string }> = ({
  isOrtho = false,
  pageTitle,
}) => {
  const [records, setRecords] = useState<OptometryExamRecord[]>(INITIAL_RECORDS);
  const [selected, setSelected] = useState<OptometryExamRecord>(INITIAL_RECORDS[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [customerName, setCustomerName] = useState('');
  const [odSph, setOdSph] = useState('-2.00D');
  const [odCyl, setOdCyl] = useState('-0.50D');
  const [odAxis, setOdAxis] = useState('180°');
  const [osSph, setOsSph] = useState('-1.75D');
  const [osCyl, setOsCyl] = useState('-0.50D');
  const [osAxis, setOsAxis] = useState('175°');
  const [pdFarMm, setPdFarMm] = useState('62.0 mm');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (!customerName.trim()) return;
    const item: OptometryExamRecord = {
      id: `opt_${Date.now()}`,
      recordNo: `VG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-99`,
      customerName: customerName.trim(),
      age: 15,
      storeName: '杭州西湖旗舰店',
      examDate: new Date().toISOString().slice(0, 10),
      optometrist: '许文博（高级验光师）',
      examType: isOrtho ? '角膜塑形镜评估' : '常规医学验光',
      od: { sph: odSph, cyl: odCyl, axis: odAxis, add: '0.00D', va: '1.0', axialMm: '24.10 mm', k1k2: '42.40 / 43.10 D' },
      os: { sph: osSph, cyl: osCyl, axis: osAxis, add: '0.00D', va: '1.0', axialMm: '24.05 mm', k1k2: '42.50 / 43.20 D' },
      pdFarMm,
      pdNearMm: '59.0 mm',
      recommendation: note || '录入演示处方档案，临床处方签发需验光师最终核准。',
    };
    setRecords([item, ...records]);
    setSelected(item);
    setAddOpen(false);
    setCustomerName('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="xl:col-span-4 bg-white border border-[#D9DDD4] rounded-[20px] p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E0]">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[17px] font-semibold text-[#171916] truncate">{pageTitle}档案列表</h2>
              {isOrtho && (
                <HelpTooltip
                  tone="warning"
                  title="医疗质控待确认提示"
                  content="角膜塑形镜属于三类医疗器械验配，禁忌症拦截阈值、裂隙灯影像归档及执业医师审核签章流程待医疗质控部门确认。"
                  ariaLabel="查看医疗质控待确认提示"
                />
              )}
            </div>
            <Button
              size="sm"
              variant="accent"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setAddOpen(true)}
            >
              新建记录
            </Button>
          </div>
          <div className="space-y-2">
            {records
              .slice(
                (Math.min(page, Math.max(1, Math.ceil(records.length / pageSize))) - 1) * pageSize,
                Math.min(page, Math.max(1, Math.ceil(records.length / pageSize))) * pageSize
              )
              .map((r) => {
              const active = selected.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                    active ? 'bg-[var(--qsl-accent-soft)] border-[var(--qsl-brand-dark)]' : 'bg-[#F8F9F5] border-[#E5E8E0] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[16px] text-[#171916]">
                      {r.customerName} ({r.age}岁)
                    </span>
                    <span className="text-[13px] font-mono text-[#73796F]">{r.examDate}</span>
                  </div>
                  <div className="text-[14px] text-[#5F645D] mt-1">
                    {r.examType} · {r.storeName}
                  </div>
                  <div className="text-[13px] font-mono text-[#5F645D] mt-1">
                    OD {r.od.sph} / OS {r.os.sph} · PD {r.pdFarMm}
                  </div>
                </button>
              );
            })}
          </div>
          <PaginationBar
            compact
            className="rounded-b-[16px] -mx-4 -mb-4"
            total={records.length}
            page={page}
            pageSize={pageSize}
            unit="份"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>

        {/* Right Long Grouped Clinical Sheet */}
        <div className="xl:col-span-8 bg-white border border-[#D9DDD4] rounded-[20px] p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E5E8E0]">
            <div>
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-[#171916]" />
                <h2 className="text-[20px] font-semibold text-[#171916]">
                  {selected.customerName} · 专业视光处方单
                </h2>
                <StatusLabel tone="processing" label={selected.examType} />
              </div>
              <p className="text-[14px] text-[#5F645D] mt-1 font-mono">
                档案号：{selected.recordNo} · 检查日期：{selected.examDate} · 主检：{selected.optometrist}
              </p>
            </div>
          </div>

          {/* Explicit OD / OS Grouped Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OD Right Eye */}
            <div className="p-5 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E8E0] pb-2">
                <span className="text-[16px] font-semibold text-[#171916]">右眼 (OD) 屈光与生物参数</span>
                <span className="text-[13px] font-mono text-[#73796F]">Right Eye</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[15px] tabular-nums">
                <div>
                  <div className="text-[13px] text-[#73796F]">球镜 (SPH / D)</div>
                  <div className="font-mono font-semibold text-[18px] mt-0.5">{selected.od.sph}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#73796F]">柱镜 (CYL / D)</div>
                  <div className="font-mono font-semibold text-[18px] mt-0.5">{selected.od.cyl}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#73796F]">轴位 (AXIS / °)</div>
                  <div className="font-mono mt-0.5">{selected.od.axis}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#73796F]">下加光 (ADD) / 矫正视力</div>
                  <div className="font-mono mt-0.5">{selected.od.add} / VA {selected.od.va}</div>
                </div>
                {selected.od.axialMm && (
                  <div>
                    <div className="text-[13px] text-[#73796F]">眼轴长度 (AL / mm)</div>
                    <div className="font-mono font-medium mt-0.5">{selected.od.axialMm}</div>
                  </div>
                )}
                {selected.od.k1k2 && (
                  <div>
                    <div className="text-[13px] text-[#73796F]">角膜曲率 K1/K2</div>
                    <div className="font-mono mt-0.5">{selected.od.k1k2}</div>
                  </div>
                )}
              </div>
            </div>

            {/* OS Left Eye */}
            <div className="p-5 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E8E0] pb-2">
                <span className="text-[16px] font-semibold text-[#171916]">左眼 (OS) 屈光与生物参数</span>
                <span className="text-[13px] font-mono text-[#73796F]">Left Eye</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[15px] tabular-nums">
                <div>
                  <div className="text-[13px] text-[#73796F]">球镜 (SPH / D)</div>
                  <div className="font-mono font-semibold text-[18px] mt-0.5">{selected.os.sph}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#73796F]">柱镜 (CYL / D)</div>
                  <div className="font-mono font-semibold text-[18px] mt-0.5">{selected.os.cyl}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#73796F]">轴位 (AXIS / °)</div>
                  <div className="font-mono mt-0.5">{selected.os.axis}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#73796F]">下加光 (ADD) / 矫正视力</div>
                  <div className="font-mono mt-0.5">{selected.os.add} / VA {selected.os.va}</div>
                </div>
                {selected.os.axialMm && (
                  <div>
                    <div className="text-[13px] text-[#73796F]">眼轴长度 (AL / mm)</div>
                    <div className="font-mono font-medium mt-0.5">{selected.os.axialMm}</div>
                  </div>
                )}
                {selected.os.k1k2 && (
                  <div>
                    <div className="text-[13px] text-[#73796F]">角膜曲率 K1/K2</div>
                    <div className="font-mono mt-0.5">{selected.os.k1k2}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl border border-[#E5E8E0] text-[15px]">
            <div>
              <div className="text-[13px] text-[#73796F]">远用瞳距 (Far PD)</div>
              <div className="font-mono font-semibold mt-0.5">{selected.pdFarMm}</div>
            </div>
            <div>
              <div className="text-[13px] text-[#73796F]">近用瞳距 (Near PD)</div>
              <div className="font-mono font-semibold mt-0.5">{selected.pdNearMm}</div>
            </div>
            <div>
              <div className="text-[13px] text-[#73796F]">验配门店</div>
              <div className="mt-0.5">{selected.storeName}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#E5E8E0] text-[15px]">
            <div className="text-[14px] font-semibold text-[#171916] mb-1">验光师临床建议与复查计划</div>
            <p className="text-[#5F645D]">{selected.recommendation}</p>
          </div>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`新建${pageTitle}记录`}
        maxWidthClass="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleAdd}>保存屈光检查记录</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px]">
          <div className="sm:col-span-2">
            <label className="block text-[14px] text-[#5F645D] mb-1">顾客姓名 *</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]" />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">右眼 OD 球镜 (D)</label>
            <input value={odSph} onChange={(e) => setOdSph(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4] font-mono" />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">左眼 OS 球镜 (D)</label>
            <input value={osSph} onChange={(e) => setOsSph(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4] font-mono" />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">右眼柱镜 / 轴位</label>
            <div className="flex gap-2">
              <input value={odCyl} onChange={(e) => setOdCyl(e.target.value)} className="w-1/2 h-10 px-2 rounded-[9px] border border-[#D9DDD4] font-mono" />
              <input value={odAxis} onChange={(e) => setOdAxis(e.target.value)} className="w-1/2 h-10 px-2 rounded-[9px] border border-[#D9DDD4] font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">左眼柱镜 / 轴位</label>
            <div className="flex gap-2">
              <input value={osCyl} onChange={(e) => setOsCyl(e.target.value)} className="w-1/2 h-10 px-2 rounded-[9px] border border-[#D9DDD4] font-mono" />
              <input value={osAxis} onChange={(e) => setOsAxis(e.target.value)} className="w-1/2 h-10 px-2 rounded-[9px] border border-[#D9DDD4] font-mono" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] text-[#5F645D] mb-1">远用瞳距 (PD)</label>
            <input value={pdFarMm} onChange={(e) => setPdFarMm(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4] font-mono" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] text-[#5F645D] mb-1">验光建议</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2.5 rounded-[9px] border border-[#D9DDD4]" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

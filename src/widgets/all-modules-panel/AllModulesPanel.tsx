import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, Lock, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  resolveVisibleTopModuleIds,
  useNavigation,
} from '@/src/modules/navigation/application/NavigationContext';
import { MENU_TREE } from '@/src/modules/navigation/domain/menuRegistry';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { ModuleIcon } from '@/src/widgets/top-navigation/ModuleIcon';

export const AllModulesPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const {
    allModulesOpen,
    setAllModulesOpen,
    activeModule,
    navigateToModule,
    pinnedModuleIds,
    draggingModuleId,
    setDraggingModuleId,
    resetPinnedModules,
  } = useNavigation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const visibleModuleIds = useMemo(
    () => MENU_TREE.filter((m) => hasPermission(m.permission)).map((m) => m.id),
    [hasPermission]
  );

  const currentTopIds = useMemo(
    () => resolveVisibleTopModuleIds(pinnedModuleIds, visibleModuleIds),
    [pinnedModuleIds, visibleModuleIds]
  );

  useEffect(() => {
    if (!allModulesOpen) {
      setSelectedCardId(null);
      return;
    }
    const t = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(t);
  }, [allModulesOpen]);

  if (!allModulesOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-[#171916]/14 backdrop-blur-[5px] flex items-start justify-center pt-[72px] px-4 pb-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-modules-heading"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setAllModulesOpen(false);
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-6xl qsl-glass-panel rounded-[24px] p-6 md:p-7 outline-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#171916]/[0.08]">
          <div className="flex items-center gap-2.5">
            <h2 id="all-modules-heading" className="text-[20px] font-semibold text-[#171916]">
              全部菜单
            </h2>
            <span className="text-[15px] text-[#5F645D]">18个业务模块</span>
            <HelpTooltip
              title="顶部菜单自定义说明"
              content={
                '按住任意已授权模块卡片，向上拖拽到顶部悬浮菜单栏的对应位置即可替换原有菜单项；顶部各模块之间也可直接互相拖动调整顺序。\n\n「工作台」为固定入口，不可移动或替换；点击卡片可直接打开该模块。'
              }
              ariaLabel="查看顶部菜单自定义说明"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetPinnedModules}
              className="h-9 px-3.5 rounded-full border border-[#D9DDD4] bg-[#F8F9F5] hover:border-[#171916] text-[13px] font-medium text-[#171916] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢复默认顺序</span>
            </button>
            <button
              type="button"
              onClick={() => setAllModulesOpen(false)}
              aria-label="关闭全部菜单面板"
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#5F645D] hover:text-[#171916] hover:bg-[#F1F2EE] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {MENU_TREE.map((mod) => {
            const isActive = activeModule?.id === mod.id;
            const allowed = hasPermission(mod.permission);
            const isPinnedTop = currentTopIds.includes(mod.id);
            const isSelected = selectedCardId === mod.id || draggingModuleId === mod.id;

            return (
              <div
                key={mod.id}
                role="button"
                tabIndex={0}
                draggable={allowed}
                onDragStart={(e) => {
                  if (!allowed) {
                    e.preventDefault();
                    return;
                  }
                  setSelectedCardId(mod.id);
                  setDraggingModuleId(mod.id);
                  e.dataTransfer.setData(
                    'application/x-qsl-nav',
                    JSON.stringify({ source: 'all-modules', moduleId: mod.id })
                  );
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggingModuleId(null);
                  setSelectedCardId(null);
                }}
                onClick={() => {
                  navigateToModule(mod.id);
                  setAllModulesOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateToModule(mod.id);
                    setAllModulesOpen(false);
                  }
                }}
                title={allowed ? '点击进入模块，或拖拽到顶部菜单栏替换' : '当前角色未授权此模块'}
                className={`group text-left p-3.5 rounded-2xl border transition-colors flex flex-col justify-between min-h-[96px] select-none focus-visible:outline-2 focus-visible:outline-[#171916] ${
                  allowed ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'bg-[#ECF9A8]/85 border-[#171916] ring-2 ring-[#D7FF00]'
                    : isActive
                      ? 'bg-[#ECF9A8]/80 border-[#171916]'
                      : allowed
                        ? 'bg-white/42 border-[#171916]/[0.08] hover:bg-white/75 hover:border-[#171916]/45'
                        : 'bg-white/25 border-[#171916]/[0.06] opacity-65 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`w-8 h-8 rounded-xl inline-flex items-center justify-center ${
                      isActive || isSelected
                        ? 'bg-[#171916] text-[#D7FF00]'
                        : 'bg-white border border-[#E5E8E0] text-[#171916]'
                    }`}
                  >
                    <ModuleIcon name={mod.icon} className="w-4 h-4" />
                  </span>
                  <div className="flex items-center gap-1">
                    {isPinnedTop && (
                      <span className="text-[12px] px-1.5 py-0.5 rounded bg-[#171916]/8 text-[#171916] font-medium">
                        顶部
                      </span>
                    )}
                    {allowed && (
                      <GripVertical
                        className="w-4 h-4 text-[#A8B0A0] group-hover:text-[#5F645D]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-1">
                  <span className="text-[16px] font-bold text-[#171916] leading-snug">
                    {mod.label}
                  </span>
                  {!allowed && <Lock className="w-3.5 h-3.5 text-[#73796F] shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useId, useRef, useState } from 'react';

interface HelpTooltipProps {
  content: React.ReactNode;
  title?: string;
  tone?: 'neutral' | 'warning';
  placement?: 'bottom-start' | 'bottom-end' | 'bottom-center';
  ariaLabel?: string;
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  title,
  tone = 'neutral',
  placement = 'bottom-start',
  ariaLabel = '查看说明',
  className = '',
}) => {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const open = hovered || pinned;

  useEffect(() => {
    if (!pinned) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setPinned(false);
        setHovered(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinned(false);
        setHovered(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pinned]);

  const placementClass =
    placement === 'bottom-end'
      ? 'right-0'
      : placement === 'bottom-center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-0';

  const buttonToneClass = pinned
    ? tone === 'warning'
      ? 'bg-[#B45309] border-[#B45309] text-white'
      : 'bg-[#171916] border-[#171916] text-[#D7FF00]'
    : tone === 'warning'
      ? 'bg-[#FEF7EC] border-[#F59E0B] text-[#B45309] hover:bg-[#FDE68A]/60'
      : 'bg-white border-[#C8CEC0] text-[#5F645D] hover:border-[#171916] hover:text-[#171916]';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center shrink-0 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setPinned(true);
        }}
        className={`w-[22px] h-[22px] rounded-full border inline-flex items-center justify-center text-[13px] font-bold leading-none transition-colors cursor-pointer select-none ${buttonToneClass}`}
      >
        ?
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute top-full pt-2 z-50 ${placementClass}`}
        >
          <div className="w-72 sm:w-80 rounded-2xl qsl-glass-popover p-4 text-left text-[14px] leading-relaxed text-[#5F645D]">
            {title && (
              <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-[#171916]/[0.08]">
                <span
                  className={`font-bold text-[14px] ${
                    tone === 'warning' ? 'text-[#B45309]' : 'text-[#171916]'
                  }`}
                >
                  {title}
                </span>
                {pinned && (
                  <span className="text-[12px] text-[#73796F]">点击空白处关闭</span>
                )}
              </div>
            )}
            <div className="text-[#5F645D] whitespace-pre-line">{content}</div>
            {!title && pinned && (
              <div className="mt-2 pt-1.5 border-t border-[#E5E8E0] text-[12px] text-[#73796F]">
                点击页面空白处关闭
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

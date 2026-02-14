'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
};

export default function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;
      let arrowTop = 0;
      let arrowLeft = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          arrowTop = tooltipRect.height;
          arrowLeft = triggerRect.left + triggerRect.width / 2 - left;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          arrowTop = -8;
          arrowLeft = triggerRect.left + triggerRect.width / 2 - left;
          break;
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          arrowTop = triggerRect.top + triggerRect.height / 2 - top;
          arrowLeft = tooltipRect.width;
          break;
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + 8;
          arrowTop = triggerRect.top + triggerRect.height / 2 - top;
          arrowLeft = -8;
          break;
      }

      // 画面からはみ出さないように調整
      const padding = 8;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setTooltipStyle({
        top: `${top}px`,
        left: `${left}px`,
      });

      // 矢印の位置を再計算（調整後の位置に基づく）
      switch (position) {
        case 'top':
          arrowLeft = triggerRect.left + triggerRect.width / 2 - left;
          break;
        case 'bottom':
          arrowLeft = triggerRect.left + triggerRect.width / 2 - left;
          break;
        case 'left':
          arrowTop = triggerRect.top + triggerRect.height / 2 - top;
          break;
        case 'right':
          arrowTop = triggerRect.top + triggerRect.height / 2 - top;
          break;
      }

      setArrowStyle({
        top: position === 'top' ? '100%' : position === 'bottom' ? '-8px' : `${arrowTop}px`,
        left: position === 'left' ? '100%' : position === 'right' ? '-8px' : `${arrowLeft}px`,
        transform: position === 'top' || position === 'bottom' 
          ? 'translateX(-50%)' 
          : 'translateY(-50%)',
      });
    }
  }, [isVisible, position]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-block ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[100] whitespace-normal pointer-events-none"
          style={tooltipStyle}
          role="tooltip"
        >
          <div className="relative max-w-sm min-w-[280px] rounded-lg bg-gray-800 px-4 py-3 text-sm text-white shadow-2xl">
            {content}
            <div
              className="absolute border-4 border-transparent"
              style={{
                ...arrowStyle,
                [position === 'top' ? 'borderTopColor' : position === 'bottom' ? 'borderBottomColor' : position === 'left' ? 'borderLeftColor' : 'borderRightColor']: '#1f2937',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

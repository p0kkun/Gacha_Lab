import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxHeight?: string;
  scrollable?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  padding = 'md',
  maxHeight,
  scrollable = false,
}: CardProps) {
  const contentClasses = scrollable
    ? `${paddingStyles[padding]} overflow-y-auto ${maxHeight ? '' : 'max-h-[calc(100vh-300px)]'}`
    : paddingStyles[padding];

  const style = maxHeight && scrollable ? { maxHeight } : undefined;

  return (
    <div className={`rounded-xl bg-white shadow-sm border border-gray-200 ${scrollable ? 'flex flex-col' : ''} ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`${contentClasses} ${scrollable ? 'flex-1 min-h-0' : ''}`} style={style}>
        {children}
      </div>
    </div>
  );
}


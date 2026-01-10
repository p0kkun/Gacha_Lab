import { ReactNode } from 'react';

interface TableProps {
  headers: Array<{ key: string; label: string; align?: 'left' | 'center' | 'right' }>;
  data: Array<Record<string, ReactNode>>;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: Record<string, ReactNode>, index: number) => void;
}

export default function Table({ headers, data, emptyMessage = 'データがありません', className = '', onRowClick }: TableProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key}
                  className={`
                    px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500
                    ${header.align === 'center' ? 'text-center' : header.align === 'right' ? 'text-right' : 'text-left'}
                  `}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-8 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row, index)}
                  className={onRowClick ? 'cursor-pointer transition-colors hover:bg-gray-50' : ''}
                >
                  {headers.map((header) => (
                    <td
                      key={header.key}
                      className={`
                        whitespace-nowrap px-6 py-4 text-sm text-gray-900
                        ${header.align === 'center' ? 'text-center' : header.align === 'right' ? 'text-right' : 'text-left'}
                      `}
                    >
                      {row[header.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}





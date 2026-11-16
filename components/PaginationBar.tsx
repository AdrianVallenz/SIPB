'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaginationWindow } from '@/lib/format';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  pageSizes?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  variant?: 'card' | 'border-top';
}

export default function PaginationBar({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  itemLabel,
  pageSizes = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  variant = 'border-top',
}: PaginationBarProps) {
  if (totalItems <= 0) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, totalItems);
  const windowPages = getPaginationWindow(safePage, totalPages);

  return (
    <div
      className={variant === 'card' ? 'sip-card no-print' : 'no-print'}
      style={{
        padding: '12px 18px',
        ...(variant === 'border-top' ? { borderTop: '1px solid var(--border-color)' } : {}),
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Menampilkan{' '}
          <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {startIdx}&ndash;{endIdx}
          </strong>{' '}
          dari{' '}
          <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {totalItems}
          </strong>{' '}
          {itemLabel}
        </span>

        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="sip-select font-mono"
          style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '12px', minHeight: '32px' }}
          aria-label={`Jumlah ${itemLabel} per halaman`}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size} / halaman
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px', minHeight: '32px' }}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={14} />
          <span className="hide-xs">Sebelumnya</span>
        </button>

        {windowPages.map((item, idx) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="font-mono"
              style={{
                padding: '0 4px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                userSelect: 'none',
              }}
            >
              &hellip;
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`btn btn-sm font-mono ${
                item === safePage ? 'btn-primary' : 'btn-secondary'
              }`}
              style={{ minWidth: '32px', minHeight: '32px', padding: '0 8px' }}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px', minHeight: '32px' }}
          aria-label="Halaman berikutnya"
        >
          <span className="hide-xs">Berikutnya</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

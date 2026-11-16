'use client';

import React from 'react';
import { Package } from 'lucide-react';

/** Centered loading placeholder displayed while client session or route transitions settle. */
export default function RouteLoadingScreen({
  message = 'Memuat SIP Barang...',
}: {
  message?: string;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="brand-emblem">
        <Package size={18} />
      </div>
      <div className="font-mono" style={{ fontSize: '12px', letterSpacing: '0.04em' }}>
        {message}
      </div>
    </div>
  );
}

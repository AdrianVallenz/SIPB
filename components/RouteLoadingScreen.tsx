'use client';

import React from 'react';
import { Package, WifiOff, RefreshCw, LogIn } from 'lucide-react';

/** Centered loading or cloud-connection error screen displayed during route transitions. */
export default function RouteLoadingScreen({
  message = 'Memuat SIP Barang...',
  error,
  onRetry,
  onSecondaryAction,
  secondaryLabel = 'Buka Halaman Masuk',
}: {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
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
        padding: '20px',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}
    >
      {error ? (
        <div
          className="sip-card"
          style={{
            maxWidth: '420px',
            width: '100%',
            padding: '24px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-red-bg)',
              color: 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <WifiOff size={20} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Koneksi Server Cloud Diperlukan
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '18px' }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn btn-primary btn-sm">
                <RefreshCw size={14} />
                <span>Coba Hubungkan Ulang</span>
              </button>
            )}
            {onSecondaryAction && (
              <button type="button" onClick={onSecondaryAction} className="btn btn-secondary btn-sm">
                <LogIn size={14} />
                <span>{secondaryLabel}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="brand-emblem">
            <Package size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '12px', letterSpacing: '0.04em' }}>
            {message}
          </div>
        </>
      )}
    </div>
  );
}

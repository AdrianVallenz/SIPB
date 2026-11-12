export function formatRupiah(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `Rp ${safeAmount.toLocaleString('id-ID')}`;
}

export function getLocalDateKey(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(isoString: string, includeSeconds = false): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
  });
}

export function generateInvoiceNo(ownerId: string = ''): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const cleanOwner = ownerId.replace(/-/g, '').slice(0, 3).toUpperCase() || 'SIP';
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
  return `TRX-${dateStr}-${cleanOwner}${randomSuffix}`;
}


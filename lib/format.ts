const idNumberFormatter = new Intl.NumberFormat('id-ID');

const idDateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const idDateTimeSecondsFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatRupiah(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `Rp ${idNumberFormatter.format(safeAmount)}`;
}

export function formatNumberDots(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return idNumberFormatter.format(Math.round(amount));
}

export function parseNumberInput(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function getLocalDateKey(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const time = d.getTime();
  if (Number.isNaN(time)) return '';
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

export function formatDateTime(isoString: string, includeSeconds = false): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return includeSeconds ? idDateTimeSecondsFormatter.format(d) : idDateTimeFormatter.format(d);
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

export function calcMarginPct(sellPrice: number, buyPrice: number): number {
  if (!Number.isFinite(sellPrice) || sellPrice <= 0) return 0;
  return Math.round(((sellPrice - buyPrice) / sellPrice) * 100);
}

export function sanitizeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  const safePrefix = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safePrefix.replace(/"/g, '""')}"`;
}



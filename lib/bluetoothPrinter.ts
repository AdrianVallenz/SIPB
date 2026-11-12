import { Transaction } from './types';
import { formatDateTime, formatRupiah } from './format';

export type ThermalPaperWidth = '58mm' | '80mm';

export interface PrinterSettings {
  paperWidth: ThermalPaperWidth;
  autoPrintOnSale: boolean;
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  lastDeviceName: string;
}

export type PrinterConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'printing';

export interface PrinterRuntimeState {
  status: PrinterConnectionStatus;
  deviceName: string | null;
  lastError: string | null;
  lastPrintedAt: string | null;
}

interface BluetoothCharacteristicPropertiesLike {
  write?: boolean;
  writeWithoutResponse?: boolean;
}

interface BluetoothRemoteGATTCharacteristicLike {
  uuid: string;
  properties: BluetoothCharacteristicPropertiesLike;
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValue?: (value: BufferSource) => Promise<void>;
}

interface BluetoothRemoteGATTServiceLike {
  uuid: string;
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristicLike[]>;
}

interface BluetoothRemoteGATTServerLike {
  connected: boolean;
  connect: () => Promise<BluetoothRemoteGATTServerLike>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BluetoothRemoteGATTServiceLike[]>;
}

interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServerLike;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface BluetoothNavigatorLike {
  requestDevice: (options: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }) => Promise<BluetoothDeviceLike>;
  getDevices?: () => Promise<BluetoothDeviceLike[]>;
}

const PRINTER_SETTINGS_KEY = 'sip_printer_settings_v1';

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  paperWidth: '58mm',
  autoPrintOnSale: false,
  storeName: 'SIP BARANG',
  storeTagline: 'Sistem Operasional & Kasir Terpadu',
  storeAddress: 'Jl. Jenderal Sudirman Kav. 24, Jakarta',
  storePhone: '(021) 555-8899 • sipb.web.id',
  receiptFooter: 'Terima Kasih Atas Kunjungan Anda',
  lastDeviceName: '',
};

// Common BLE GATT service UUIDs used by 58mm/80mm portable thermal printers
// (Xprinter, Zjiang, Eppos, Blueprint, Panda, RPP02N, MPT-II, Iware, Gprinter, Sunmi)
const THERMAL_OPTIONAL_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb',
];

const PREFERRED_WRITE_UUIDS = new Set([
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
]);

let runtimeState: PrinterRuntimeState = {
  status: 'disconnected',
  deviceName: null,
  lastError: null,
  lastPrintedAt: null,
};

let activeDevice: BluetoothDeviceLike | null = null;
let activeCharacteristic: BluetoothRemoteGATTCharacteristicLike | null = null;
let disconnectListener: (() => void) | null = null;
let isPrintingLocked = false;

const runtimeListeners = new Set<(state: PrinterRuntimeState) => void>();
const settingsListeners = new Set<(settings: PrinterSettings) => void>();

function emitRuntimeState(patch: Partial<PrinterRuntimeState>) {
  runtimeState = { ...runtimeState, ...patch };
  runtimeListeners.forEach((cb) => cb(runtimeState));
}

export function getPrinterRuntimeState(): PrinterRuntimeState {
  return runtimeState;
}

export function subscribePrinterRuntime(listener: (state: PrinterRuntimeState) => void): () => void {
  runtimeListeners.add(listener);
  listener(runtimeState);
  return () => {
    runtimeListeners.delete(listener);
  };
}

export function getPrinterSettings(): PrinterSettings {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(PRINTER_SETTINGS_KEY);
    if (!raw) return DEFAULT_PRINTER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PrinterSettings>;
    return {
      ...DEFAULT_PRINTER_SETTINGS,
      ...parsed,
      paperWidth: parsed.paperWidth === '80mm' ? '80mm' : '58mm',
    };
  } catch {
    return DEFAULT_PRINTER_SETTINGS;
  }
}

export function savePrinterSettings(patch: Partial<PrinterSettings>): PrinterSettings {
  const next: PrinterSettings = {
    ...getPrinterSettings(),
    ...patch,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  }
  settingsListeners.forEach((cb) => cb(next));
  return next;
}

export function subscribePrinterSettings(listener: (settings: PrinterSettings) => void): () => void {
  settingsListeners.add(listener);
  listener(getPrinterSettings());
  return () => {
    settingsListeners.delete(listener);
  };
}

function getNavigatorBluetooth(): BluetoothNavigatorLike | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as { bluetooth?: BluetoothNavigatorLike };
  return nav.bluetooth ?? null;
}

export function getBluetoothSupportInfo(): {
  supported: boolean;
  isSecureContext: boolean;
  reason?: string;
} {
  if (typeof window === 'undefined') {
    return { supported: false, isSecureContext: false, reason: 'Hanya tersedia di browser.' };
  }

  const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
  if (!isSecure) {
    return {
      supported: false,
      isSecureContext: false,
      reason: 'Koneksi Bluetooth Thermal wajib dibuka melalui HTTPS.',
    };
  }

  const bt = getNavigatorBluetooth();
  if (!bt) {
    return {
      supported: false,
      isSecureContext: true,
      reason:
        'Browser ini belum mendukung Web Bluetooth (misalnya Safari iOS). Gunakan Google Chrome / Edge di Android atau Laptop, atau gunakan tombol Cetak Browser / PDF.',
    };
  }

  return { supported: true, isSecureContext: true };
}

async function resolveWriteCharacteristic(
  device: BluetoothDeviceLike
): Promise<BluetoothRemoteGATTCharacteristicLike> {
  if (!device.gatt) {
    throw new Error('Perangkat Bluetooth ini tidak mendukung layanan GATT BLE.');
  }

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const services = await server.getPrimaryServices();
  if (!services || services.length === 0) {
    throw new Error('Printer tidak mempublikasikan layanan cetak BLE (GATT).');
  }

  let fallbackChar: BluetoothRemoteGATTCharacteristicLike | null = null;

  for (const service of services) {
    let chars: BluetoothRemoteGATTCharacteristicLike[] = [];
    try {
      chars = await service.getCharacteristics();
    } catch {
      continue;
    }

    for (const char of chars) {
      const canWrite = Boolean(char.properties?.writeWithoutResponse || char.properties?.write);
      if (!canWrite) continue;

      if (PREFERRED_WRITE_UUIDS.has(char.uuid.toLowerCase())) {
        return char;
      }

      if (!fallbackChar || (char.properties?.writeWithoutResponse && !fallbackChar.properties?.writeWithoutResponse)) {
        fallbackChar = char;
      }
    }
  }

  if (!fallbackChar) {
    throw new Error(
      'Karakteristik tulis printer thermal tidak ditemukan. Pastikan printer mendukung Bluetooth BLE (bukan Bluetooth Classic SPP saja).'
    );
  }

  return fallbackChar;
}

function attachDeviceDisconnectHandler(device: BluetoothDeviceLike) {
  if (activeDevice && disconnectListener && activeDevice.removeEventListener) {
    activeDevice.removeEventListener('gattserverdisconnected', disconnectListener);
  }

  disconnectListener = () => {
    activeCharacteristic = null;
    emitRuntimeState({
      status: 'disconnected',
      deviceName: device.name || 'Printer Thermal',
      lastError: null,
    });
  };

  device.addEventListener('gattserverdisconnected', disconnectListener);
}

export async function connectBluetoothPrinter(): Promise<{
  success: boolean;
  deviceName?: string;
  error?: string;
}> {
  const support = getBluetoothSupportInfo();
  if (!support.supported) {
    const err = support.reason || 'Web Bluetooth tidak didukung di browser ini.';
    emitRuntimeState({ lastError: err });
    return { success: false, error: err };
  }

  const bt = getNavigatorBluetooth();
  if (!bt) {
    return { success: false, error: 'Web Bluetooth API tidak tersedia.' };
  }

  emitRuntimeState({ status: 'connecting', lastError: null });

  try {
    const device = await bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: THERMAL_OPTIONAL_SERVICES,
    });

    const writeChar = await resolveWriteCharacteristic(device).catch((err) => {
      try {
        if (device.gatt?.connected) device.gatt.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    });
    activeDevice = device;
    activeCharacteristic = writeChar;
    attachDeviceDisconnectHandler(device);

    const resolvedName = device.name || 'Printer Thermal BLE';
    savePrinterSettings({ lastDeviceName: resolvedName });

    emitRuntimeState({
      status: 'connected',
      deviceName: resolvedName,
      lastError: null,
    });

    return { success: true, deviceName: resolvedName };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === 'NotFoundError'
          ? 'Pemilihan printer dibatalkan atau printer Bluetooth belum dinyalakan.'
          : err.message
        : 'Gagal menghubungkan ke printer Bluetooth.';

    emitRuntimeState({
      status: activeDevice?.gatt?.connected ? 'connected' : 'disconnected',
      lastError: message,
    });

    return { success: false, error: message };
  }
}

export async function reconnectSavedPrinter(): Promise<boolean> {
  if (activeDevice?.gatt?.connected && activeCharacteristic) {
    return true;
  }

  const bt = getNavigatorBluetooth();
  if (!bt?.getDevices) return false;

  try {
    const devices = await bt.getDevices();
    if (!devices || devices.length === 0) return false;

    const savedName = getPrinterSettings().lastDeviceName;
    const candidate =
      (savedName ? devices.find((d) => d.name === savedName) : undefined) || devices[0];

    if (!candidate) return false;

    const writeChar = await resolveWriteCharacteristic(candidate);
    activeDevice = candidate;
    activeCharacteristic = writeChar;
    attachDeviceDisconnectHandler(candidate);

    emitRuntimeState({
      status: 'connected',
      deviceName: candidate.name || savedName || 'Printer Thermal BLE',
      lastError: null,
    });
    return true;
  } catch {
    return false;
  }
}

export function disconnectBluetoothPrinter(): void {
  try {
    if (activeDevice?.gatt?.connected) {
      activeDevice.gatt.disconnect();
    }
  } catch {
    // Ignore disconnect errors
  }
  activeCharacteristic = null;
  activeDevice = null;
  emitRuntimeState({
    status: 'disconnected',
    deviceName: null,
    lastError: null,
  });
}

async function ensureConnectedCharacteristic(autoPrompt: boolean): Promise<BluetoothRemoteGATTCharacteristicLike> {
  if (activeDevice?.gatt?.connected && activeCharacteristic) {
    return activeCharacteristic;
  }

  if (activeDevice) {
    try {
      const char = await resolveWriteCharacteristic(activeDevice);
      activeCharacteristic = char;
      emitRuntimeState({
        status: 'connected',
        deviceName: activeDevice.name || 'Printer Thermal BLE',
        lastError: null,
      });
      return char;
    } catch {
      // Fall through to getDevices / requestDevice
    }
  }

  const reconnected = await reconnectSavedPrinter();
  if (reconnected && activeCharacteristic) {
    return activeCharacteristic;
  }

  if (autoPrompt) {
    const res = await connectBluetoothPrinter();
    if (res.success && activeCharacteristic) {
      return activeCharacteristic;
    }
    throw new Error(res.error || 'Printer Bluetooth belum terhubung.');
  }

  throw new Error('Printer Bluetooth belum terhubung.');
}

async function writeChunkedBytes(
  characteristic: BluetoothRemoteGATTCharacteristicLike,
  payload: Uint8Array
): Promise<void> {
  // 20 bytes per BLE write guarantees compatibility even on strict Android MTU limits
  const chunkSize = 20;
  for (let offset = 0; offset < payload.length; offset += chunkSize) {
    const chunk = payload.slice(offset, offset + chunkSize);
    if (characteristic.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else if (characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(chunk);
    } else if (characteristic.writeValue) {
      await characteristic.writeValue(chunk);
    } else {
      throw new Error('Method tulis BLE tidak didukung oleh browser.');
    }
    await new Promise((resolve) => setTimeout(resolve, 14));
  }
}

// ---------- ESC/POS Formatting Helpers ----------

function sanitizeThermalText(input: string): string {
  return input
    .replace(/[•·]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n]/g, '');
}

function encodeAscii(str: string): number[] {
  const clean = sanitizeThermalText(str);
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    out.push(clean.charCodeAt(i) & 0x7f);
  }
  return out;
}

function wrapTextLines(text: string, width: number): string[] {
  const clean = sanitizeThermalText(text).trim();
  if (!clean) return [''];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
      }
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word;
    } else {
      lines.push(current);
      if (word.length <= width) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += width) {
          const piece = word.slice(i, i + width);
          if (i + width < word.length) lines.push(piece);
          else current = piece;
        }
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function padColumns(left: string, right: string, width: number): string {
  const cleanLeft = sanitizeThermalText(left);
  const cleanRight = sanitizeThermalText(right);
  const minGap = 1;
  const maxLeft = Math.max(4, width - cleanRight.length - minGap);
  const clippedLeft = cleanLeft.length > maxLeft ? cleanLeft.slice(0, maxLeft - 1) + '.' : cleanLeft;
  const spaces = Math.max(minGap, width - clippedLeft.length - cleanRight.length);
  return clippedLeft + ' '.repeat(spaces) + cleanRight;
}

class EscPosBuilder {
  private bytes: number[] = [];

  init() {
    this.bytes.push(0x1b, 0x40); // ESC @ Initialize
    return this;
  }

  align(mode: 'left' | 'center' | 'right') {
    const val = mode === 'center' ? 1 : mode === 'right' ? 2 : 0;
    this.bytes.push(0x1b, 0x61, val); // ESC a n
    return this;
  }

  bold(enabled: boolean) {
    this.bytes.push(0x1b, 0x45, enabled ? 1 : 0); // ESC E n
    return this;
  }

  size(mode: 'normal' | 'tall' | 'large') {
    const val = mode === 'large' ? 0x11 : mode === 'tall' ? 0x01 : 0x00;
    this.bytes.push(0x1d, 0x21, val); // GS ! n
    return this;
  }

  line(text = '') {
    this.bytes.push(...encodeAscii(text), 0x0a);
    return this;
  }

  divider(width: number, char = '-') {
    return this.line(char.repeat(width));
  }

  feed(lines = 3) {
    this.bytes.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  partialCut() {
    this.bytes.push(0x1d, 0x56, 0x42, 0x00); // GS V 66 0 (ignored safely if printer has no autocutter)
    return this;
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

export function buildEscPosReceipt(trx: Transaction, settings: PrinterSettings): Uint8Array {
  const cols = settings.paperWidth === '80mm' ? 48 : 32;
  const builder = new EscPosBuilder();

  builder.init();

  // Header
  builder.align('center').bold(true).size('large');
  wrapTextLines(settings.storeName || 'SIP BARANG', Math.floor(cols / 2)).forEach((l) => builder.line(l));
  builder.size('normal').bold(false);
  if (settings.storeTagline) {
    wrapTextLines(settings.storeTagline, cols).forEach((l) => builder.line(l));
  }
  if (settings.storeAddress) {
    wrapTextLines(settings.storeAddress, cols).forEach((l) => builder.line(l));
  }
  if (settings.storePhone) {
    wrapTextLines(settings.storePhone, cols).forEach((l) => builder.line(l));
  }

  builder.align('left').divider(cols);

  // Meta Info
  builder.line(padColumns('No. Nota', trx.invoiceNo, cols));
  builder.line(padColumns('Waktu', formatDateTime(trx.createdAt, true), cols));
  builder.line(padColumns('Kasir', trx.cashierName, cols));
  builder.line(padColumns('Metode', trx.paymentMethod, cols));

  if (trx.status === 'VOIDED') {
    builder.bold(true).align('center').line('*** STATUS: DIBATALKAN (VOID) ***').bold(false).align('left');
  }

  builder.divider(cols);
  builder.bold(true).line(padColumns('RINCIAN BARANG', 'SUBTOTAL', cols)).bold(false);

  // Items
  for (const item of trx.items) {
    const nameLines = wrapTextLines(item.name, cols);
    nameLines.forEach((l) => builder.line(l));
    const qtyPrice = `  ${item.quantity} x ${formatRupiah(item.price)}`;
    const subStr = formatRupiah(item.subtotal);
    builder.line(padColumns(qtyPrice, subStr, cols));
  }

  builder.divider(cols);

  // Totals
  builder.line(padColumns('Subtotal', formatRupiah(trx.subtotal), cols));
  if (trx.discount > 0) {
    builder.line(padColumns('Diskon', `- ${formatRupiah(trx.discount)}`, cols));
  }
  builder.bold(true).size('tall').line(padColumns('TOTAL BAYAR', formatRupiah(trx.total), cols)).size('normal').bold(false);
  builder.line(padColumns(`Bayar (${trx.paymentMethod})`, formatRupiah(trx.amountPaid), cols));
  builder.line(padColumns('Kembalian', formatRupiah(trx.change), cols));

  builder.divider(cols);

  // Footer
  builder.align('center');
  builder.line(`*${trx.invoiceNo}*`);
  if (settings.receiptFooter) {
    wrapTextLines(settings.receiptFooter, cols).forEach((l) => builder.line(l));
  }
  builder.line('Simpan struk sebagai bukti sah.');
  builder.feed(4).partialCut();

  return builder.toUint8Array();
}

export function buildEscPosTestReceipt(settings: PrinterSettings): Uint8Array {
  const cols = settings.paperWidth === '80mm' ? 48 : 32;
  const builder = new EscPosBuilder();

  builder
    .init()
    .align('center')
    .bold(true)
    .size('large')
    .line(settings.storeName || 'SIP BARANG')
    .size('normal')
    .bold(false)
    .line('TES CETAK PRINTER BLUETOOTH')
    .align('left')
    .divider(cols)
    .line(padColumns('Lebar Kertas', `${settings.paperWidth} (${cols} kol)`, cols))
    .line(padColumns('Printer', settings.lastDeviceName || 'Thermal BLE', cols))
    .line(padColumns('Waktu Tes', formatDateTime(new Date().toISOString(), true), cols))
    .divider(cols)
    .align('center')
    .bold(true)
    .line('KONEKSI BERHASIL!')
    .bold(false)
    .line('Struk transaksi siap dicetak.')
    .feed(4)
    .partialCut();

  return builder.toUint8Array();
}

export async function printTransactionViaBluetooth(
  transaction: Transaction,
  autoPromptIfDisconnected = true
): Promise<{ success: boolean; error?: string }> {
  if (isPrintingLocked) {
    return {
      success: false,
      error: 'Proses cetak Bluetooth lain sedang berjalan. Tunggu beberapa detik lalu coba lagi.',
    };
  }
  isPrintingLocked = true;
  try {
    const char = await ensureConnectedCharacteristic(autoPromptIfDisconnected);
    const settings = getPrinterSettings();
    emitRuntimeState({ status: 'printing', lastError: null });

    const payload = buildEscPosReceipt(transaction, settings);
    await writeChunkedBytes(char, payload);

    emitRuntimeState({
      status: 'connected',
      lastPrintedAt: new Date().toISOString(),
      lastError: null,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal mencetak struk ke printer Bluetooth.';
    emitRuntimeState({
      status: activeDevice?.gatt?.connected ? 'connected' : 'disconnected',
      lastError: msg,
    });
    return { success: false, error: msg };
  } finally {
    isPrintingLocked = false;
  }
}

export async function printTestThermalReceipt(): Promise<{ success: boolean; error?: string }> {
  if (isPrintingLocked) {
    return {
      success: false,
      error: 'Proses cetak Bluetooth lain sedang berjalan. Tunggu beberapa detik lalu coba lagi.',
    };
  }
  isPrintingLocked = true;
  try {
    const char = await ensureConnectedCharacteristic(true);
    const settings = getPrinterSettings();
    emitRuntimeState({ status: 'printing', lastError: null });

    const payload = buildEscPosTestReceipt(settings);
    await writeChunkedBytes(char, payload);

    emitRuntimeState({
      status: 'connected',
      lastPrintedAt: new Date().toISOString(),
      lastError: null,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal melakukan tes cetak Bluetooth.';
    emitRuntimeState({
      status: activeDevice?.gatt?.connected ? 'connected' : 'disconnected',
      lastError: msg,
    });
    return { success: false, error: msg };
  } finally {
    isPrintingLocked = false;
  }
}


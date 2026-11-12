import QRCode from 'qrcode';
import jsQR from 'jsqr';

interface TlvField {
  tag: string;
  value: string;
}

export interface ParsedQrisInfo {
  valid: boolean;
  error?: string;
  cleanedPayload: string;
  merchantName: string;
  merchantCity: string;
  nmid: string;
  isDynamic: boolean;
}

/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) as required by EMVCo / QRIS tag 63.
 */
export function computeCrc16Ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseTlv(payload: string): TlvField[] | null {
  const fields: TlvField[] = [];
  let idx = 0;
  while (idx < payload.length) {
    if (idx + 4 > payload.length) return null;
    const tag = payload.slice(idx, idx + 2);
    const lenStr = payload.slice(idx + 2, idx + 4);
    if (!/^\d{2}$/.test(lenStr)) return null;
    const len = parseInt(lenStr, 10);
    const valueStart = idx + 4;
    const valueEnd = valueStart + len;
    if (valueEnd > payload.length) return null;
    fields.push({ tag, value: payload.slice(valueStart, valueEnd) });
    idx = valueEnd;
  }
  return fields;
}

function encodeTlv(fields: TlvField[]): string {
  return fields
    .map((f) => `${f.tag}${String(f.value.length).padStart(2, '0')}${f.value}`)
    .join('');
}

function extractNmid(fields: TlvField[]): string {
  for (const field of fields) {
    const tagNum = parseInt(field.tag, 10);
    if (tagNum >= 26 && tagNum <= 51) {
      const subFields = parseTlv(field.value);
      if (subFields) {
        // Tag 51 subtag 02 is typically NMID in standard Indonesian QRIS
        const sub02 = subFields.find((s) => s.tag === '02' && /^ID\d+/i.test(s.value));
        if (sub02) return sub02.value.toUpperCase();
        for (const sf of subFields) {
          const match = sf.value.match(/(ID\d{8,20})/i);
          if (match) return match[1].toUpperCase();
        }
      }
      const rawMatch = field.value.match(/(ID\d{8,20})/i);
      if (rawMatch) return rawMatch[1].toUpperCase();
    }
  }
  return '';
}

export function parseAndValidateQris(rawInput: string): ParsedQrisInfo {
  const cleanedPayload = rawInput.trim().replace(/[\r\n]+/g, '');
  if (!cleanedPayload) {
    return {
      valid: false,
      error: 'Kode QRIS kosong.',
      cleanedPayload: '',
      merchantName: '',
      merchantCity: '',
      nmid: '',
      isDynamic: false,
    };
  }

  if (!cleanedPayload.startsWith('000201')) {
    return {
      valid: false,
      error: 'Format harus diawali standar EMVCo QRIS (000201...).',
      cleanedPayload,
      merchantName: '',
      merchantCity: '',
      nmid: '',
      isDynamic: false,
    };
  }

  const fields = parseTlv(cleanedPayload);
  if (!fields || fields.length < 4) {
    return {
      valid: false,
      error: 'Struktur TLV QRIS tidak valid atau terpotong.',
      cleanedPayload,
      merchantName: '',
      merchantCity: '',
      nmid: '',
      isDynamic: false,
    };
  }

  const crcField = fields[fields.length - 1];
  if (crcField.tag === '63') {
    if (crcField.value.length !== 4) {
      return {
        valid: false,
        error: 'Panjang checksum CRC (tag 63) harus 4 karakter.',
        cleanedPayload,
        merchantName: '',
        merchantCity: '',
        nmid: '',
        isDynamic: false,
      };
    }
    const payloadUpToCrcTag = cleanedPayload.slice(0, cleanedPayload.length - 4);
    const expectedCrc = computeCrc16Ccitt(payloadUpToCrcTag);
    if (expectedCrc !== crcField.value.toUpperCase()) {
      return {
        valid: false,
        error: `Checksum CRC QRIS tidak cocok (terbaca ${crcField.value}, seharusnya ${expectedCrc}).`,
        cleanedPayload,
        merchantName: '',
        merchantCity: '',
        nmid: '',
        isDynamic: false,
      };
    }
  }

  const hasCurrencyOrCountry = fields.some((f) => f.tag === '53' || f.tag === '58');
  if (!hasCurrencyOrCountry) {
    return {
      valid: false,
      error: 'Kode QR ini bukan QRIS pembayaran yang valid.',
      cleanedPayload,
      merchantName: '',
      merchantCity: '',
      nmid: '',
      isDynamic: false,
    };
  }

  const merchantName = fields.find((f) => f.tag === '59')?.value.trim() || '';
  const merchantCity = fields.find((f) => f.tag === '60')?.value.trim() || '';
  const isDynamic = fields.find((f) => f.tag === '01')?.value === '12';
  const nmid = extractNmid(fields);

  return {
    valid: true,
    cleanedPayload,
    merchantName,
    merchantCity,
    nmid,
    isDynamic,
  };
}

/**
 * Converts a static merchant QRIS payload into a dynamic EMVCo QRIS payload
 * with exact transaction amount injected into Tag 54, optional invoice/bill number
 * injected into Tag 62 Subtag 01, and recomputed CRC-16 Tag 63.
 */
export function buildDynamicQrisPayload(
  basePayload: string,
  amount: number,
  includeAmount: boolean = true,
  billNumber?: string
): string {
  const cleaned = basePayload.trim().replace(/[\r\n]+/g, '');
  const fields = parseTlv(cleaned);
  if (!fields) return cleaned;

  const withoutCrc = fields.filter((f) => f.tag !== '63');
  const cleanBill = (billNumber || '')
    .trim()
    .replace(/[^A-Za-z0-9\-]/g, '')
    .slice(0, 25);

  if (!includeAmount && !cleanBill) {
    const rawNoCrc = encodeTlv(withoutCrc) + '6304';
    return `${rawNoCrc}${computeCrc16Ccitt(rawNoCrc)}`;
  }

  const normalizedAmount =
    includeAmount && amount > 0 ? String(Math.max(1, Math.round(amount))) : '';
  const updated: TlvField[] = [];
  let insertedAmount = !normalizedAmount;
  let updatedTag62 = !cleanBill;

  for (const field of withoutCrc) {
    if (field.tag === '01') {
      updated.push({ tag: '01', value: normalizedAmount ? '12' : field.value });
      continue;
    }
    if (field.tag === '54') {
      if (normalizedAmount && !insertedAmount) {
        updated.push({ tag: '54', value: normalizedAmount });
        insertedAmount = true;
      }
      continue;
    }
    if (normalizedAmount && !insertedAmount && parseInt(field.tag, 10) > 54) {
      updated.push({ tag: '54', value: normalizedAmount });
      insertedAmount = true;
    }
    if (field.tag === '62' && cleanBill) {
      const existingSub = parseTlv(field.value) || [];
      const mergedSub = [
        { tag: '01', value: cleanBill },
        ...existingSub.filter((s) => s.tag !== '01'),
      ];
      updated.push({ tag: '62', value: encodeTlv(mergedSub) });
      updatedTag62 = true;
      continue;
    }
    updated.push(field);
  }

  if (normalizedAmount && !insertedAmount) {
    updated.push({ tag: '54', value: normalizedAmount });
  }
  if (cleanBill && !updatedTag62) {
    updated.push({ tag: '62', value: encodeTlv([{ tag: '01', value: cleanBill }]) });
  }

  const bodyWithCrcPrefix = encodeTlv(updated) + '6304';
  return `${bodyWithCrcPrefix}${computeCrc16Ccitt(bodyWithCrcPrefix)}`;
}

export async function generateQrisQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 340,
    color: {
      dark: '#0B1220',
      light: '#FFFFFF',
    },
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal membaca file gambar.'));
    };
    img.src = url;
  });
}

function decodeQrAtScale(img: HTMLImageElement, maxSide: number): string | null {
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data?.trim() || null;
}

function compressQrisImage(img: HTMLImageElement, maxSide = 520): string {
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

/**
 * Accepts an uploaded QRIS image (PNG/JPG/WebP), attempts to decode the EMVCo QRIS
 * payload via jsQR across multiple scales, and returns both the decoded string (if valid)
 * and a compressed image data URL as fallback.
 */
export async function processQrisImageUpload(file: File): Promise<{
  decodedPayload: string | null;
  parsedInfo: ParsedQrisInfo | null;
  compressedDataUrl: string;
}> {
  const img = await loadImageFromFile(file);
  const compressedDataUrl = compressQrisImage(img, 540);

  const scales = [1200, 800, 500];
  for (const scale of scales) {
    const candidate = decodeQrAtScale(img, scale);
    if (candidate) {
      const parsed = parseAndValidateQris(candidate);
      if (parsed.valid) {
        return {
          decodedPayload: parsed.cleanedPayload,
          parsedInfo: parsed,
          compressedDataUrl,
        };
      }
    }
  }

  return {
    decodedPayload: null,
    parsedInfo: null,
    compressedDataUrl,
  };
}


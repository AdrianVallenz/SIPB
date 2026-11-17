export type ExcelCellType = 'string' | 'center' | 'integer' | 'currency' | 'percent';

export interface ExcelColumnSpec {
  header: string;
  type: ExcelCellType;
  minWidth?: number;
  maxWidth?: number;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumnSpec[];
  rows: (string | number)[][];
  totalsRow?: (string | number | null)[];
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries: { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // Compression: STORE
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  let centralSize = 0;
  for (const part of centralParts) centralSize += part.length;

  const endRecord = new Uint8Array(22);
  const ev = new DataView(endRecord.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + endRecord.length;
  const archive = new Uint8Array(totalSize);
  let cursor = 0;
  for (const p of localParts) {
    archive.set(p, cursor);
    cursor += p.length;
  }
  for (const p of centralParts) {
    archive.set(p, cursor);
    cursor += p.length;
  }
  archive.set(endRecord, cursor);
  return archive;
}

function escapeXml(raw: string): string {
  // Strip invalid XML 1.0 control characters while preserving tab/newline/CR
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnLetter(colIndex: number): string {
  let n = colIndex + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, ' ').trim();
  return (cleaned || 'Laporan').slice(0, 31);
}

function styleIdForType(type: ExcelCellType, isTotal = false): number {
  if (isTotal) {
    if (type === 'currency') return 10;
    if (type === 'integer') return 9;
    return 8;
  }
  switch (type) {
    case 'currency':
      return 7;
    case 'integer':
      return 6;
    case 'percent':
      return 11;
    case 'center':
      return 5;
    default:
      return 4;
  }
}

function inlineStrCell(ref: string, style: number, text: string): string {
  const escaped = escapeXml(text);
  const preserveAttr = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : '';
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t${preserveAttr}>${escaped}</t></is></c>`;
}

function numberCell(ref: string, style: number, value: number): string {
  const safeVal = Number.isFinite(value) ? value : 0;
  return `<c r="${ref}" s="${style}"><v>${safeVal}</v></c>`;
}

/** Builds an Office Open XML (.xlsx) workbook buffer with proper column widths, Rupiah number formats, borders, and summary row. */
export function buildXlsxBytes(options: ExcelExportOptions): Uint8Array {
  const cols = options.columns;
  const colCount = Math.max(1, cols.length);
  const lastCol = columnLetter(colCount - 1);
  const sheetTitle = escapeXml(sanitizeSheetName(options.sheetName));

  // Measure auto-fit column widths from headers, rows, and optional totals row
  const colWidths = cols.map((col, ci) => {
    let maxLen = col.header.length + 3;
    for (const row of options.rows) {
      const val = row[ci];
      if (val === undefined || val === null) continue;
      let displayLen = String(val).length;
      if (col.type === 'currency') {
        const numStr = Math.round(Number(val) || 0).toLocaleString('id-ID');
        displayLen = `Rp ${numStr}`.length + 2;
      } else if (col.type === 'integer') {
        displayLen = Math.round(Number(val) || 0).toLocaleString('id-ID').length + 2;
      }
      if (displayLen > maxLen) maxLen = displayLen;
    }
    if (options.totalsRow && options.totalsRow[ci] !== null && options.totalsRow[ci] !== undefined) {
      const val = options.totalsRow[ci] as string | number;
      let displayLen = String(val).length + 2;
      if (col.type === 'currency' && typeof val === 'number') {
        displayLen = `Rp ${Math.round(val).toLocaleString('id-ID')}`.length + 3;
      }
      if (displayLen > maxLen) maxLen = displayLen;
    }
    const minW = col.minWidth ?? 11;
    const maxW = col.maxWidth ?? 44;
    return Math.min(maxW, Math.max(minW, maxLen + 2));
  });

  const colsXml = colWidths
    .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w.toFixed(1)}" customWidth="1"/>`)
    .join('');

  const sheetRowsXml: string[] = [];

  // Row 1: Report Title (merged across A1:lastCol1)
  sheetRowsXml.push(
    `<row r="1" ht="24" customHeight="1">${inlineStrCell('A1', 1, options.title)}</row>`
  );

  // Row 2: Subtitle (merged across A2:lastCol2)
  const sub = options.subtitle || '';
  sheetRowsXml.push(
    `<row r="2" ht="18" customHeight="1">${inlineStrCell('A2', 2, sub)}</row>`
  );

  // Row 4: Table Header
  const headerCells = cols
    .map((col, idx) => inlineStrCell(`${columnLetter(idx)}4`, 3, col.header))
    .join('');
  sheetRowsXml.push(`<row r="4" ht="24" customHeight="1">${headerCells}</row>`);

  // Rows 5..: Data rows
  let currentRowNum = 5;
  for (const row of options.rows) {
    const cellsXml = cols
      .map((col, idx) => {
        const ref = `${columnLetter(idx)}${currentRowNum}`;
        const val = row[idx] ?? '';
        const style = styleIdForType(col.type, false);
        if (
          typeof val === 'number' &&
          (col.type === 'currency' || col.type === 'integer' || col.type === 'percent')
        ) {
          return numberCell(ref, style, val);
        }
        return inlineStrCell(ref, style, String(val));
      })
      .join('');
    sheetRowsXml.push(`<row r="${currentRowNum}" ht="20" customHeight="1">${cellsXml}</row>`);
    currentRowNum += 1;
  }

  const lastDataRow = Math.max(4, currentRowNum - 1);

  // Optional Summary / Totals Row
  if (options.totalsRow && options.totalsRow.length > 0) {
    const totalRowNum = currentRowNum;
    const cellsXml = cols
      .map((col, idx) => {
        const ref = `${columnLetter(idx)}${totalRowNum}`;
        const val = options.totalsRow?.[idx];
        const style = styleIdForType(col.type, true);
        if (val === null || val === undefined || val === '') {
          return inlineStrCell(ref, 8, '');
        }
        if (typeof val === 'number' && (col.type === 'currency' || col.type === 'integer')) {
          return numberCell(ref, style, val);
        }
        return inlineStrCell(ref, 8, String(val));
      })
      .join('');
    sheetRowsXml.push(`<row r="${totalRowNum}" ht="22" customHeight="1">${cellsXml}</row>`);
  }

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${sheetTitle}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="&quot;Rp &quot;#,##0"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="0&quot;%&quot;"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF475569"/></left>
      <right style="thin"><color rgb="FF475569"/></right>
      <top style="thin"><color rgb="FF0F172A"/></top>
      <bottom style="medium"><color rgb="FF0F172A"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="1" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="1" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${colsXml}</cols>
  <sheetData>${sheetRowsXml.join('')}</sheetData>
  <mergeCells count="2">
    <mergeCell ref="A1:${lastCol}1"/>
    <mergeCell ref="A2:${lastCol}2"/>
  </mergeCells>
  <autoFilter ref="A4:${lastCol}${lastDataRow}"/>
  <pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  return createStoredZip([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]);
}

/** Triggers a browser download of a genuine Microsoft Excel (.xlsx) workbook. */
export function downloadWorkbookXlsx(options: ExcelExportOptions): void {
  const bytes = buildXlsxBytes(options);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename.endsWith('.xlsx') ? options.filename : `${options.filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

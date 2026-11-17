import type { CatalogField } from '../ui/CatalogResourcePage';

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error('CSV 引号未闭合');
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function importRows(text: string, fields: CatalogField[]): Record<string, unknown>[] {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('CSV 文件为空');
  const headers = rows[0].map(value => value.trim());
  const supported = new Set(fields.map(field => field.key));
  if (headers.some(key => !supported.has(key)) || new Set(headers).size !== headers.length) {
    throw new Error('模板列不匹配，请先下载模板');
  }
  if (fields.some(field => field.required && !headers.includes(field.key))) throw new Error('缺少必填列');
  if (rows.length > 501) throw new Error('单次最多导入 500 条');
  return rows.slice(1).map((cells, index) => {
    const result: Record<string, unknown> = {};
    headers.forEach((key, i) => {
      const field = fields.find(item => item.key === key)!;
      const value = (cells[i] ?? '').trim();
      result[key] = field.type === 'boolean' ? value === '是' || value.toLowerCase() === 'true'
        : field.type === 'array' ? value.split(/[、，,]/).map(x => x.trim()).filter(Boolean)
        : field.type === 'integer' ? Number(value) || 0
        : field.type === 'date' ? value || null : value;
    });
    const missing = fields.find(field => field.required && !String(result[field.key] ?? '').trim());
    if (missing) throw new Error(`第 ${index + 2} 行缺少${missing.label}`);
    return result;
  });
}

function cell(value: unknown): string {
  const raw = Array.isArray(value) ? value.join('、') : typeof value === 'boolean' ? value ? '是' : '否' : String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadCatalogCsv(filename: string, fields: CatalogField[], rows: Record<string, unknown>[]): void {
  const lines = [fields.map(field => cell(field.key)).join(','), ...rows.map(row => fields.map(field => cell(row[field.key])).join(','))];
  const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

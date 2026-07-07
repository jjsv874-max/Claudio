// Camada central de parsing e normalização.
// Suporta serial de data do Excel, Date, dd/mm/yyyy, dd/mm/yyyy hh:mm,
// yyyy-mm-dd e strings com prazo embutido (PRAZO:, Dead Line ...:).

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30); // 1899-12-30 (corrige o bug do ano 1900)

/** Converte serial do Excel para ISO yyyy-mm-dd (ou '' se inválido). */
function excelSerialToIso(serial: number): string {
  if (!isFinite(serial) || serial <= 0) return '';
  const ms = EXCEL_EPOCH_UTC + Math.round(serial) * 86400000;
  const d = new Date(ms);
  return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoFromParts(y: number, m: number, d: number): string {
  // Datas anteriores a 1900 são sentinelas técnicas (ex.: 01/01/1753 = nulo do sistema).
  if (!y || !m || !d || y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Converte um valor de célula qualquer em ISO yyyy-mm-dd.
 * Retorna '' quando não há data válida (vazio, null, undefined, sentinela).
 */
export function toIso(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (value instanceof Date) {
    return isoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number') {
    // Provável serial do Excel.
    return excelSerialToIso(value);
  }

  const s = String(value).trim();
  if (!s) return '';

  // yyyy-mm-dd (já ISO)
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return isoFromParts(+iso[1], +iso[2], +iso[3]);

  // dd/mm/yyyy (com ou sem hora) — inclusive quando embutido em texto (PRAZO:, Dead Line:)
  const br = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return isoFromParts(+br[3], +br[2], +br[1]);

  // numérico em string
  if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToIso(Number(s));

  return '';
}

/** Extrai a data embutida em um texto de prazo, ex.: "...PRAZO: 06/07/2026 18:00". */
export function dateFromStatusText(value: unknown): string {
  const m = String(value ?? '').match(/(?:PRAZO:\s*)?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  return m ? isoFromParts(+m[3], +m[2], +m[1]) : '';
}

/** Normaliza texto para comparação: uppercase, sem acento, trim, espaços colapsados. */
export function normText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Texto para exibição: converte o delimitador @|@ em quebra de linha, preserva conteúdo. */
export function displayText(value: unknown): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return s.replace(/@\|@/g, '\n');
}

/** Remove o delimitador @|@ mantendo tudo em uma linha (para campos curtos). */
export function inlineText(value: unknown): string {
  return String(value ?? '')
    .replace(/@\|@/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chave do processo: parte antes de @|@, sem espaços, em caixa alta. */
export function processKey(processo: unknown): string {
  return String(processo ?? '')
    .split('@|@')[0]
    .trim()
    .toUpperCase();
}

/** Nome do processo para exibição (parte antes de @|@, preservando caixa original). */
export function processName(processo: unknown): string {
  return String(processo ?? '').split('@|@')[0].trim();
}

/** Referência do cliente embutida no campo Processo (após "REF. CLIENTE:"). */
export function refCliente(processo: unknown): string {
  const s = String(processo ?? '');
  const m = s.match(/REF\.?\s*CLIENTE:?\s*(.+)$/i);
  if (m) return m[1].trim();
  const parts = s.split('@|@');
  return parts.length > 1 ? parts.slice(1).join(' ').trim() : '';
}

/** Converte um número/tipo qualquer em inteiro seguro. */
export function toInt(value: unknown): number {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return isFinite(n) ? Math.round(n) : 0;
}

/** Data ISO -> dd/mm/yyyy para exibição. */
export function brDate(iso: string): string {
  if (!iso) return 'Sem data';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 'Sem data';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Diferença em dias entre uma data ISO e a data-base (ambos ISO). null se sem data. */
export function diffDays(iso: string, baseIso: string): number | null {
  if (!iso) return null;
  const a = parseIso(iso);
  const b = parseIso(baseIso);
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function parseIso(iso: string): Date | null {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // segunda como início
  x.setDate(x.getDate() - day);
  return x;
}

/** Data atual em America/Sao_Paulo (ISO yyyy-mm-dd). */
export function todaySaoPauloIso(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA já retorna yyyy-mm-dd
  return fmt.format(new Date());
}

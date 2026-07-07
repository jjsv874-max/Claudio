import { diffDays, dateFromStatusText, normText } from './parse';
import { FLOW_STAGES, DASHBOARD_UNMAPPED_STAGE } from './stages';
import {
  EMPTY_FILTERS,
  type AppData,
  type BacklogRow,
  type EventRow,
  type Filters,
  type FlowStage,
  type Modal,
} from './types';

const EMPTY_STAGE_FILTER: Filters = EMPTY_FILTERS;

const validIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const dateAsc = (a: string, b: string) => String(a || '9999-99-99').localeCompare(String(b || '9999-99-99'));
const dateDesc = (a: string, b: string) => String(b || '0000-00-00').localeCompare(String(a || '0000-00-00'));

function taRank(status: string): number {
  const s = normText(status);
  if (s === 'NAO ENVIADO') return 0;
  if (s === 'AGUARDANDO NCM') return 1;
  if (s === 'INEXISTENTE') return 2;
  return 3;
}

const EVENT_ORDER = [
  'Prazo Digitação/Numerário',
  'Deadline documental',
  'Chegada prevista',
  'Chegada confirmada',
  'Embarque',
  'Previsão embarque',
];

export const KANBAN_BUCKETS = [
  'Vencidos', 'Hoje', 'Até 3 dias', 'Até 7 dias', 'Até 15 dias', 'Até 30 dias', 'Mais de 30 dias', 'Sem data',
];

export interface Priority {
  score: number;
  label: string;
}

/**
 * Motor de derivação: encapsula toda a lógica operacional (ciclo concluído,
 * etapas da Timeline, dedup, dashboard, vencidos) sobre os dados processados.
 */
export class Engine {
  constructor(private data: AppData) {
    // índice tipo por processo (fallback do modal)
    this.typeByKey = new Map();
    data.backlog.forEach((r) => {
      const raw = String(r.tipo || '').trim();
      if (r.key && !this.typeByKey.has(r.key) && raw) this.typeByKey.set(r.key, raw);
    });
  }

  private typeByKey: Map<string, string>;
  get base() {
    return this.data.baseDate;
  }
  /** Acesso somente-leitura aos dados processados (detalhes por processo, etc). */
  get store(): AppData {
    return this.data;
  }
  details(key: string) {
    return {
      envio: this.data.envioDetail.get(key),
      cheg: this.data.chegadaDetail.get(key),
      conf: this.data.chegadaConfDetail.get(key),
      reg: this.data.regPendDetail.get(key),
    };
  }

  diff(iso: string): number | null {
    return diffDays(iso, this.base);
  }

  // ---------- Detalhes por processo ----------
  private envioOf(r: BacklogRow | EventRow) {
    return this.data.envioDetail.get(r.key);
  }
  private chegadaOf(r: BacklogRow | EventRow) {
    return this.data.chegadaDetail.get(r.key);
  }
  private chegadaConfOf(r: BacklogRow | EventRow) {
    return this.data.chegadaConfDetail.get(r.key);
  }
  private regPendOf(r: BacklogRow | EventRow) {
    return this.data.regPendDetail.get(r.key);
  }

  prevEmbOf(r: BacklogRow | EventRow) { return this.envioOf(r)?.prevEmb || ''; }
  embOf(r: BacklogRow | EventRow) { return this.envioOf(r)?.emb || ''; }
  prevChegOf(r: BacklogRow | EventRow) { return this.envioOf(r)?.prevCheg || ''; }
  taStatusOf(r: BacklogRow | EventRow) { return this.envioOf(r)?.ta || ''; }
  daysOpenOf(r: BacklogRow | EventRow) { return Number(this.envioOf(r)?.dias ?? (r as BacklogRow).dias ?? 0); }
  clientWaitSignalOf(r: BacklogRow | EventRow) { return this.data.clientWait.get(r.key) === true; }

  actualEmbarkationOf(r: BacklogRow | EventRow) {
    const d = this.embOf(r);
    return validIsoDate(d) ? d : '';
  }
  actualArrivalOf(r: BacklogRow | EventRow) {
    const cc = this.chegadaConfOf(r)?.chegada || '';
    const rp = this.regPendOf(r)?.chegada || '';
    if (validIsoDate(cc)) return cc;
    if (validIsoDate(rp)) return rp;
    return '';
  }
  /** Previsão de chegada combinada (aba Ag. Envio ou Ag. Chegada). */
  arrivalForecastOf(r: BacklogRow | EventRow) {
    const fromEnvio = this.prevChegOf(r);
    const fromChegada = this.chegadaOf(r)?.prevCheg || '';
    if (validIsoDate(fromEnvio)) return fromEnvio;
    if (validIsoDate(fromChegada)) return fromChegada;
    return '';
  }
  hasValidArrivalForecastOf(r: BacklogRow | EventRow) {
    return Boolean(this.arrivalForecastOf(r));
  }
  digitationStatusOf(r: BacklogRow | EventRow) {
    return normText(this.chegadaConfOf(r)?.digitacao || this.chegadaOf(r)?.digitacao || '');
  }
  numerarioStatusOf(r: BacklogRow | EventRow) {
    return normText(
      this.chegadaConfOf(r)?.numerario || this.chegadaOf(r)?.numerario || this.regPendOf(r)?.numerario || '',
    );
  }
  checklistStatusOf(r: BacklogRow | EventRow) {
    return normText(this.chegadaOf(r)?.checklist || '');
  }

  isDigitationCompleted(r: BacklogRow | EventRow): boolean {
    const s = this.digitationStatusOf(r);
    if (!s) return false;
    if (/VENCID|PRAZO:|ENVIO DIGITA/.test(s)) return false;
    return /CONFERENCIA DI|CONFERIDO AG\. CHEGADA|CONFERIDO - AG\. REGISTRO|AG\. REGISTRO|REGISTRO DE DI|REGISTRO COM PENDENCIA/.test(s);
  }
  isDigitationPending(r: BacklogRow | EventRow): boolean {
    const s = this.digitationStatusOf(r);
    if (this.isDigitationCompleted(r)) return false;
    return /DIGITACAO E NUMERARIO|ENVIO DIGITACAO|DIGITACAO/.test(s);
  }
  isNumerarioPending(r: BacklogRow | EventRow): boolean {
    const s = this.numerarioStatusOf(r);
    if (!s || s === '22' || s === '99' || s === 'INEXISTENTE' || /PAGO|LIBERADO/.test(s)) return false;
    return /NAO ENVIADO|AG\. DEPOSITO|AGUARDANDO DEPOSITO|DEBITO CLIENTE|DEBITO FREITAS|NUMERARIO|AUTORIZACAO/.test(s);
  }
  isDocsCompleted(r: BacklogRow | EventRow): boolean {
    const c = this.checklistStatusOf(r);
    return /DOCUMENTOS APROVADOS|DOCUMENTOS OK|APROVADO|\bOK\b/.test(c) || this.isDigitationCompleted(r);
  }
  isConferidoAguardandoChegada(r: BacklogRow | EventRow): boolean {
    return /CONFERIDO AG\. CHEGADA/.test(this.digitationStatusOf(r)) && !this.actualArrivalOf(r);
  }
  isConferenciaDI(r: BacklogRow | EventRow): boolean {
    return /CONFERENCIA DI/.test(this.digitationStatusOf(r));
  }
  /** Etapa crítica de chegada: previsão válida, sem chegada real e prontidão incompleta. */
  isAgChegadaComPendencia(r: BacklogRow | EventRow): boolean {
    const agChegada = this.chegadaOf(r);
    if (!agChegada) return false;
    if (!this.hasValidArrivalForecastOf(r)) return false;
    if (this.actualArrivalOf(r)) return false;
    const s = this.digitationStatusOf(r);
    if (/CONFERIDO AG\. CHEGADA/.test(s)) return false;
    if (this.isConferenciaDI(r)) return false;
    if (/CONFERIDO - AG\. REGISTRO|AG\. REGISTRO|REGISTRO DE DI|REGISTRO COM PENDENCIA/.test(s)) return false;
    return true;
  }

  /** Regra de ciclo concluído para eventos do calendário. */
  isOpenOperationalEvent(r: EventRow): boolean {
    const ev = String(r.evento || '').toLowerCase();
    // Se já existe previsão de chegada válida, a falta de confirmação de embarque
    // não permanece como pendência (o embarque evidentemente ocorreu).
    const embarkProgressed = Boolean(this.actualEmbarkationOf(r) || this.hasValidArrivalForecastOf(r));
    if (ev === 'previsão embarque' && embarkProgressed) return false;
    if (ev === 'embarque' && embarkProgressed) return false;
    if (ev === 'chegada prevista' && this.actualArrivalOf(r)) return false;
    if (ev === 'chegada confirmada' && this.actualArrivalOf(r)) return false;
    if (ev === 'prazo digitação/numerário' && this.isDigitationCompleted(r)) return false;
    if (ev === 'deadline documental' && this.isDocsCompleted(r)) return false;
    return true;
  }

  cleanOperationalMotive(r: BacklogRow | EventRow): string {
    const raw = String((r as any).motivo || (r as any).acao || '').trim();
    if (!raw) return '';
    const embarkProgressed = Boolean(this.actualEmbarkationOf(r) || this.hasValidArrivalForecastOf(r));
    const arrived = Boolean(this.actualArrivalOf(r));
    const digDone = this.isDigitationCompleted(r);
    const docsDone = this.isDocsCompleted(r);
    const parts = raw
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((part) => {
        const p = part.toLowerCase();
        if (embarkProgressed && /embarque vencid/.test(p)) return false;
        if (arrived && /chegada (?:prevista|confirmada) vencid/.test(p)) return false;
        if (digDone && /prazo de digita|digita..o vencid/.test(p)) return false;
        if (docsDone && /deadline documental vencid/.test(p)) return false;
        return true;
      });
    return parts.join('; ') || 'Etapa anterior concluída; monitorar a pendência atual.';
  }

  // ---------- Modal de transporte ----------
  rawTypeOf(r: BacklogRow | EventRow): string {
    const direct = String(r.tipo || '').trim();
    if (direct && direct !== 'NÃO INFORMADO') return direct;
    const byKey = this.typeByKey.get(r.key);
    return String(byKey || direct || 'NÃO INFORMADO').trim();
  }
  modalOf(r: BacklogRow | EventRow): Modal {
    const t = normText(this.rawTypeOf(r));
    if (t.includes('AEREO')) return 'Aéreo';
    if (t.includes('RODOV')) return 'Rodoviário';
    if (['FCL', 'LCL', 'BREAK BULK', 'ISOTANK', 'RO-RO', 'RORO'].some((x) => t.includes(x)) || t.includes('MARIT'))
      return 'Marítimo';
    return 'N/I';
  }

  // ---------- Filtros ----------
  matchesPrazo(iso: string, f: string): boolean {
    if (!f) return true;
    const n = this.diff(iso);
    if (f === 'semdata') return n === null;
    if (n === null) return false;
    if (f === 'vencidos') return n < 0;
    if (f === 'hoje') return n === 0;
    if (f === 'ate3') return n >= 0 && n <= 3;
    if (f === 'ate7') return n >= 0 && n <= 7;
    if (f === 'ate15') return n >= 0 && n <= 15;
    if (f === 'ate30') return n >= 0 && n <= 30;
    if (f === 'mais30') return n > 30;
    return true;
  }

  /** Conjunto de chaves de processo que pertencem à etapa selecionada (cacheado). */
  private stageKeyCache: { id: string; keys: Set<string> } | null = null;
  private stageKeys(stageId: string): Set<string> {
    if (this.stageKeyCache && this.stageKeyCache.id === stageId) return this.stageKeyCache.keys;
    // usa filtros vazios para não recursar: apenas critério estrutural da etapa
    const keys = new Set(this.flowStageRows(stageId, EMPTY_STAGE_FILTER).map((r) => r.key));
    this.stageKeyCache = { id: stageId, keys };
    return keys;
  }

  private commonMatch(r: BacklogRow | EventRow, f: Filters, includeEvent = true): boolean {
    if (f.responsavel && r.responsavel !== f.responsavel) return false;
    if (f.celula && r.celula !== f.celula) return false;
    if (f.etapa && !this.stageKeys(f.etapa).has(r.key)) return false;
    if (f.modal && this.modalOf(r) !== f.modal) return false;
    if (includeEvent && f.evento && (r as EventRow).evento !== f.evento) return false;
    if (f.prioridade && r.prioridade !== f.prioridade) return false;
    if (f.dono && (r as BacklogRow).dono !== f.dono) return false;
    if (f.aba && r.aba !== f.aba) return false;
    if (f.busca) {
      const q = f.busca.trim().toLowerCase();
      const hay = [
        r.cod, r.processo, (r as BacklogRow).ref, r.responsavel, (r as any).motivo, r.etapa,
        r.aba, (r as EventRow).evento, r.celula, r.tipo, this.rawTypeOf(r), this.modalOf(r),
        (r as BacklogRow).obs,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  filteredBacklog(f: Filters): BacklogRow[] {
    return this.data.backlog.filter((r) => this.commonMatch(r, f, true) && this.matchesPrazo(r.data, f.prazo));
  }
  filteredEvents(f: Filters): EventRow[] {
    return this.data.events.filter(
      (r) => this.isOpenOperationalEvent(r) && this.commonMatch(r, f, true) && this.matchesPrazo(r.date, f.prazo),
    );
  }
  /** Eventos sem aplicar a faixa de prazo (para calendário/vencidos). */
  calendarBaseEvents(f: Filters, ignorePrazo = false): EventRow[] {
    return this.data.events.filter(
      (r) =>
        this.isOpenOperationalEvent(r) &&
        this.commonMatch(r, f, true) &&
        (ignorePrazo || this.matchesPrazo(r.date, f.prazo)),
    );
  }

  // ---------- Etapas da Timeline ----------
  flowPrimaryDate(r: BacklogRow, stageId: string): string {
    if (stageId === 'semPrevEmbarque') return this.prevEmbOf(r) || this.embOf(r) || '';
    if (stageId === 'semPrevChegada') return this.prevEmbOf(r) || this.embOf(r) || '';
    if (stageId === 'comPrevChegada' || stageId === 'aguardandoCliente')
      return this.prevChegOf(r) || this.prevEmbOf(r) || '';
    if (stageId === 'digitacao' || stageId === 'numerario')
      return dateFromStatusText(this.digitationStatusOf(r)) || r.data || '';
    if (stageId === 'agChegadaPendente') return this.arrivalForecastOf(r) || r.data || '';
    if (stageId === 'conferidoAgChegada') return this.chegadaOf(r)?.prevCheg || '';
    if (stageId === 'chegadaPendente') return this.actualArrivalOf(r) || '';
    if (stageId === 'conferencia') return this.actualArrivalOf(r) || this.chegadaOf(r)?.prevCheg || r.data || '';
    if (stageId === 'registro') return this.actualArrivalOf(r) || r.data || '';
    return r.data || '';
  }

  flowPriority(r: BacklogRow, stageId: string): Priority {
    const n = this.diff(this.flowPrimaryDate(r, stageId));
    const t = [r.aba, r.etapa, r.evento, r.motivo, r.acao, r.ref, r.tipo, r.responsavel, r.celula]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    let score = 0;
    let label = 'Monitorar';
    if (stageId === 'chegadaPendente') {
      const age = n !== null && n < 0 ? Math.abs(n) : 0;
      return { score: 70000 + Math.min(age, 9999), label: 'Pós-chegada' };
    }
    const nn = n ?? Number.POSITIVE_INFINITY;
    if (n !== null && n < 0) { score += 100000 + Math.min(9999, Math.abs(n)); label = 'Vencido'; }
    else if (!r.data || n === null) { score += 90000; label = 'Sem data'; }
    else if (nn === 0) { score += 85000; label = 'Hoje'; }
    else if (nn <= 3) { score += 76000 - nn; label = 'Até 3 dias'; }
    else if (nn <= 7) { score += 65000 - nn; label = 'Até 7 dias'; }
    else if (nn <= 15) { score += 52000 - nn; label = 'Até 15 dias'; }
    else if (nn <= 30) { score += 39000 - nn; label = 'Até 30 dias'; }
    else { score += 12000 - Math.min(nn, 365); label = 'Futuro'; }
    if (t.includes('chegada confirmada')) { score += 9000; if (label === 'Monitorar' || label === 'Futuro') label = 'Chegada confirmada'; }
    if (t.includes('bloqueio') || t.includes('bloquead')) score += 6500;
    if (t.includes('débito') || t.includes('debito')) score += 4500;
    if (t.includes('depósito') || t.includes('deposito')) score += 4000;
    if (t.includes('não enviado') || t.includes('nao enviado')) score += 2800;
    if (t.includes('aguardando ncm')) score += 2200;
    if (stageId === 'digitacao') score += 4200;
    if (stageId === 'numerario') score += 5000;
    if (stageId === 'agChegadaPendente') score += 7200;
    if (stageId === 'conferidoAgChegada') score += 3600;
    if (stageId === 'registro' && /registro|bloque|débito|debito/.test(t)) score += 6000;
    return { score, label };
  }

  private dedupeFlowRows(rows: BacklogRow[], stageId: string): BacklogRow[] {
    const best = new Map<string, BacklogRow>();
    rows.forEach((r) => {
      if (!r.key) return;
      const current = best.get(r.key);
      if (!current) { best.set(r.key, r); return; }
      const nr = this.flowPriority(r, stageId).score;
      const nc = this.flowPriority(current, stageId).score;
      if (nr > nc) best.set(r.key, r);
      else if (nr === nc && String(r.data || '9999-99-99') < String(current.data || '9999-99-99')) best.set(r.key, r);
    });
    return Array.from(best.values());
  }

  flowStageRows(stageId: string, f: Filters): BacklogRow[] {
    const rows = this.filteredBacklog(f);
    const matched = rows.filter((r) => {
      const aba = String(r.aba || '').toLowerCase();
      const etapa = String(r.etapa || '').toLowerCase();
      const isAgEnvio = aba.includes('ag. envio digitação');
      const noPrevEmb = isAgEnvio && !this.prevEmbOf(r) && !this.embOf(r);
      const noPrevCheg = isAgEnvio && !noPrevEmb && !this.prevChegOf(r);
      const hasPrevCheg = isAgEnvio && Boolean(this.prevChegOf(r));
      const clientWait = this.clientWaitSignalOf(r);
      if (stageId === 'semPrevEmbarque') return noPrevEmb;
      if (stageId === 'semPrevChegada') return noPrevCheg;
      if (stageId === 'comPrevChegada') return hasPrevCheg && !clientWait;
      if (stageId === 'aguardandoCliente') return hasPrevCheg && clientWait;
      const agChegadaComPendencia = this.isAgChegadaComPendencia(r);
      if (stageId === 'digitacao') return this.isDigitationPending(r) && !agChegadaComPendencia;
      if (stageId === 'numerario') return this.isNumerarioPending(r) && !agChegadaComPendencia;
      if (stageId === 'agChegadaPendente') return agChegadaComPendencia;
      if (stageId === 'conferidoAgChegada') return this.isConferidoAguardandoChegada(r);
      if (stageId === 'chegadaPendente') return aba.includes('chegada confirmada') && Boolean(this.actualArrivalOf(r));
      if (stageId === 'conferencia') return this.isConferenciaDI(r);
      if (stageId === 'registro')
        return aba.includes('registro com pendência') || etapa.includes('ag. registro') || etapa.includes('registro com pendência');
      return false;
    });
    return this.dedupeFlowRows(matched, stageId);
  }

  flowSort(stageId: string): (a: BacklogRow, b: BacklogRow) => number {
    return (a, b) => {
      if (stageId === 'semPrevEmbarque' || stageId === 'semPrevChegada') {
        const ta = taRank(this.taStatusOf(a)); const tb = taRank(this.taStatusOf(b));
        if (ta !== tb) return ta - tb;
        const da = this.daysOpenOf(a); const db = this.daysOpenOf(b);
        if (da !== db) return db - da;
        return String(a.processo || '').localeCompare(String(b.processo || ''));
      }
      if (stageId === 'comPrevChegada' || stageId === 'aguardandoCliente') {
        const aa = this.prevChegOf(a), ab = this.prevChegOf(b);
        const va = validIsoDate(aa), vb = validIsoDate(ab);
        if (va && vb && aa !== ab) return dateAsc(aa, ab);
        if (va !== vb) return va ? -1 : 1;
        const ea = this.prevEmbOf(a), eb = this.prevEmbOf(b);
        const vea = validIsoDate(ea), veb = validIsoDate(eb);
        if (vea && veb && ea !== eb) return dateDesc(ea, eb);
        if (vea !== veb) return vea ? -1 : 1;
        const ta = taRank(this.taStatusOf(a)), tb = taRank(this.taStatusOf(b));
        if (ta !== tb) return ta - tb;
        const da = this.daysOpenOf(a), db = this.daysOpenOf(b);
        if (da !== db) return db - da;
        return String(a.processo || '').localeCompare(String(b.processo || ''));
      }
      if (stageId === 'conferidoAgChegada') {
        const ca = this.chegadaOf(a)?.prevCheg || '', cb = this.chegadaOf(b)?.prevCheg || '';
        const va = validIsoDate(ca), vb = validIsoDate(cb);
        if (va && vb && ca !== cb) return dateAsc(ca, cb);
        if (va !== vb) return va ? -1 : 1;
      }
      if (stageId === 'chegadaPendente') {
        const ca = this.actualArrivalOf(a) || '', cb = this.actualArrivalOf(b) || '';
        if (ca !== cb) return dateAsc(ca, cb);
      }
      const pa = this.flowPriority(a, stageId), pb = this.flowPriority(b, stageId);
      return (
        pb.score - pa.score ||
        dateAsc(this.flowPrimaryDate(a, stageId), this.flowPrimaryDate(b, stageId)) ||
        String(a.processo || '').localeCompare(String(b.processo || ''))
      );
    };
  }

  flowStats(rows: BacklogRow[], stageId: string) {
    const dates = rows.map((r) => this.flowPrimaryDate(r, stageId));
    const venc = stageId === 'chegadaPendente' ? 0 : dates.filter((d) => { const n = this.diff(d); return n !== null && n < 0; }).length;
    const hoje = dates.filter((d) => this.diff(d) === 0).length;
    const d3 = dates.filter((d) => { const n = this.diff(d); return n !== null && n >= 0 && n <= 3; }).length;
    const sem = dates.filter((d) => !d).length;
    return { total: rows.length, uniq: uniqueCount(rows, 'key'), venc, hoje, d3, sem };
  }

  // ---------- Dashboard por analista ----------
  dashboardAssigned(f: Filters) {
    const assigned = new Map<string, { key: string; row: BacklogRow; stage: FlowStage; stageIndex: number; priority: Priority }>();
    FLOW_STAGES.forEach((stage, stageIndex) => {
      this.flowStageRows(stage.id, f).forEach((r) => {
        if (!r.key) return;
        assigned.set(r.key, { key: r.key, row: r, stage, stageIndex, priority: this.flowPriority(r, stage.id) });
      });
    });
    this.filteredBacklog(f).forEach((r) => {
      if (!r.key || assigned.has(r.key)) return;
      const n = this.diff(r.data);
      assigned.set(r.key, {
        key: r.key,
        row: r,
        stage: DASHBOARD_UNMAPPED_STAGE,
        stageIndex: FLOW_STAGES.length,
        priority: { label: r.data && n !== null && n < 0 ? 'Vencido' : !r.data ? 'Sem data' : 'Monitorar', score: r.score || 0 },
      });
    });
    return [...assigned.values()];
  }

  dashboardPortfolio(f: Filters) {
    const items = this.dashboardAssigned(f);
    const map = new Map<string, any>();
    items.forEach((item) => {
      const analyst = String(item.row.responsavel || 'NÃO INFORMADO').trim() || 'NÃO INFORMADO';
      if (!map.has(analyst)) map.set(analyst, { analyst, items: [], stages: new Map(), overdue: 0, noDate: 0, modals: new Map() });
      const g = map.get(analyst);
      g.items.push(item);
      g.stages.set(item.stage.id, (g.stages.get(item.stage.id) || 0) + 1);
      const modal = this.modalOf(item.row);
      g.modals.set(modal, (g.modals.get(modal) || 0) + 1);
      if (item.priority.label === 'Vencido') g.overdue++;
      if (!this.flowPrimaryDate(item.row, item.stage.id)) g.noDate++;
    });
    const stageCatalog = FLOW_STAGES.concat([DASHBOARD_UNMAPPED_STAGE]);
    return [...map.values()]
      .map((g) => {
        const top = [...g.stages.entries()].sort((a: any, b: any) => b[1] - a[1])[0] || ['', 0];
        const stage = stageCatalog.find((s) => s.id === top[0]) || DASHBOARD_UNMAPPED_STAGE;
        const topModal = [...g.modals.entries()].sort((a: any, b: any) => b[1] - a[1])[0] || ['N/I', 0];
        g.total = g.items.length;
        g.topStage = stage;
        g.topCount = top[1];
        g.topModal = topModal[0];
        g.concentration = g.total ? Math.round((g.topCount / g.total) * 100) : 0;
        g.overdueRate = g.total ? Math.round((g.overdue / g.total) * 100) : 0;
        return g;
      })
      .sort((a, b) => b.total - a.total || b.overdue - a.overdue || a.analyst.localeCompare(b.analyst));
  }

  // ---------- Vencidos (D+1) ----------
  overdueRows(f: Filters): EventRow[] {
    return this.calendarBaseEvents(f, true)
      .filter((r) => { const n = this.diff(r.date); return n !== null && n < 0; })
      .sort(
        (a, b) =>
          (this.diff(a.date)! - this.diff(b.date)!) ||
          String(a.evento || '').localeCompare(String(b.evento || '')) ||
          String(a.processo || '').localeCompare(String(b.processo || '')),
      );
  }
  overdueAge(r: EventRow): number | null {
    const n = this.diff(r.date);
    return n === null ? null : Math.max(0, Math.abs(n));
  }
}

// ---------- Utilitários ----------
export function uniqueCount<T extends Record<string, any>>(rows: T[], key: keyof T): number {
  return new Set(rows.map((r) => r[key]).filter(Boolean)).size;
}

export function groupCount<T extends Record<string, any>>(rows: T[], key: keyof T): [string, number][] {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = (r[key] as string) || 'Sem informação';
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a[0]); const bi = EVENT_ORDER.indexOf(b[0]);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return b[1] - a[1] || a[0].localeCompare(b[0]);
  });
}

export function shortEventName(name: string): string {
  const map: Record<string, string> = {
    'Prazo Digitação/Numerário': 'Digitação/Numerário',
    'Deadline documental': 'Deadline doc.',
    'Chegada prevista': 'Chegada prev.',
    'Chegada confirmada': 'Chegada conf.',
    'Previsão embarque': 'Prev. embarque',
  };
  return map[name] || name || 'Sem evento';
}

export function rangeLabel(n: number | null): string {
  if (n === null) return 'Sem data';
  if (n < 0) return 'Vencidos';
  if (n === 0) return 'Hoje';
  if (n <= 3) return 'Até 3 dias';
  if (n <= 7) return 'Até 7 dias';
  if (n <= 15) return 'Até 15 dias';
  if (n <= 30) return 'Até 30 dias';
  return 'Mais de 30 dias';
}

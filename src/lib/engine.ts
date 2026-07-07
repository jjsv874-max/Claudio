import { utils, type WorkBook, type WorkSheet } from 'xlsx';
import {
  toIso,
  dateFromStatusText,
  normText,
  inlineText,
  processKey,
  processName,
  refCliente,
  toInt,
  diffDays,
} from './parse';
import { classifyDono } from './dono';
import {
  SHEET_NAMES,
  type SheetName,
  type AppData,
  type BacklogRow,
  type EventRow,
  type EnvioDetail,
  type ChegadaDetail,
  type ChegadaConfDetail,
  type RegPendDetail,
  type Dono,
} from './types';

export class SheetError extends Error {
  found: string[];
  missing: string[];
  constructor(message: string, found: string[], missing: string[]) {
    super(message);
    this.name = 'SheetError';
    this.found = found;
    this.missing = missing;
  }
}

type Row = Record<string, unknown>;

/** Lê uma aba com header na 2ª linha (a 1ª é o banner "Controle Importação"). */
function readSheet(ws: WorkSheet): Row[] {
  const matrix = utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  if (matrix.length < 2) return [];
  // Detecta a linha de cabeçalho: a que contém "CodProcesso" / "Processo".
  let headerIdx = 1;
  for (let i = 0; i < Math.min(4, matrix.length); i++) {
    const joined = normText((matrix[i] || []).join(' '));
    if (joined.includes('CODPROCESSO') || joined.includes('PROCESSO')) {
      headerIdx = i;
      break;
    }
  }
  const header = (matrix[headerIdx] || []).map((h) => String(h ?? '').trim());
  const rows: Row[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const arr = matrix[r] || [];
    const obj: Row = {};
    header.forEach((h, i) => {
      if (h) obj[h] = arr[i];
    });
    // ignora linhas totalmente vazias
    if (Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '')) {
      rows.push(obj);
    }
  }
  return rows;
}

function prioridadeOf(iso: string, baseDate: string): string {
  const n = diffDays(iso, baseDate);
  if (n === null) return 'Sem data/triagem';
  if (n < 0) return 'Crítico/Vencido';
  if (n === 0) return 'Urgente/Hoje';
  if (n <= 3) return 'Alta | Próx. 3 dias';
  if (n <= 7) return 'Média | Próx. 7 dias';
  if (n <= 30) return 'Monitorar';
  return 'Backlog futuro >30d';
}

function scoreOf(iso: string, baseDate: string): number {
  const n = diffDays(iso, baseDate);
  if (n === null) return 0;
  if (n < 0) return 100 + Math.min(9999, Math.abs(n));
  if (n === 0) return 90;
  if (n <= 3) return 76 - n;
  if (n <= 7) return 65 - n;
  if (n <= 15) return 52 - n;
  if (n <= 30) return 40 - n;
  return 12;
}

/** Sinal de espera documental do cliente (aba Ag. Envio Digitação). */
function clientWaitSignal(anuente: string, follow: string, obs: string): boolean {
  const ta = normText(anuente);
  if (ta === 'AGUARDANDO NCM') return true;
  const bag = normText([follow, obs].filter(Boolean).join(' '));
  if (!bag) return false;
  const signals = [
    'AGUARDANDO CLIENTE',
    'AGUARDANDO DOCUMENTO',
    'AGUARDANDO CORRECAO',
    'AGUARDANDO RETORNO',
    'AGUARDA RETORNO',
    'SEM RETORNO',
    'RETORNO DO CLIENTE',
    'RETORNO DO IMPORTADOR',
    'PROVIDENCIAR ALTERACOES',
    'FAVOR PROVIDENCIAR',
    'COPIA',
    'HBL',
    ' BL ',
    'INVOICE',
    'PACKING',
    'CORRECAO',
    'FATURA',
    'AGUARDANDO DEPOSITO',
    'DEBITO CLIENTE',
    'AGUARDANDO NCM',
  ];
  return signals.some((s) => bag.includes(s.trim()));
}

export function processWorkbook(wb: WorkBook, fileName: string, baseDate: string): AppData {
  // Validação de abas (normaliza espaços/caixa, preserva nomes originais).
  const sheetMap = new Map<string, string>(); // normalizado -> nome real
  wb.SheetNames.forEach((n) => sheetMap.set(normText(n), n));
  const found: string[] = [];
  const missing: string[] = [];
  const realName: Partial<Record<SheetName, string>> = {};
  for (const expected of SHEET_NAMES) {
    const real = sheetMap.get(normText(expected));
    if (real) {
      found.push(expected);
      realName[expected] = real;
    } else {
      missing.push(expected);
    }
  }
  if (missing.length) {
    throw new SheetError(
      `Abas ausentes: ${missing.join(', ')}`,
      wb.SheetNames.slice(),
      missing,
    );
  }

  const envioDetail = new Map<string, EnvioDetail>();
  const chegadaDetail = new Map<string, ChegadaDetail>();
  const chegadaConfDetail = new Map<string, ChegadaConfDetail>();
  const regPendDetail = new Map<string, RegPendDetail>();
  const clientWait = new Map<string, boolean>();

  const backlog: BacklogRow[] = [];
  const events: EventRow[] = [];

  const pushEvent = (base: BacklogRow, evento: string, date: string) => {
    if (!date) return;
    events.push({
      date,
      evento,
      cod: base.cod,
      processo: base.processo,
      key: base.key,
      aba: base.aba,
      etapa: base.etapa,
      tipo: base.tipo,
      prioridade: prioridadeOf(date, baseDate),
      responsavel: base.responsavel,
      celula: base.celula,
      motivo: base.motivo,
      dono: base.dono,
    });
  };

  const str = (r: Row, k: string) => (r[k] === null || r[k] === undefined ? '' : String(r[k]).trim());

  // ---------- Aba 1: Ag. Envio Digitação ----------
  const aba1: SheetName = 'Ag. Envio Digitação';
  for (const r of readSheet(wb.Sheets[realName[aba1]!])) {
    const key = processKey(r['Processo']);
    if (!key) continue;
    const prevEmb = toIso(r['Previsão Embarque']);
    const emb = toIso(r['Embarque']);
    const prevCheg = toIso(r['Previsão Chegada']);
    const ta = str(r, 'Anuente');
    const dias = toInt(r['Qtd Dias Abertura']);
    const follow = toIso(r['Último Follow']);
    const obs = inlineText(r['Observação Digitação']);
    const checklist = str(r, 'Checklist DOC');
    const wait = clientWaitSignal(ta, str(r, 'Último Follow'), obs);

    if (!envioDetail.has(key)) {
      envioDetail.set(key, { prevEmb, emb, prevCheg, ta, dias, follow, obs, checklist });
      clientWait.set(key, wait);
    }

    const { dono, racional } = classifyDono({
      follow: str(r, 'Último Follow'),
      obs,
      anuente: ta,
      dias,
    });
    const primary = prevCheg || prevEmb || emb || '';
    const motivo = buildEnvioMotivo(ta, follow, dias, baseDate);
    const row: BacklogRow = {
      cod: str(r, 'CodProcesso'),
      processo: processName(r['Processo']),
      key,
      ref: refCliente(r['Processo']),
      aba: aba1,
      etapa: aba1,
      tipo: str(r, 'Tipo') || 'NÃO INFORMADO',
      celula: str(r, 'Célula'),
      responsavel: str(r, 'Cuidador Responsável') || 'NÃO INFORMADO',
      dias,
      data: primary,
      evento: '',
      prioridade: prioridadeOf(primary, baseDate),
      motivo,
      acao: buildEnvioAcao(ta, wait),
      dono: dono as Dono,
      donoRacional: racional,
      score: scoreOf(primary, baseDate),
      obs,
      follow,
    };
    backlog.push(row);
    // Eventos datados
    pushEvent(row, 'Previsão embarque', prevEmb);
    pushEvent(row, 'Embarque', emb);
    pushEvent(row, 'Chegada prevista', prevCheg);
  }

  // ---------- Aba 2: Ag. Chegada ----------
  const aba2: SheetName = 'Ag. Chegada';
  for (const r of readSheet(wb.Sheets[realName[aba2]!])) {
    const key = processKey(r['Processo']);
    if (!key) continue;
    const prevCheg = toIso(r['Prev. Chegada']);
    const digitacao = inlineText(r['Digitação']);
    const numerario = inlineText(r['Numerário']);
    const checklist = str(r, 'Checklist DOC');
    const mapa = str(r, 'Mapa Embalagem');
    const follow = toIso(r['Último Follow']);
    const dataDdl = toIso(r['data ddl para validacao']);
    const obs = inlineText(r['Observação Digitação']);
    const prazo = dateFromStatusText(r['Digitação']);

    if (!chegadaDetail.has(key)) {
      chegadaDetail.set(key, { prevCheg, digitacao, numerario, checklist, mapa, follow, dataDdl, obs });
    }

    const { dono, racional } = classifyDono({
      follow: str(r, 'Último Follow'),
      obs,
      numerario,
      digitacao,
      dias: 0,
    });
    const primary = prazo || prevCheg || '';
    const row: BacklogRow = {
      cod: str(r, 'CodProcesso'),
      processo: processName(r['Processo']),
      key,
      ref: refCliente(r['Processo']),
      aba: aba2,
      etapa: aba2,
      tipo: str(r, 'Tipo') || 'NÃO INFORMADO',
      celula: str(r, 'Célula'),
      responsavel: str(r, 'Cuidador Responsável') || 'NÃO INFORMADO',
      dias: 0,
      data: primary,
      evento: '',
      prioridade: prioridadeOf(primary, baseDate),
      motivo: buildChegadaMotivo(digitacao, numerario, follow, baseDate),
      acao: 'Concluir digitação/numerário e liberar para conferência.',
      dono: dono as Dono,
      donoRacional: racional,
      score: scoreOf(primary, baseDate),
      obs,
      follow,
    };
    backlog.push(row);
    pushEvent(row, 'Chegada prevista', prevCheg);
    pushEvent(row, 'Deadline documental', dataDdl);
    pushEvent(row, 'Prazo Digitação/Numerário', prazo);
  }

  // ---------- Aba 3: Chegada Confirmada ----------
  const aba3: SheetName = 'Chegada Confirmada';
  for (const r of readSheet(wb.Sheets[realName[aba3]!])) {
    const key = processKey(r['Processo']);
    if (!key) continue;
    const chegada = toIso(r['Chegada']);
    const digitacao = inlineText(r['Digitação']);
    const numerario = inlineText(r['Numerário']);
    const presenca = inlineText(r['Presença de Carga']);
    const anuente = str(r, 'Anuente');
    const mapa = str(r, 'Mapa Embalagem');
    const follow = toIso(r['Último Follow']);
    const obs = inlineText(r['Observação Digitação']);
    const prazo = dateFromStatusText(r['Digitação']);

    if (!chegadaConfDetail.has(key)) {
      chegadaConfDetail.set(key, { chegada, digitacao, numerario, presenca, anuente, mapa, follow, obs });
    }

    const { dono, racional } = classifyDono({
      follow: str(r, 'Último Follow'),
      obs,
      anuente,
      numerario,
      digitacao,
      dias: 0,
    });
    const primary = chegada || '';
    const row: BacklogRow = {
      cod: str(r, 'CodProcesso'),
      processo: processName(r['Processo']),
      key,
      ref: refCliente(r['Processo']),
      aba: aba3,
      etapa: aba3,
      tipo: str(r, 'Tipo') || 'NÃO INFORMADO',
      celula: str(r, 'Célula'),
      responsavel: str(r, 'Cuidador Responsável') || 'NÃO INFORMADO',
      dias: 0,
      data: primary,
      evento: '',
      prioridade: prioridadeOf(primary, baseDate),
      motivo: buildChegadaConfMotivo(digitacao, numerario, presenca, mapa),
      acao: 'Tratar pendência pós-chegada e encaminhar para registro.',
      dono: dono as Dono,
      donoRacional: racional,
      score: scoreOf(primary, baseDate),
      obs,
      follow,
    };
    backlog.push(row);
    pushEvent(row, 'Chegada confirmada', chegada);
    pushEvent(row, 'Prazo Digitação/Numerário', prazo);
  }

  // ---------- Aba 4: Registro com Pendência ----------
  const aba4: SheetName = 'Registro com Pendência';
  for (const r of readSheet(wb.Sheets[realName[aba4]!])) {
    const key = processKey(r['Processo']);
    if (!key) continue;
    const chegada = toIso(r['Chegada']);
    const canal = inlineText(r['Canal']);
    const icms = str(r, 'ICMS');
    const numerario = inlineText(r['Numerário']);
    const presenca = inlineText(r['Presença de Carga']);
    const mapa = str(r, 'Mapa Embalagem');
    const follow = toIso(r['Último Follow']);
    const obs = inlineText(r['Observação Digitação']);

    if (!regPendDetail.has(key)) {
      regPendDetail.set(key, { chegada, canal, icms, numerario, presenca, mapa, follow, obs });
    }

    const { dono, racional } = classifyDono({
      follow: str(r, 'Último Follow'),
      obs,
      numerario,
      dias: 0,
    });
    const primary = chegada || '';
    const row: BacklogRow = {
      cod: str(r, 'CodProcesso'),
      processo: processName(r['Processo']),
      key,
      ref: refCliente(r['Processo']),
      aba: aba4,
      etapa: aba4,
      tipo: str(r, 'Tipo') || 'NÃO INFORMADO',
      celula: str(r, 'Célula'),
      responsavel: str(r, 'Cuidador Responsável') || 'NÃO INFORMADO',
      dias: 0,
      data: primary,
      evento: '',
      prioridade: prioridadeOf(primary, baseDate),
      motivo: buildRegPendMotivo(icms, numerario, canal),
      acao: 'Sanear pendência de registro (bloqueio/débito) e efetivar DI.',
      dono: dono as Dono,
      donoRacional: racional,
      score: scoreOf(primary, baseDate),
      obs,
      follow,
    };
    backlog.push(row);
    pushEvent(row, 'Chegada confirmada', chegada);
  }

  // Índice por processo.
  const byKey = new Map<string, BacklogRow[]>();
  backlog.forEach((r) => {
    if (!byKey.has(r.key)) byKey.set(r.key, []);
    byKey.get(r.key)!.push(r);
  });

  // Opções de filtro (ordenadas, únicas).
  const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const cells = uniq(backlog.map((r) => r.celula));
  const responsaveis = uniq(backlog.map((r) => r.responsavel));
  const eventTypes = uniq(events.map((e) => e.evento));
  const prioridades = uniq(backlog.map((r) => r.prioridade).concat(events.map((e) => e.prioridade)));
  const donos = uniq(backlog.map((r) => r.dono));

  return {
    fileName,
    baseDate,
    sheetsFound: found,
    sheetsMissing: missing,
    backlog,
    events,
    envioDetail,
    chegadaDetail,
    chegadaConfDetail,
    regPendDetail,
    clientWait,
    byKey,
    cells,
    responsaveis,
    eventTypes,
    prioridades,
    donos,
    modals: ['Aéreo', 'Marítimo', 'Rodoviário', 'N/I'],
    abas: SHEET_NAMES.slice(),
  };
}

// ---------- Geradores de motivo ----------
function buildEnvioMotivo(ta: string, follow: string, dias: number, baseDate: string): string {
  const parts: string[] = [];
  const t = normText(ta);
  if (t === 'NAO ENVIADO') parts.push('Item não enviado (depende da Freitas)');
  else if (t === 'AGUARDANDO NCM') parts.push('Aguardando NCM do cliente');
  if (follow) {
    const n = diffDays(follow, baseDate);
    if (n !== null && n <= -7) parts.push(`Último follow há ${Math.abs(n)} dias`);
  } else {
    parts.push('Sem follow registrado');
  }
  if (dias >= 180) parts.push(`Processo antigo (${dias} dias de abertura)`);
  return parts.join('; ') || 'Revisar pendência para liberar envio à digitação.';
}

function buildEnvioAcao(ta: string, wait: boolean): string {
  const t = normText(ta);
  if (t === 'NAO ENVIADO') return 'Validar documentação e enviar pendência/anuente para digitação.';
  if (wait) return 'Cobrar cliente pelos documentos/correção pendentes.';
  return 'Revisar pendência e liberar envio para digitação.';
}

function buildChegadaMotivo(digitacao: string, numerario: string, follow: string, baseDate: string): string {
  const parts: string[] = [];
  const d = normText(digitacao);
  const n = normText(numerario);
  if (d.includes('VENCID')) parts.push('Prazo de digitação vencido');
  else if (d.includes('PRAZO')) parts.push('Digitação com prazo em curso');
  if (n === 'NAO ENVIADO') parts.push('Numerário não enviado');
  else if (n.includes('AG. DEPOSITO') || n.includes('AGUARDANDO DEPOSITO')) parts.push('Aguardando depósito de numerário');
  else if (n.includes('DEBITO CLIENTE')) parts.push('Débito do cliente pendente');
  if (follow) {
    const f = diffDays(follow, baseDate);
    if (f !== null && f <= -7) parts.push(`Último follow há ${Math.abs(f)} dias`);
  }
  return parts.join('; ') || 'Concluir digitação/numerário e liberar conferência.';
}

function buildChegadaConfMotivo(digitacao: string, numerario: string, presenca: string, mapa: string): string {
  const parts: string[] = [];
  const d = normText(digitacao);
  const n = normText(numerario);
  const p = normText(presenca);
  const m = normText(mapa);
  if (d.includes('CONFERENCIA DI')) parts.push('Em conferência de DI');
  else if (d.includes('AG. REGISTRO') || d.includes('REGISTRO')) parts.push('Aguardando registro');
  else if (d.includes('ENVIO DIGITACAO') || d.includes('DIGITACAO')) parts.push('Digitação pendente');
  if (n === 'NAO ENVIADO') parts.push('Numerário não enviado');
  else if (n.includes('DEPOSITO')) parts.push('Aguardando depósito');
  else if (n.includes('DEBITO CLIENTE')) parts.push('Débito do cliente');
  if (p.includes('SEM PRESENCA')) parts.push('Sem presença de carga');
  if (m.includes('NAO INICIADO')) parts.push('Mapa/embalagem não iniciado');
  return parts.join('; ') || 'Chegada confirmada; tratar pendência posterior.';
}

function buildRegPendMotivo(icms: string, numerario: string, canal: string): string {
  const parts: string[] = [];
  const i = normText(icms);
  const n = normText(numerario);
  const c = normText(canal);
  if (i.includes('BLOQUEAD')) parts.push('ICMS bloqueado');
  if (c.includes('VERMELHO')) parts.push('Canal vermelho');
  else if (c.includes('AMARELO')) parts.push('Canal amarelo');
  if (n.includes('DEBITO CLIENTE')) parts.push('Débito do cliente');
  else if (n.includes('DEPOSITO')) parts.push('Aguardando depósito');
  return parts.join('; ') || 'Registro com pendência a sanear.';
}

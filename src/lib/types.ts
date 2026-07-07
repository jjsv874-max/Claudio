export const SHEET_NAMES = [
  'Ag. Envio Digitação',
  'Ag. Chegada',
  'Chegada Confirmada',
  'Registro com Pendência',
] as const;

export type SheetName = (typeof SHEET_NAMES)[number];

export type Modal = 'Aéreo' | 'Marítimo' | 'Rodoviário' | 'N/I';

export type Dono =
  | 'Freitas'
  | 'Cliente'
  | 'Externa/Órgão'
  | 'Longo prazo antigo'
  | 'Sem classificação';

export interface EnvioDetail {
  prevEmb: string;
  emb: string;
  prevCheg: string;
  ta: string;
  dias: number;
  follow: string;
  obs: string;
  checklist: string;
}

export interface ChegadaDetail {
  prevCheg: string;
  digitacao: string;
  numerario: string;
  checklist: string;
  mapa: string;
  follow: string;
  dataDdl: string;
  obs: string;
}

export interface ChegadaConfDetail {
  chegada: string;
  digitacao: string;
  numerario: string;
  presenca: string;
  anuente: string;
  mapa: string;
  follow: string;
  obs: string;
}

export interface RegPendDetail {
  chegada: string;
  canal: string;
  icms: string;
  numerario: string;
  presenca: string;
  mapa: string;
  follow: string;
  obs: string;
}

/** Registro base do backlog: uma linha por processo por aba. */
export interface BacklogRow {
  cod: string;
  processo: string; // nome de exibição (antes de @|@)
  key: string; // chave normalizada
  ref: string;
  aba: SheetName;
  etapa: string;
  tipo: string;
  celula: string;
  responsavel: string;
  dias: number;
  data: string; // data primária de exibição (ISO) ou ''
  evento: string;
  prioridade: string;
  motivo: string;
  acao: string;
  dono: Dono;
  donoRacional: string;
  score: number;
  obs: string;
  follow: string;
}

/** Evento datado para o calendário. */
export interface EventRow {
  date: string; // ISO
  evento: string;
  cod: string;
  processo: string;
  key: string;
  aba: SheetName;
  etapa: string;
  tipo: string;
  prioridade: string;
  responsavel: string;
  celula: string;
  motivo: string;
  dono: Dono;
}

export interface FlowStage {
  id: string;
  idx: string;
  name: string;
  short: string;
  source: string;
  desc: string;
  criteria: string;
  priority: string;
}

export interface AppData {
  fileName: string;
  baseDate: string; // ISO — data do processamento em America/Sao_Paulo
  sheetsFound: string[];
  sheetsMissing: string[];
  backlog: BacklogRow[];
  events: EventRow[];
  envioDetail: Map<string, EnvioDetail>;
  chegadaDetail: Map<string, ChegadaDetail>;
  chegadaConfDetail: Map<string, ChegadaConfDetail>;
  regPendDetail: Map<string, RegPendDetail>;
  clientWait: Map<string, boolean>;
  // Índices auxiliares
  byKey: Map<string, BacklogRow[]>;
  // Opções de filtro
  cells: string[];
  responsaveis: string[];
  eventTypes: string[];
  prioridades: string[];
  donos: string[];
  modals: Modal[];
  abas: string[];
}

export interface Filters {
  responsavel: string;
  celula: string;
  modal: string;
  evento: string;
  prioridade: string;
  dono: string;
  aba: string;
  etapa: string;
  prazo: string;
  busca: string;
}

export const EMPTY_FILTERS: Filters = {
  responsavel: '',
  celula: '',
  modal: '',
  evento: '',
  prioridade: '',
  dono: '',
  aba: '',
  etapa: '',
  prazo: '',
  busca: '',
};

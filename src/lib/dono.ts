import { normText } from './parse';
import type { Dono } from './types';

export interface DonoResult {
  dono: Dono;
  racional: string;
}

// Sinais consolidados (Handoff + Prompt Mestre).
const LONGO_PRAZO = [
  'ADMISSAO TEMPORARIA',
  'VENCIMENTO FUTURO',
  'ACOMPANHAMENTO',
  'RENOVACAO',
  'PRAZO DE REGIME',
  'REGIME ADUANEIRO',
  'ENTREPOSTO',
  'CONTROLE DE PRAZO',
];

const EXTERNA = [
  'MAPA',
  'ANUENTE',
  'TERMINAL',
  'ARMADOR',
  'AGENTE DE CARGA',
  'TRANSPORTADOR',
  'LICENCA',
  'LPCO',
  'SISCOMEX',
  'RECEITA',
  'ANATEL',
  'ANVISA',
  'DECEX',
  'IBAMA',
  'ANALISE FISCAL',
];

const CLIENTE = [
  'AGUARDANDO CLIENTE',
  'AGUARDANDO NCM',
  'AGUARDANDO DOCUMENTOS',
  'AGUARDANDO CORRECAO',
  'AGUARDANDO RETORNO',
  'FALTA INVOICE',
  'FALTA PACKING',
  'FALTA BL',
  'FALTA HBL',
  'SEM RETORNO',
  'AGUARDANDO DEPOSITO',
  'AG. DEPOSITO',
  'DEBITO CLIENTE',
  'RETORNO DO CLIENTE',
  'RETORNO DO IMPORTADOR',
  'PROVIDENCIAR ALTERACOES',
  'AGUARDA RETORNO',
  'INVOICE',
  'PACKING',
  'CORRECAO',
];

const FREITAS = [
  'NAO ENVIADO',
  'ITEM NAO ENVIADO',
  'FALTA ENVIAR',
  'PENDENTE ANALISE',
  'CONFERIR',
  'VALIDAR',
  'PROVIDENCIAR INTERNO',
  'DIGITACAO PENDENTE',
  'NUMERARIO PENDENTE',
  'REGISTRO PENDENTE',
  'REGULARIZAR',
  'ENVIO DIGITACAO',
  'DEBITO FREITAS',
];

function hasAny(text: string, signals: string[]): string | null {
  for (const s of signals) if (text.includes(s)) return s;
  return null;
}

/**
 * Classifica o dono da pendência combinando follow, observação, status,
 * anuente/numerário e antiguidade. Segue a ordem de precedência do handoff.
 */
export function classifyDono(params: {
  follow?: unknown;
  obs?: unknown;
  anuente?: unknown;
  numerario?: unknown;
  digitacao?: unknown;
  dias?: number;
}): DonoResult {
  const dias = params.dias ?? 0;
  const bag = normText(
    [params.follow, params.obs, params.anuente, params.numerario, params.digitacao]
      .filter(Boolean)
      .join(' | '),
  );

  // 1. Longo prazo antigo — exige sinal explícito de controle de longo prazo.
  const lp = hasAny(bag, LONGO_PRAZO);
  if (lp) {
    return {
      dono: 'Longo prazo antigo',
      racional: 'Processo controlado de longo prazo: validar se permanece em acompanhamento.',
    };
  }

  // 2. Externa/Órgão — dependência de órgão anuente/terceiro.
  const ex = hasAny(bag, EXTERNA);
  if (ex) {
    return {
      dono: 'Externa/Órgão',
      racional: `Dependência externa/órgão identificada (${ex.toLowerCase()}).`,
    };
  }

  // 3. Cliente — espera documental ou financeira do cliente.
  const cl = hasAny(bag, CLIENTE);
  if (cl) {
    return {
      dono: 'Cliente',
      racional: 'Pendência depende de documento, correção ou depósito do cliente.',
    };
  }

  // 4. Freitas — ação interna pendente.
  const fr = hasAny(bag, FREITAS);
  if (fr) {
    return {
      dono: 'Freitas',
      racional: 'Pendência sinalizada como ação interna da Freitas.',
    };
  }

  // 5. Antiguidade extrema sem sinal claro → tratar como controle de longo prazo.
  if (dias >= 180 && !bag) {
    return {
      dono: 'Longo prazo antigo',
      racional: 'Processo antigo sem sinal recente: triagem por antiguidade.',
    };
  }

  return { dono: 'Sem classificação', racional: 'Sem sinal suficiente para classificar a pendência.' };
}

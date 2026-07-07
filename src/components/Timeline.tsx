import { useMemo, useState } from 'react';
import { brDate } from '../lib/parse';
import { Engine } from '../lib/derive';
import { FLOW_STAGES } from '../lib/stages';
import type { BacklogRow, Filters } from '../lib/types';
import { ModalBadge, priorityClass } from './ui';

interface Props {
  eng: Engine;
  filters: Filters;
  onOpenProcess: (key: string) => void;
}

export default function Timeline({ eng, filters, onOpenProcess }: Props) {
  const [stageId, setStageId] = useState('semPrevEmbarque');

  // Contagens por etapa (para a navegação).
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    FLOW_STAGES.forEach((s) => (m[s.id] = eng.flowStageRows(s.id, filters).length));
    return m;
  }, [eng, filters]);

  const stage = FLOW_STAGES.find((s) => s.id === stageId)!;
  const rows = useMemo(
    () => eng.flowStageRows(stageId, filters).sort(eng.flowSort(stageId)),
    [eng, stageId, filters],
  );
  const stats = eng.flowStats(rows, stageId);

  return (
    <div className="flow-layout">
      <div className="flow-nav">
        {FLOW_STAGES.map((s) => (
          <button
            key={s.id}
            className={`flow-nav-btn ${s.id === stageId ? 'active' : ''}`}
            onClick={() => setStageId(s.id)}
          >
            <span className="flow-nav-idx">{s.idx}</span>
            <span className="flow-nav-name">{s.name}</span>
            <span className="flow-nav-count">{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="flow-stage-head">
          <div className="flow-stage-idx">{stage.idx}</div>
          <div>
            <span className="flow-source-label">Origem: {stage.source}</span>
            <h3 style={{ fontSize: 18, color: 'var(--azul)' }}>{stage.name}</h3>
            <div className="muted" style={{ marginTop: 2 }}>
              {stage.desc}
            </div>
          </div>
        </div>

        <div className="flow-stat-row">
          <Stat n={stats.total} l="Processos" />
          <Stat n={stats.uniq} l="Únicos" />
          {stageId !== 'chegadaPendente' && <Stat n={stats.venc} l="Vencidos" />}
          <Stat n={stats.hoje} l="Hoje" />
          <Stat n={stats.d3} l="Próx. 3d" />
          <Stat n={stats.sem} l="Sem data" />
        </div>

        <div className="panel" style={{ boxShadow: 'none', background: '#f8f9fd' }}>
          <div className="panel-body" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            <b>Critério:</b> {stage.criteria}
            <br />
            <b>Prioridade:</b> {stage.priority}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty">Nenhum processo nesta etapa com os filtros atuais.</div>
        ) : (
          <div className="flow-cards">
            {rows.map((r) => (
              <StageCard key={r.key + r.aba} r={r} stageId={stageId} eng={eng} onOpen={() => onOpenProcess(r.key)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="flow-stat">
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}

function StageCard({
  r,
  stageId,
  eng,
  onOpen,
}: {
  r: BacklogRow;
  stageId: string;
  eng: Engine;
  onOpen: () => void;
}) {
  const p = eng.flowPriority(r, stageId);
  const cls = priorityClass(p.label);
  const modal = eng.modalOf(r);
  const cells = cardCells(r, stageId, eng);

  const ta = eng.taStatusOf(r);
  const taCls = taChipClass(ta);

  return (
    <div className={`flow-card ${cls}`} onClick={onOpen}>
      <div className="flow-card-top">
        <span className="proc-title">
          <span className="proc-name">{r.processo}</span>
          <ModalBadge modal={modal} rawType={eng.rawTypeOf(r)} />
        </span>
        <span className={`priority-tag ${cls}`}>{p.label}</span>
      </div>

      {['semPrevEmbarque', 'semPrevChegada', 'comPrevChegada', 'aguardandoCliente'].includes(stageId) && (
        <div className="flow-chips">
          <span className={`flow-chip ${taCls}`}>TA: {ta || '—'}</span>
          <span className="flow-chip">{eng.daysOpenOf(r)} dias aberto</span>
        </div>
      )}

      <div className="data-grid">
        {cells.map(([k, v]) => (
          <div className="data-cell" key={k}>
            <span className="k">{k}</span>
            <span className="v" title={v}>
              {v || '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="flow-motive">{eng.cleanOperationalMotive(r) || 'Sem motivo identificado.'}</div>
    </div>
  );
}

function taChipClass(ta: string): string {
  const s = (ta || '').toUpperCase();
  if (s === 'NÃO ENVIADO' || s === 'NAO ENVIADO') return 'ta0';
  if (s === 'AGUARDANDO NCM') return 'ta1';
  if (s === 'INEXISTENTE') return 'ta2';
  return '';
}

/** Campos do card conforme a etapa — labels sempre explícitos. */
function cardCells(r: BacklogRow, stageId: string, eng: Engine): [string, string][] {
  const { envio, cheg, conf, reg } = eng.details(r.key);
  const D = (iso?: string) => brDate(iso || '');

  if (['semPrevEmbarque', 'semPrevChegada', 'comPrevChegada', 'aguardandoCliente'].includes(stageId)) {
    return [
      ['Prev. Embarque', D(envio?.prevEmb)],
      ['Embarque', D(envio?.emb)],
      ['Prev. Chegada', D(envio?.prevCheg)],
      ['Último Follow', D(envio?.follow)],
      ['Célula', r.celula || '—'],
      ['Responsável', r.responsavel || '—'],
    ];
  }
  if (stageId === 'conferidoAgChegada') {
    return [
      ['Prev. Chegada', D(cheg?.prevCheg)],
      ['Digitação', cheg?.digitacao || r.etapa],
      ['Checklist', cheg?.checklist || '—'],
      ['Numerário', cheg?.numerario || '—'],
      ['Último Follow', D(cheg?.follow)],
      ['Responsável', r.responsavel || '—'],
    ];
  }
  if (stageId === 'chegadaPendente') {
    return [
      ['Chegada Confirmada', D(conf?.chegada || eng.actualArrivalOf(r))],
      ['Digitação', conf?.digitacao || '—'],
      ['Numerário', conf?.numerario || '—'],
      ['Presença', conf?.presenca || '—'],
      ['Anuente', conf?.anuente || '—'],
      ['Mapa', conf?.mapa || '—'],
    ];
  }
  if (stageId === 'digitacao') {
    return [
      ['Prazo Digitação', D(eng.flowPrimaryDate(r, stageId))],
      ['Prev. Chegada', D(cheg?.prevCheg || conf?.chegada)],
      ['Status Digitação', cheg?.digitacao || conf?.digitacao || '—'],
      ['Numerário', cheg?.numerario || conf?.numerario || '—'],
      ['Último Follow', D(cheg?.follow || conf?.follow)],
      ['Responsável', r.responsavel || '—'],
    ];
  }
  if (stageId === 'numerario') {
    return [
      ['Prazo Numerário', D(eng.flowPrimaryDate(r, stageId))],
      ['Numerário', cheg?.numerario || conf?.numerario || reg?.numerario || '—'],
      ['Chegada', D(conf?.chegada || reg?.chegada || cheg?.prevCheg)],
      ['Presença', conf?.presenca || reg?.presenca || '—'],
      ['Célula', r.celula || '—'],
      ['Responsável', r.responsavel || '—'],
    ];
  }
  if (stageId === 'conferencia') {
    return [
      ['Chegada', D(conf?.chegada || eng.actualArrivalOf(r) || cheg?.prevCheg)],
      ['Digitação', conf?.digitacao || cheg?.digitacao || '—'],
      ['Numerário', conf?.numerario || cheg?.numerario || '—'],
      ['Etapa', r.etapa],
      ['Célula', r.celula || '—'],
      ['Responsável', r.responsavel || '—'],
    ];
  }
  if (stageId === 'registro') {
    return [
      ['Chegada Confirmada', D(reg?.chegada || conf?.chegada)],
      ['Canal', reg?.canal || '—'],
      ['ICMS', reg?.icms || '—'],
      ['Numerário', reg?.numerario || conf?.numerario || '—'],
      ['Célula', r.celula || '—'],
      ['Responsável', r.responsavel || '—'],
    ];
  }
  return [
    ['Data', D(eng.flowPrimaryDate(r, stageId))],
    ['Aba', r.aba],
    ['Etapa', r.etapa],
    ['Célula', r.celula || '—'],
    ['Responsável', r.responsavel || '—'],
    ['Dono', r.dono],
  ];
}

import { useEffect } from 'react';
import { brDate } from '../lib/parse';
import { Engine, shortEventName, type DashItem } from '../lib/derive';
import { ModalBadge } from './ui';

export interface DrilldownSpec {
  type: 'all' | 'overdue' | 'nodate' | 'stage' | 'milestone' | 'analyst';
  value?: string;
  analyst?: string;
  title: string;
}

interface Props {
  spec: DrilldownSpec;
  items: DashItem[];
  eng: Engine;
  onOpenProcess: (key: string) => void;
  onClose: () => void;
}

export default function DrilldownModal({ spec, items, eng, onOpenProcess, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const overdue = items.filter((x) => x.priority.label === 'Vencido').length;
  const noDate = items.filter((x) => !eng.flowPrimaryDate(x.row, x.stage.id)).length;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 1120 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{spec.title}</h3>
            <div className="mh-sub">Lista deduplicada pela regra gerencial (1 processo = 1 posição) e filtros ativos.</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="drill-toolbar">
            <span className="count">{items.length} processo(s)</span>
            <span className="badge red">{overdue} vencido(s)</span>
            <span className="badge orange">{noDate} sem data</span>
            {spec.analyst && <span className="badge blue">{spec.analyst}</span>}
          </div>
          {items.length === 0 ? (
            <div className="empty">Nenhum processo neste recorte.</div>
          ) : (
            <div className="drill-list">
              {items.map((it) => (
                <DrillCard key={it.key} it={it} eng={eng} onOpen={() => onOpenProcess(it.key)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DrillCard({ it, eng, onOpen }: { it: DashItem; eng: Engine; onOpen: () => void }) {
  const r = it.row;
  const date = eng.flowPrimaryDate(r, it.stage.id);
  const overdue = it.priority.label === 'Vencido';
  return (
    <div className={`drill-card ${overdue ? 'overdue' : ''}`} onClick={onOpen}>
      <div className="top">
        <span className="proc-title">
          <span className="proc-name">{r.processo}</span>
          <ModalBadge modal={eng.modalOf(r)} rawType={eng.rawTypeOf(r)} />
        </span>
        <span className={`badge ${overdue ? 'red' : !date ? 'orange' : 'green'}`}>{it.priority.label}</span>
      </div>
      <div className="meta">
        <div>
          <b>Analista:</b> {r.responsavel}
        </div>
        <div>
          <b>Etapa:</b> {it.stage.name}
        </div>
        <div>
          <b>Data-chave:</b> {date ? brDate(date) : 'Sem data'}
        </div>
        <div>
          <b>Origem:</b> {r.aba} · <b>Célula:</b> {r.celula || '—'}
        </div>
        <div>
          <b>Dono:</b> {r.dono}
        </div>
      </div>
      <div className="reason">{eng.cleanOperationalMotive(r) || 'Sem motivo detalhado.'}</div>
    </div>
  );
}

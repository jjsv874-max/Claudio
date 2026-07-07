import { useEffect } from 'react';
import { brDate } from '../lib/parse';
import type { Engine } from '../lib/derive';
import type { AppData } from '../lib/types';
import { FLOW_STAGES } from '../lib/stages';
import { ModalBadge } from './ui';

interface Props {
  processKey: string;
  data: AppData;
  eng: Engine;
  onClose: () => void;
}

export default function ProcessModal({ processKey, data, eng, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = data.byKey.get(processKey) || [];
  const primary = rows[0];
  if (!primary) return null;

  const envio = data.envioDetail.get(processKey);
  const cheg = data.chegadaDetail.get(processKey);
  const conf = data.chegadaConfDetail.get(processKey);
  const reg = data.regPendDetail.get(processKey);

  const modal = eng.modalOf(primary);
  const rawType = eng.rawTypeOf(primary);

  // Etapas da Timeline em que o processo aparece
  const stages = FLOW_STAGES.filter((s) =>
    eng.flowStageRows(s.id, allEmpty()).some((r) => r.key === processKey),
  );
  // etapa mais avançada = última detectada
  const topStage = stages[stages.length - 1];

  // Datas disponíveis (com label)
  const dateItems: [string, string][] = [];
  if (envio?.prevEmb) dateItems.push(['Prev. Embarque', envio.prevEmb]);
  if (envio?.emb) dateItems.push(['Embarque', envio.emb]);
  const prevCheg = envio?.prevCheg || cheg?.prevCheg || '';
  if (prevCheg) dateItems.push(['Prev. Chegada', prevCheg]);
  const chegada = conf?.chegada || reg?.chegada || '';
  if (chegada) dateItems.push(['Chegada Confirmada', chegada]);
  if (cheg?.dataDdl) dateItems.push(['Deadline documental', cheg.dataDdl]);

  const follow = envio?.follow || cheg?.follow || conf?.follow || reg?.follow || '';

  // Linha do tempo (ordenada por data)
  const timeline = [...dateItems]
    .filter(([, d]) => d)
    .sort((a, b) => a[1].localeCompare(b[1]));
  if (follow) timeline.push(['Último follow', follow]);

  const prio = topStage ? eng.flowPriority(primary, topStage.id) : { label: primary.prioridade, score: 0 };

  const digitacao = conf?.digitacao || cheg?.digitacao || '';
  const numerario = conf?.numerario || cheg?.numerario || reg?.numerario || '';
  const presenca = conf?.presenca || reg?.presenca || '';
  const mapa = conf?.mapa || cheg?.mapa || reg?.mapa || '';
  const checklist = cheg?.checklist || envio?.checklist || '';
  const obs = rows.map((r) => r.obs).filter(Boolean).join('\n———\n');
  const canal = reg?.canal || '';
  const icms = reg?.icms || '';

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{primary.processo}</h3>
            <div className="mh-sub">
              Código {primary.cod || '—'} {primary.ref ? `· Ref. cliente: ${primary.ref}` : ''}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <ModalBadge modal={modal} rawType={rawType} />
            {topStage && <span className="badge blue">{topStage.name}</span>}
            <MilestoneBadge id={eng.arrivalMilestoneForKey(processKey)} />
            <span className={`badge ${prio.label === 'Vencido' ? 'red' : prio.label === 'Sem data' ? 'orange' : 'green'}`}>
              {prio.label}
            </span>
            <span className="badge">{primary.dono}</span>
          </div>

          <div className="info-blocks">
            <div className="info-block">
              <h4>Identificação</h4>
              <Line k="Analista" v={primary.responsavel} />
              <Line k="Célula" v={primary.celula} />
              <Line k="Modal" v={`${modal}${rawType && rawType !== 'NÃO INFORMADO' ? ` (${rawType})` : ''}`} />
              <Line k="Aba(s) de origem" v={[...new Set(rows.map((r) => r.aba))].join(', ')} />
              <Line k="Etapa atual" v={topStage?.name || 'Sem etapa mapeada'} />
              <Line k="Prioridade" v={prio.label} />
              <Line k="Dias de abertura" v={primary.dias ? String(primary.dias) : '—'} />
            </div>
            <div className="info-block">
              <h4>Pendência</h4>
              <Line k="Dono da pendência" v={primary.dono} />
              <Line k="Racional" v={primary.donoRacional} />
              <Line k="Tratamento Adm." v={envio?.ta || '—'} />
              <Line k="Digitação" v={digitacao || '—'} />
              <Line k="Numerário" v={numerario || '—'} />
              <Line k="Presença de carga" v={presenca || '—'} />
              <Line k="Mapa / anuência" v={mapa || '—'} />
              {icms && <Line k="ICMS" v={icms} />}
              {canal && <Line k="Canal" v={canal} />}
            </div>
          </div>

          <div className="info-full">
            <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rosa)', margin: '14px 0 6px' }}>
              Datas relevantes
            </h4>
            <div className="data-grid">
              {dateItems.length ? (
                dateItems.map(([k, v]) => (
                  <div className="data-cell" key={k}>
                    <span className="k">{k}</span>
                    <span className="v">{brDate(v)}</span>
                  </div>
                ))
              ) : (
                <span className="muted">Sem data-chave registrada.</span>
              )}
            </div>
          </div>

          {timeline.length > 0 && (
            <div className="info-full">
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rosa)', margin: '14px 0 6px' }}>
                Linha do tempo do processo
              </h4>
              <div className="timeline-track">
                {timeline.map(([what, d], i) => (
                  <div className="tl-step" key={`${what}-${i}`}>
                    <div className="tl-date">{brDate(d)}</div>
                    <div className="tl-what">{what}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checklist && (
            <div className="info-full">
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rosa)', margin: '14px 0 6px' }}>
                Checklist documental
              </h4>
              <div className="box">{checklist}</div>
            </div>
          )}

          <div className="info-full">
            <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rosa)', margin: '14px 0 6px' }}>
              Motivo calculado
            </h4>
            <div className="box">{eng.cleanOperationalMotive(primary) || 'Sem motivo identificado.'}</div>
          </div>

          {obs && (
            <div className="info-full">
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rosa)', margin: '14px 0 6px' }}>
                Observações
              </h4>
              <div className="box">{obs}</div>
            </div>
          )}

          {follow && (
            <div className="info-full">
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rosa)', margin: '14px 0 6px' }}>
                Último follow
              </h4>
              <div className="box">{brDate(follow)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MilestoneBadge({ id }: { id: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    semPrevEmbarque: { label: 'Sem prev. embarque', cls: 'red' },
    comPrevisao: { label: 'Com previsão', cls: 'blue' },
    agChegada: { label: 'Aguardando chegada', cls: 'orange' },
    chegadaConfirmada: { label: 'Chegada confirmada', cls: 'green' },
  };
  const m = map[id] || map.semPrevEmbarque;
  return <span className={`badge ${m.cls}`} title="Maturidade do marco de chegada">⚓ {m.label}</span>;
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="info-line">
      <span className="lk">{k}</span>
      <span className="lv">{v || '—'}</span>
    </div>
  );
}

function allEmpty() {
  return {
    responsavel: '', celula: '', modal: '', evento: '', prioridade: '',
    dono: '', aba: '', etapa: '', prazo: '', busca: '',
  };
}

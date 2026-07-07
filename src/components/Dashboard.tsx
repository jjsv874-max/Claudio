import { useMemo, useState } from 'react';
import { Engine } from '../lib/derive';
import { FLOW_STAGES, DASHBOARD_UNMAPPED_STAGE, DASHBOARD_STAGE_COLORS } from '../lib/stages';
import type { Filters } from '../lib/types';
import DrilldownModal, { type DrilldownSpec } from './DrilldownModal';

interface Props {
  eng: Engine;
  filters: Filters;
  onOpenProcess: (key: string) => void;
}

const STAGE_CATALOG = FLOW_STAGES.concat([DASHBOARD_UNMAPPED_STAGE]);

const MATURITY_DEFS = [
  { id: 'semPrevEmbarque', label: 'Sem prev. embarque', cls: 'no-prev' },
  { id: 'comPrevisao', label: 'Com previsão', cls: 'with-prev' },
  { id: 'agChegada', label: 'Ag. chegada', cls: 'wait-arrival' },
  { id: 'chegadaConfirmada', label: 'Chegada confirmada', cls: 'confirmed' },
] as const;

export default function Dashboard({ eng, filters, onOpenProcess }: Props) {
  const [selected, setSelected] = useState('');
  const [drill, setDrill] = useState<DrilldownSpec | null>(null);

  const portfolios = useMemo(() => eng.dashboardPortfolio(filters), [eng, filters]);
  const assigned = useMemo(() => eng.dashboardAssigned(filters), [eng, filters]);
  const maturity = useMemo(() => eng.arrivalMaturity(filters), [eng, filters]);

  const totalProc = assigned.length;
  const overdue = assigned.filter((x) => x.priority.label === 'Vencido').length;
  const noDate = assigned.filter((x) => !eng.flowPrimaryDate(x.row, x.stage.id)).length;
  const stageCounts = new Map<string, number>();
  assigned.forEach((x) => stageCounts.set(x.stage.id, (stageCounts.get(x.stage.id) || 0) + 1));
  const topOverall = [...stageCounts.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  const topOverallStage = STAGE_CATALOG.find((s) => s.id === topOverall[0]) || DASHBOARD_UNMAPPED_STAGE;

  const focus = portfolios.find((g) => g.analyst === selected) || portfolios[0];
  const maxCell = Math.max(1, ...portfolios.flatMap((g: any) => STAGE_CATALOG.map((s) => g.stages.get(s.id) || 0)));

  const drillItems = useMemo(
    () => (drill ? eng.dashboardDrilldown(filters, drill.type, drill.value, drill.analyst) : []),
    [eng, filters, drill],
  );

  const openDrill = (spec: DrilldownSpec) => setDrill(spec);

  const kpis: { k: string; v: number | string; c: string; s: string; spec?: DrilldownSpec }[] = [
    { k: 'Analistas', v: portfolios.length, c: '', s: 'com carteira ativa' },
    { k: 'Processos únicos', v: totalProc, c: '', s: 'sem duplicar etapas', spec: { type: 'all', title: 'Carteira única de processos' } },
    {
      k: 'Vencidos', v: overdue, c: 'alert', s: totalProc ? `${Math.round((overdue / totalProc) * 100)}% da carteira` : '0%',
      spec: { type: 'overdue', title: 'Processos vencidos' },
    },
    { k: 'Sem data-chave', v: noDate, c: 'warn', s: 'exigem triagem', spec: { type: 'nodate', title: 'Processos sem data-chave' } },
    {
      k: 'Maior gargalo', v: topOverall[1], c: '', s: topOverallStage.name,
      spec: { type: 'stage', value: topOverallStage.id, title: topOverallStage.name },
    },
  ];

  const maxMaturity = Math.max(1, ...MATURITY_DEFS.map((d) => maturity.buckets[d.id].length));

  return (
    <div>
      {/* Barra de maturidade do marco de chegada */}
      <div className="maturity">
        <div className="maturity-head">
          <div>
            <h3>Maturidade do marco de chegada</h3>
            <p>Processos únicos da tela atual — a chegada confirmada prevalece sobre os marcos anteriores. Clique para auditar.</p>
          </div>
          <div className="maturity-total">{maturity.total} processo(s)</div>
        </div>
        <div className="maturity-grid">
          {MATURITY_DEFS.map((d) => {
            const n = maturity.buckets[d.id].length;
            const w = n ? Math.max(4, (n / maxMaturity) * 100) : 0;
            return (
              <div
                key={d.id}
                className={`maturity-item ${d.cls}`}
                title={`Abrir ${n} processo(s)`}
                onClick={() => openDrill({ type: 'milestone', value: d.id, title: `Maturidade · ${d.label}` })}
              >
                <div className="top">
                  <span className="label">{d.label}</span>
                  <span className="count">{n}</span>
                </div>
                <div className="maturity-track">
                  <div className="maturity-fill" style={{ width: `${w}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="kpi-row">
        {kpis.map((x) => (
          <div
            key={x.k}
            className={`kpi ${x.c} ${x.spec ? 'clickable' : ''}`}
            title={x.spec ? 'Clique para listar os processos' : undefined}
            onClick={x.spec ? () => openDrill(x.spec!) : undefined}
          >
            <div className="k">{x.k}</div>
            <div className="v">{x.v}</div>
            <div className="s">{x.s}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Ranking de analistas</h3>
              <div className="sub">Carteira única por analista · etapa mais avançada detectada</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="analyst-ranking">
              {portfolios.length === 0 && <div className="empty">Nenhuma carteira com os filtros atuais.</div>}
              {portfolios.map((g: any) => (
                <div
                  key={g.analyst}
                  className={`analyst-row ${focus?.analyst === g.analyst ? 'active' : ''}`}
                  onClick={() => setSelected(g.analyst)}
                >
                  <div className="analyst-row-top">
                    <div className="analyst-name" title={g.analyst}>
                      {g.analyst}
                    </div>
                    <div className="analyst-total">{g.total} proc.</div>
                    <div
                      className="analyst-top-stage clickable"
                      title={`Abrir processos em ${g.topStage.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrill({ type: 'stage', value: g.topStage.id, analyst: g.analyst, title: `${g.topStage.name} · ${g.analyst}` });
                      }}
                    >
                      {g.topStage.name} · {g.concentration}%
                    </div>
                    <div
                      className="analyst-risk clickable"
                      title="Abrir vencidos"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrill({ type: 'overdue', analyst: g.analyst, title: `Vencidos · ${g.analyst}` });
                      }}
                    >
                      {g.overdue} venc.
                    </div>
                  </div>
                  <div className="analyst-bars">
                    {STAGE_CATALOG.map((s, i) => {
                      const c = g.stages.get(s.id) || 0;
                      if (!c) return null;
                      return (
                        <span
                          key={s.id}
                          className="analyst-bar-seg"
                          title={`${s.name}: ${c}`}
                          style={{ width: `${(c / g.total) * 100}%`, background: DASHBOARD_STAGE_COLORS[i % DASHBOARD_STAGE_COLORS.length] }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Detalhe do analista</h3>
              <div className="sub">Distribuição da carteira e alertas</div>
            </div>
          </div>
          <div className="panel-body">
            {!focus ? (
              <div className="empty">Sem dados para detalhar.</div>
            ) : (
              <FocusPanel focus={focus} onDrill={openDrill} />
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Matriz Analista × Etapa</h3>
            <div className="sub">Clique numa célula para auditar os processos daquele cruzamento</div>
          </div>
        </div>
        <div className="panel-body matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>Analista</th>
                {STAGE_CATALOG.map((s) => (
                  <th key={s.id} title={s.name}>
                    {s.short}
                  </th>
                ))}
                <th>Total</th>
                <th>Maior conc.</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map((g: any) => (
                <tr key={g.analyst}>
                  <td>
                    <button className="link-btn" onClick={() => setSelected(g.analyst)}>
                      {g.analyst}
                    </button>
                  </td>
                  {STAGE_CATALOG.map((s) => {
                    const n = g.stages.get(s.id) || 0;
                    return (
                      <td key={s.id}>
                        <span
                          className="heat"
                          style={heatStyle(n, maxCell)}
                          role={n ? 'button' : undefined}
                          onClick={() =>
                            n && openDrill({ type: 'stage', value: s.id, analyst: g.analyst, title: `${s.name} · ${g.analyst}` })
                          }
                        >
                          {n || '–'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="total-cell">{g.total}</td>
                  <td>
                    {g.topStage.short} <strong>{g.concentration}%</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Insights gerenciais</h3>
        </div>
        <div className="panel-body">
          <div className="insight-list">{insights(portfolios, topOverallStage, overdue, totalProc)}</div>
        </div>
      </div>

      {drill && (
        <DrilldownModal
          spec={drill}
          items={drillItems}
          eng={eng}
          onOpenProcess={onOpenProcess}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}

function FocusPanel({ focus, onDrill }: { focus: any; onDrill: (s: DrilldownSpec) => void }) {
  const rows = STAGE_CATALOG.map((s) => ({ s, count: focus.stages.get(s.id) || 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const max = rows[0]?.count || 1;
  const alerts: React.ReactNode[] = [];
  if (focus.concentration >= 45)
    alerts.push(
      <div className="dash-alert critical" key="c">
        <strong>Concentração alta:</strong> {focus.concentration}% da carteira está em “{focus.topStage.name}”. Validar gargalo e capacidade.
      </div>,
    );
  if (focus.overdueRate >= 25)
    alerts.push(
      <div className="dash-alert critical" key="o">
        <strong>Backlog vencido:</strong> {focus.overdueRate}% da carteira está vencida. Priorizar saneamento.
      </div>,
    );
  if (focus.noDate > 0)
    alerts.push(
      <div className="dash-alert" key="n">
        <strong>Sem data-chave:</strong> {focus.noDate} processo(s) sem marco suficiente para gestão por prazo.
      </div>,
    );
  if (!alerts.length)
    alerts.push(
      <div className="dash-alert" key="ok">
        <strong>Leitura:</strong> carteira sem concentração crítica pelos limiares gerenciais atuais.
      </div>,
    );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--azul)' }}>{focus.analyst}</div>
          <div className="muted">Maior volume: {focus.topStage.name} · Modal principal: {focus.topModal}</div>
        </div>
        <span
          className={`badge ${focus.overdue ? 'red' : 'green'} clickable`}
          onClick={() => focus.overdue && onDrill({ type: 'overdue', analyst: focus.analyst, title: `Vencidos · ${focus.analyst}` })}
        >
          {focus.overdue} vencidos
        </span>
      </div>

      <div className="focus-stats">
        <div
          className="focus-stat clickable"
          onClick={() => onDrill({ type: 'analyst', value: focus.analyst, analyst: focus.analyst, title: `Carteira · ${focus.analyst}` })}
        >
          <div className="n">{focus.total}</div>
          <div className="l">processos únicos</div>
        </div>
        <div className="focus-stat">
          <div className="n">{focus.concentration}%</div>
          <div className="l">na maior etapa</div>
        </div>
        <div
          className="focus-stat clickable"
          onClick={() => focus.noDate && onDrill({ type: 'nodate', analyst: focus.analyst, title: `Sem data-chave · ${focus.analyst}` })}
        >
          <div className="n">{focus.noDate}</div>
          <div className="l">sem data-chave</div>
        </div>
      </div>

      <div className="section-title">Distribuição por etapa</div>
      {rows.map((x) => (
        <div
          className="stage-volume-row clickable"
          key={x.s.id}
          title={`Abrir ${x.count} processo(s)`}
          onClick={() => onDrill({ type: 'stage', value: x.s.id, analyst: focus.analyst, title: `${x.s.name} · ${focus.analyst}` })}
        >
          <div className="stage-volume-name" title={x.s.name}>
            {x.s.name}
          </div>
          <div className="stage-volume-track">
            <div className="stage-volume-fill" style={{ width: `${Math.max(4, (x.count / max) * 100)}%` }} />
          </div>
          <div className="stage-volume-value">{x.count}</div>
        </div>
      ))}

      <div className="dash-alerts" style={{ marginTop: 10 }}>
        {alerts}
      </div>
    </div>
  );
}

function heatStyle(count: number, maxCount: number): React.CSSProperties {
  if (!count) return { background: '#F6F8FB', color: '#98A2B3', cursor: 'default' };
  const ratio = maxCount ? count / maxCount : 0;
  const alpha = 0.1 + ratio * 0.38;
  return { background: `rgba(44,45,101,${alpha.toFixed(2)})`, color: ratio > 0.58 ? '#fff' : '#2C2D65', cursor: 'pointer' };
}

function insights(portfolios: any[], topStage: any, overdue: number, total: number): React.ReactNode {
  const out: React.ReactNode[] = [];
  const top = portfolios[0];
  if (top) {
    out.push(
      <div className="insight" key="1">
        <div className="t">Maior carteira</div>
        <div className="d">
          {top.analyst} concentra {top.total} processos, {top.concentration}% em “{top.topStage.name}”.
        </div>
      </div>,
    );
  }
  const worst = [...portfolios].sort((a, b) => b.overdue - a.overdue)[0];
  if (worst && worst.overdue > 0) {
    out.push(
      <div className="insight" key="2">
        <div className="t">Backlog vencido</div>
        <div className="d">
          {worst.analyst} possui {worst.overdue} vencido(s) em aberto ({worst.overdueRate}% da carteira).
        </div>
      </div>,
    );
  }
  out.push(
    <div className="insight" key="3">
      <div className="t">Gargalo geral</div>
      <div className="d">
        “{topStage.name}” é a etapa com maior volume. {overdue} de {total} processos estão vencidos ({total ? Math.round((overdue / total) * 100) : 0}%).
      </div>
    </div>,
  );
  const conc = portfolios.find((g) => g.concentration >= 45);
  if (conc) {
    out.push(
      <div className="insight" key="4">
        <div className="t">Concentração crítica</div>
        <div className="d">
          {conc.concentration}% da carteira de {conc.analyst} está em “{conc.topStage.name}”. Avaliar realocação.
        </div>
      </div>,
    );
  }
  return out;
}

import { useMemo, useState } from 'react';
import { Engine } from '../lib/derive';
import { FLOW_STAGES, DASHBOARD_UNMAPPED_STAGE, DASHBOARD_STAGE_COLORS } from '../lib/stages';
import type { Filters } from '../lib/types';

interface Props {
  eng: Engine;
  filters: Filters;
  onOpenProcess: (key: string) => void;
  onFilterStageAnalyst: (etapa: string, responsavel: string) => void;
}

const STAGE_CATALOG = FLOW_STAGES.concat([DASHBOARD_UNMAPPED_STAGE]);

export default function Dashboard({ eng, filters, onOpenProcess, onFilterStageAnalyst }: Props) {
  const [selected, setSelected] = useState('');
  const portfolios = useMemo(() => eng.dashboardPortfolio(filters), [eng, filters]);
  const assigned = useMemo(() => eng.dashboardAssigned(filters), [eng, filters]);

  const totalProc = assigned.length;
  const overdue = assigned.filter((x) => x.priority.label === 'Vencido').length;
  const noDate = assigned.filter((x) => !eng.flowPrimaryDate(x.row, x.stage.id)).length;
  const stageCounts = new Map<string, number>();
  assigned.forEach((x) => stageCounts.set(x.stage.id, (stageCounts.get(x.stage.id) || 0) + 1));
  const topOverall = [...stageCounts.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  const topOverallStage = STAGE_CATALOG.find((s) => s.id === topOverall[0]) || DASHBOARD_UNMAPPED_STAGE;

  const focus = portfolios.find((g) => g.analyst === selected) || portfolios[0];
  const maxCell = Math.max(1, ...portfolios.flatMap((g: any) => STAGE_CATALOG.map((s) => g.stages.get(s.id) || 0)));

  const kpis: [string, number | string, string, string][] = [
    ['Analistas', portfolios.length, '', 'com carteira ativa'],
    ['Processos únicos', totalProc, '', 'sem duplicar etapas'],
    ['Vencidos', overdue, 'alert', totalProc ? `${Math.round((overdue / totalProc) * 100)}% da carteira` : '0%'],
    ['Sem data-chave', noDate, 'warn', 'exigem triagem'],
    ['Maior gargalo', topOverall[1], '', topOverallStage.name],
  ];

  return (
    <div>
      <div className="kpi-row">
        {kpis.map(([k, v, c, s]) => (
          <div className={`kpi ${c}`} key={k}>
            <div className="k">{k}</div>
            <div className="v">{v}</div>
            <div className="s">{s}</div>
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
                    <div className="analyst-top-stage" title={g.topStage.name}>
                      {g.topStage.name} · {g.concentration}%
                    </div>
                    <div className="analyst-risk">{g.overdue} venc.</div>
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
              <FocusPanel focus={focus} eng={eng} onOpenProcess={onOpenProcess} />
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Matriz Analista × Etapa</h3>
            <div className="sub">Clique numa célula para filtrar o cruzamento na Timeline</div>
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
                          onClick={() => n && s.id !== 'naoMapeado' && onFilterStageAnalyst(s.id, g.analyst)}
                          role={n ? 'button' : undefined}
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
    </div>
  );
}

function FocusPanel({ focus, eng, onOpenProcess }: { focus: any; eng: Engine; onOpenProcess: (k: string) => void }) {
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

  const critical = focus.items
    .filter((x: any) => x.priority.label === 'Vencido')
    .slice(0, 8);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--azul)' }}>{focus.analyst}</div>
          <div className="muted">Maior volume: {focus.topStage.name} · Modal principal: {focus.topModal}</div>
        </div>
        <span className={`badge ${focus.overdue ? 'red' : 'green'}`}>{focus.overdue} vencidos</span>
      </div>

      <div className="focus-stats">
        <div className="focus-stat">
          <div className="n">{focus.total}</div>
          <div className="l">processos únicos</div>
        </div>
        <div className="focus-stat">
          <div className="n">{focus.concentration}%</div>
          <div className="l">na maior etapa</div>
        </div>
        <div className="focus-stat">
          <div className="n">{focus.noDate}</div>
          <div className="l">sem data-chave</div>
        </div>
      </div>

      <div className="section-title">Distribuição por etapa</div>
      {rows.map((x) => (
        <div className="stage-volume-row" key={x.s.id}>
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

      {critical.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 12 }}>
            Processos críticos (vencidos)
          </div>
          <div className="cards-col">
            {critical.map((x: any) => (
              <div className="detail-card" key={x.key} onClick={() => onOpenProcess(x.key)}>
                <div className="top">
                  <span className="proc-name">{x.row.processo}</span>
                  <span className="badge red">{x.stage.short}</span>
                </div>
                <div className="meta">
                  <b>Motivo:</b> {eng.cleanOperationalMotive(x.row) || '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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

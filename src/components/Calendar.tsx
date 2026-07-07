import { useMemo, useState } from 'react';
import { addDays, brDate, isoOf, parseIso, startOfWeek } from '../lib/parse';
import { Engine, groupCount, shortEventName, uniqueCount } from '../lib/derive';
import type { EventRow, Filters } from '../lib/types';
import { ModalBadge } from './ui';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface Props {
  eng: Engine;
  filters: Filters;
  onOpenProcess: (key: string) => void;
}

type Mode = 'recurring' | 'overdue';

export default function Calendar({ eng, filters, onOpenProcess }: Props) {
  const [mode, setMode] = useState<Mode>('recurring');
  const base = parseIso(eng.base)!;
  const [month, setMonth] = useState<Date>(new Date(base.getFullYear(), base.getMonth(), 1));
  const [selected, setSelected] = useState<string>(eng.base);

  const events = useMemo(() => eng.filteredEvents(filters), [eng, filters]);
  const overdue = useMemo(() => eng.overdueRows(filters), [eng, filters]);

  // D+1: item vencido aparece no dia seguinte ao prazo.
  const overdueStart = (r: EventRow) => {
    const d = parseIso(r.date);
    return d ? isoOf(addDays(d, 1)) : '';
  };

  const byDay = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    if (mode === 'recurring') {
      events.forEach((r) => {
        if (!r.date) return;
        (m.get(r.date) || m.set(r.date, []).get(r.date)!).push(r);
      });
    } else {
      overdue.forEach((r) => {
        const k = overdueStart(r);
        if (!k) return;
        (m.get(k) || m.set(k, []).get(k)!).push(r);
      });
    }
    return m;
  }, [mode, events, overdue]);

  const y = month.getFullYear();
  const mo = month.getMonth();
  const gridStart = startOfWeek(new Date(y, mo, 1));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const selectedList = (byDay.get(selected) || []).slice();
  if (mode === 'overdue') selectedList.sort((a, b) => (eng.overdueAge(b) ?? 0) - (eng.overdueAge(a) ?? 0));
  else selectedList.sort((a, b) => a.evento.localeCompare(b.evento) || a.processo.localeCompare(b.processo));

  return (
    <div>
      <div className="cal-toolbar">
        <div className="seg">
          <button className={mode === 'recurring' ? 'active' : ''} onClick={() => setMode('recurring')}>
            Calendário recorrente
          </button>
          <button className={mode === 'overdue' ? 'active' : ''} onClick={() => setMode('overdue')}>
            Calendário de vencidos {overdue.length ? `(${overdue.length})` : ''}
          </button>
        </div>
        <div className="appbar-spacer" />
        <div className="cal-nav">
          <button onClick={() => setMonth(new Date(y, mo - 1, 1))}>‹</button>
          <div className="cal-month-title">
            {mode === 'overdue' ? 'Vencidos • ' : ''}
            {MONTHS[mo]}/{y}
          </div>
          <button onClick={() => setMonth(new Date(y, mo + 1, 1))}>›</button>
          <button className="btn ghost" style={{ width: 'auto' }} onClick={() => setMonth(new Date(base.getFullYear(), base.getMonth(), 1))}>
            Hoje
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginBottom: 12 }}>
        {mode === 'overdue'
          ? 'Mostra somente prazos não concluídos. Cada item aparece no dia seguinte ao prazo original (D+1). Marcos concluídos deixam de contar. Clique no dia para detalhar.'
          : 'Cada dia mostra demandas operacionais em aberto. Embarque/chegada confirmados encerram a previsão. Clique no dia para detalhar.'}
      </div>

      {mode === 'overdue' && <OverdueAging overdue={overdue} eng={eng} />}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-body">
            <div className="cal-grid">
              {WEEKDAYS.map((w) => (
                <div className="cal-weekday" key={w}>
                  {w}
                </div>
              ))}
              {days.map((d) => {
                const iso = isoOf(d);
                const list = byDay.get(iso) || [];
                const groups = groupCount(list, 'evento');
                const severity =
                  mode === 'overdue' && list.length >= 10 ? 'overdue-critical' : mode === 'overdue' && list.length >= 5 ? 'overdue-heavy' : '';
                const cls = [
                  d.getMonth() !== mo ? 'other' : '',
                  iso === eng.base ? 'today' : '',
                  iso === selected ? 'selected' : '',
                  list.length ? '' : 'empty',
                  mode === 'overdue' && list.length ? 'overdue-day' : '',
                  severity,
                ].join(' ');
                return (
                  <div className={`cal-day ${cls}`} key={iso} onClick={() => setSelected(iso)}>
                    <div className="cal-day-head">
                      <span className="cal-day-num">{d.getDate()}</span>
                      <span className="cal-pill">{list.length}</span>
                    </div>
                    {groups.slice(0, 4).map(([name, count]) => (
                      <div className={`cal-event-line ${mode === 'overdue' ? 'overdue' : ''}`} key={name}>
                        <span>{shortEventName(name)}</span>
                        <span className="count">{count}</span>
                      </div>
                    ))}
                    {groups.length > 4 && <div className="cal-more">+{groups.length - 4} tipos</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>
                {mode === 'overdue' ? `Vencimentos iniciados em ${brDate(selected)}` : `Detalhe do dia — ${brDate(selected)}`}
              </h3>
              <div className="sub">
                {selectedList.length
                  ? `${selectedList.length} item(ns) · ${uniqueCount(selectedList, 'key')} processo(s)${mode === 'overdue' ? ' · exibido no D+1 do prazo' : ''}`
                  : 'Sem itens para os filtros atuais.'}
              </div>
            </div>
          </div>
          <div className="panel-body">
            <div className="day-detail-groups">
              {groupCount(selectedList, 'evento').map(([name]) => {
                const items = selectedList.filter((r) => r.evento === name);
                return (
                  <div key={name}>
                    <div className="group-title">
                      <span>{shortEventName(name)}</span>
                      <span>{items.length}</span>
                    </div>
                    <div className="cards-col">
                      {items.slice(0, 60).map((r, i) => (
                        <DayCard key={r.key + i} r={r} eng={eng} mode={mode} onOpen={() => onOpenProcess(r.key)} overdueStart={overdueStart} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {selectedList.length === 0 && <div className="empty">Nenhum item neste dia.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverdueAging({ overdue, eng }: { overdue: EventRow[]; eng: Engine }) {
  const b = (lo: number, hi: number) => overdue.filter((r) => { const n = eng.overdueAge(r); return n !== null && n >= lo && n <= hi; }).length;
  const cards: [string, number, string][] = [
    ['1–3 dias', b(1, 3), 'ação imediata'],
    ['4–7 dias', b(4, 7), 'atenção do líder'],
    ['8–15 dias', b(8, 15), 'backlog consolidando'],
    ['16–30 dias', b(16, 30), 'escalonar'],
    ['Mais de 30 dias', b(31, 99999), 'sanear'],
  ];
  const oldest = overdue.length ? Math.max(...overdue.map((r) => eng.overdueAge(r) ?? 0)) : 0;
  return (
    <div className="aging-row">
      <div className="aging-card">
        <div className="k">Vencidos</div>
        <div className="v">{overdue.length}</div>
        <div className="s">{uniqueCount(overdue, 'key')} processos · mais antigo {oldest}d</div>
      </div>
      {cards.map(([k, v, s]) => (
        <div className="aging-card" key={k}>
          <div className="k">{k}</div>
          <div className="v">{v}</div>
          <div className="s">{s}</div>
        </div>
      ))}
    </div>
  );
}

function DayCard({
  r,
  eng,
  mode,
  onOpen,
  overdueStart,
}: {
  r: EventRow;
  eng: Engine;
  mode: Mode;
  onOpen: () => void;
  overdueStart: (r: EventRow) => string;
}) {
  const n = eng.diff(r.date);
  const modal = eng.modalOf(r);
  if (mode === 'overdue') {
    const age = eng.overdueAge(r);
    return (
      <div className="detail-card" onClick={onOpen}>
        <div className="top">
          <span className="proc-title">
            <span className="proc-name">{r.processo}</span>
            <ModalBadge modal={modal} rawType={eng.rawTypeOf(r)} />
          </span>
          <span className="badge red">{age} dia(s) vencido</span>
        </div>
        <div className="meta">
          <b>Prazo original:</b> {brDate(r.date)} • <b>Virou vencido:</b> {brDate(overdueStart(r))}
          <br />
          <b>Evento:</b> {shortEventName(r.evento)} • <b>Célula:</b> {r.celula || '—'} • <b>Resp.:</b> {r.responsavel || '—'}
          <br />
          <b>Aba:</b> {r.aba} • <b>Dono:</b> {r.dono}
          <br />
          <b>Motivo:</b> {eng.cleanOperationalMotive(r) || '—'}
        </div>
      </div>
    );
  }
  const extra = n === null ? 'Sem data' : n < 0 ? `${Math.abs(n)}d vencido` : n === 0 ? 'Hoje' : `em ${n}d`;
  const cls = n === null ? 'green' : n < 0 ? 'red' : n <= 3 ? 'pink' : n <= 15 ? 'orange' : 'green';
  return (
    <div className="detail-card" onClick={onOpen}>
      <div className="top">
        <span className="proc-title">
          <span className="proc-name">{r.processo}</span>
          <ModalBadge modal={modal} rawType={eng.rawTypeOf(r)} />
        </span>
        <span className={`badge ${cls}`}>
          {shortEventName(r.evento)} • {extra}
        </span>
      </div>
      <div className="meta">
        <b>Célula:</b> {r.celula || '—'} • <b>Resp.:</b> {r.responsavel || '—'}
        <br />
        <b>Aba:</b> {r.aba} • <b>Dono:</b> {r.dono}
        <br />
        <b>Motivo:</b> {eng.cleanOperationalMotive(r) || '—'}
      </div>
    </div>
  );
}

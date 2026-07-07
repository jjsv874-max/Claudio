import { useEffect, useState } from 'react';
import { FLOW_STAGES } from '../lib/stages';
import type { AppData, Filters } from '../lib/types';

interface Props {
  data: AppData;
  filters: Filters;
  setFilters: (f: Filters) => void;
  onClear: () => void;
}

const PRAZO_OPTS: [string, string][] = [
  ['vencidos', 'Vencidos'],
  ['hoje', 'Hoje'],
  ['ate3', 'Até 3 dias'],
  ['ate7', 'Até 7 dias'],
  ['ate15', 'Até 15 dias'],
  ['ate30', 'Até 30 dias'],
  ['mais30', 'Mais de 30 dias'],
  ['semdata', 'Sem data'],
];

export default function FilterBar({ data, filters, setFilters, onClear }: Props) {
  const [q, setQ] = useState(filters.busca);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== filters.busca) setFilters({ ...filters, busca: q });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => setQ(filters.busca), [filters.busca]);

  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v });

  const chips = (Object.keys(filters) as (keyof Filters)[])
    .filter((k) => filters[k])
    .map((k) => {
      let label = filters[k];
      if (k === 'prazo') label = PRAZO_OPTS.find((o) => o[0] === label)?.[1] || label;
      if (k === 'etapa') label = FLOW_STAGES.find((s) => s.id === label)?.name || label;
      return { k, label };
    });

  return (
    <div className="filterbar">
      <div className="filter-grid">
        <Field label="Analista / Responsável">
          <select value={filters.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
            <option value="">Todos</option>
            {data.responsaveis.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Célula">
          <select value={filters.celula} onChange={(e) => set('celula', e.target.value)}>
            <option value="">Todas</option>
            {data.cells.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Etapa da Timeline">
          <select value={filters.etapa} onChange={(e) => set('etapa', e.target.value)}>
            <option value="">Todas</option>
            {FLOW_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.idx} · {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tarefa / Evento">
          <select value={filters.evento} onChange={(e) => set('evento', e.target.value)}>
            <option value="">Todas</option>
            {data.eventTypes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Faixa de prazo">
          <select value={filters.prazo} onChange={(e) => set('prazo', e.target.value)}>
            <option value="">Todas</option>
            {PRAZO_OPTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridade">
          <select value={filters.prioridade} onChange={(e) => set('prioridade', e.target.value)}>
            <option value="">Todas</option>
            {data.prioridades.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dono da pendência">
          <select value={filters.dono} onChange={(e) => set('dono', e.target.value)}>
            <option value="">Todos</option>
            {data.donos.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modal de transporte">
          <select value={filters.modal} onChange={(e) => set('modal', e.target.value)}>
            <option value="">Todos</option>
            {data.modals.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Aba de origem">
          <select value={filters.aba} onChange={(e) => set('aba', e.target.value)}>
            <option value="">Todas</option>
            {data.abas.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Busca livre">
          <input
            value={q}
            placeholder="Processo, responsável, motivo, obs…"
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
      </div>

      <div className="filter-foot">
        <div className="chips">
          {chips.length === 0 && <span className="muted">Nenhum filtro ativo — exibindo a base completa.</span>}
          {chips.map(({ k, label }) => (
            <span className="chip" key={k}>
              {label}
              <button title="Remover" onClick={() => set(k, '')}>
                ×
              </button>
            </span>
          ))}
        </div>
        <button className="btn ghost" onClick={onClear}>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Engine } from './lib/derive';
import { brDate } from './lib/parse';
import { EMPTY_FILTERS, type AppData, type Filters } from './lib/types';
import Upload from './components/Upload';
import FilterBar from './components/FilterBar';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Timeline from './components/Timeline';
import ParamsDrawer from './components/ParamsDrawer';
import ProcessModal from './components/ProcessModal';

type Tab = 'dashboard' | 'calendario' | 'timeline';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [processKey, setProcessKey] = useState<string | null>(null);

  const eng = useMemo(() => (data ? new Engine(data) : null), [data]);

  const counts = useMemo(() => {
    if (!eng) return { total: 0 };
    return { total: new Set(eng.filteredBacklog(filters).map((r) => r.key)).size };
  }, [eng, filters]);

  if (!data || !eng) {
    return <Upload onReady={(d) => setData(d)} />;
  }

  return (
    <div className="app-shell">
      <header className="appbar">
        <div className="brand">
          <div className="brand-logo">F</div>
          <div>
            <div className="brand-title">Pré-Registro | Gestão Operacional</div>
            <div className="brand-sub">Freitas · base {brDate(data.baseDate)}</div>
          </div>
        </div>
        <div className="appbar-spacer" />
        <div className="appbar-file">
          <span>📄</span>
          <b>{data.fileName}</b>
        </div>
        <div className="appbar-actions">
          <button className="btn secondary" onClick={() => setParamsOpen(true)}>
            Parâmetros
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setData(null);
              setFilters(EMPTY_FILTERS);
              setTab('dashboard');
            }}
          >
            Carregar outra planilha
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
          Dashboard
        </button>
        <button className={`tab ${tab === 'calendario' ? 'active' : ''}`} onClick={() => setTab('calendario')}>
          Calendário
        </button>
        <button className={`tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>
          Timeline
        </button>
        <div className="appbar-spacer" />
        <span className="tab" style={{ cursor: 'default', color: 'var(--ink-mute)' }}>
          {counts.total} processos no filtro
        </span>
      </nav>

      <main className="content">
        <FilterBar data={data} filters={filters} setFilters={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} />

        {tab === 'dashboard' && (
          <Dashboard
            eng={eng}
            filters={filters}
            onOpenProcess={setProcessKey}
            onFilterStageAnalyst={(etapa, responsavel) => {
              setFilters({ ...filters, etapa, responsavel });
              setTab('timeline');
            }}
          />
        )}
        {tab === 'calendario' && <Calendar eng={eng} filters={filters} onOpenProcess={setProcessKey} />}
        {tab === 'timeline' && <Timeline eng={eng} filters={filters} onOpenProcess={setProcessKey} />}
      </main>

      {paramsOpen && <ParamsDrawer data={data} onClose={() => setParamsOpen(false)} />}
      {processKey && <ProcessModal processKey={processKey} data={data} eng={eng} onClose={() => setProcessKey(null)} />}
    </div>
  );
}

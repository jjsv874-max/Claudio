import { useCallback, useRef, useState } from 'react';
import { read } from 'xlsx';
import { processWorkbook, SheetError } from '../lib/engine';
import { todaySaoPauloIso } from '../lib/parse';
import { SHEET_NAMES, type AppData } from '../lib/types';
import { UploadIcon, humanSize } from './ui';

interface Props {
  onReady: (data: AppData) => void;
}

interface ErrState {
  title: string;
  detail?: string;
  found?: string[];
  missing?: string[];
}

const STEPS = ['Lendo arquivo', 'Validando abas', 'Normalizando dados', 'Aplicando regras', 'Montando painel'];

export default function Upload({ onReady }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<ErrState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback((f: File | null | undefined) => {
    if (!f) return;
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) {
      setErr({ title: 'Extensão inválida', detail: 'Selecione um arquivo Excel .xlsx ou .xls.' });
      setFile(null);
      return;
    }
    setErr(null);
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      pick(e.dataTransfer.files?.[0]);
    },
    [pick],
  );

  const process = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      setStep(0);
      const buf = await file.arrayBuffer();
      await tick();
      setStep(1);
      const wb = read(buf, { type: 'array', cellDates: false });
      await tick();
      setStep(2);
      await tick();
      setStep(3);
      const baseDate = todaySaoPauloIso();
      const data = processWorkbook(wb, file.name, baseDate);
      await tick();
      setStep(4);
      await tick(120);
      if (!data.backlog.length) {
        throw new Error('O arquivo foi lido, mas nenhuma linha de processo foi encontrada nas abas esperadas.');
      }
      onReady(data);
    } catch (e) {
      if (e instanceof SheetError) {
        setErr({
          title: 'Abas esperadas não encontradas',
          detail: 'A aplicação precisa das quatro abas do Pré-Registro para processar o arquivo.',
          found: e.found,
          missing: e.missing,
        });
      } else {
        setErr({
          title: 'Não foi possível processar a planilha',
          detail:
            e instanceof Error
              ? e.message
              : 'Arquivo inválido ou corrompido. Verifique se é o Excel de Pré-Registro correto.',
        });
      }
      setBusy(false);
    }
  }, [file, onReady]);

  return (
    <div className="upload-screen">
      <div className="upload-card">
        <div className="upload-brand">
          <div className="brand-logo">F</div>
          <div style={{ textAlign: 'left' }}>
            <div className="upload-title">Pré-Registro</div>
            <div className="brand-sub" style={{ color: 'var(--ink-soft)' }}>
              Gestão Operacional · Freitas
            </div>
          </div>
        </div>
        <div className="upload-sub">
          Anexe a planilha de Pré-Registro. O processamento acontece 100% no seu navegador — nenhum dado é
          enviado a servidores.
        </div>

        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <div className="dropzone-icon">
            <UploadIcon />
          </div>
          <div className="dropzone-text">Arraste a planilha de Pré-Registro aqui ou selecione um arquivo</div>
          <div className="dropzone-hint">Formatos aceitos: .xlsx e .xls</div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        {file && (
          <div className="file-pill">
            <div className="fi">
              <span className="badge blue">XLS</span>
              <div style={{ minWidth: 0 }}>
                <div className="fname">{file.name}</div>
                <div className="fsize">{humanSize(file.size)}</div>
              </div>
            </div>
            {!busy && (
              <button className="btn ghost" onClick={() => setFile(null)}>
                Trocar
              </button>
            )}
          </div>
        )}

        {busy && (
          <div className="progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
            <div className="progress-step">
              {step + 1}/{STEPS.length} · {STEPS[step]}…
            </div>
          </div>
        )}

        {err && (
          <div className="err-box">
            <h4>{err.title}</h4>
            {err.detail && <div>{err.detail}</div>}
            {(err.found || err.missing) && (
              <div className="cols">
                <div>
                  <b>Abas esperadas</b>
                  <ul>
                    {SHEET_NAMES.map((s) => (
                      <li key={s} style={{ color: err.missing?.includes(s) ? 'var(--red)' : '#3a7d52' }}>
                        {s}
                        {err.missing?.includes(s) ? ' — ausente' : ' — ok'}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <b>Abas encontradas</b>
                  <ul>
                    {(err.found || []).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="upload-actions">
          <button className="btn" disabled={!file || busy} onClick={process}>
            {busy ? 'Processando…' : 'Processar planilha'}
          </button>
        </div>

        <div className="upload-foot">
          Sem login · sem banco de dados · sem histórico. Ao recarregar a página, o painel volta para esta tela de
          upload. Abas necessárias: {SHEET_NAMES.join(', ')}.
        </div>
      </div>
    </div>
  );
}

function tick(ms = 30): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

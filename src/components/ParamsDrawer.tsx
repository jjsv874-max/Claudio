import { useEffect } from 'react';
import { brDate } from '../lib/parse';
import { FLOW_STAGES } from '../lib/stages';
import type { AppData } from '../lib/types';

interface Props {
  data: AppData;
  onClose: () => void;
}

export default function ParamsDrawer({ data, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3 style={{ color: 'var(--azul)' }}>Parâmetros e regras</h3>
          <button className="modal-close" style={{ background: '#eef1f8', color: 'var(--azul)' }} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-body">
          <div className="param">
            <h4>Base de cálculo</h4>
            <p>
              Data de processamento (America/São_Paulo): <b>{brDate(data.baseDate)}</b>. Todos os prazos usam esta
              data — não há data-base fixa.
            </p>
          </div>
          <div className="param">
            <h4>Arquivo</h4>
            <p>
              {data.fileName} · {data.backlog.length} linhas · {new Set(data.backlog.map((r) => r.key)).size} processos
              únicos · {data.events.length} eventos datados.
            </p>
          </div>
          <div className="param">
            <h4>Regra D+1 (vencidos)</h4>
            <p>
              Um prazo só vira vencido no dia seguinte ao vencimento. Prazo em 30/06 sem conclusão passa a vencido em
              01/07. Nunca vencido no próprio dia.
            </p>
          </div>
          <div className="param">
            <h4>Ciclo concluído</h4>
            <p>
              Embarque confirmado encerra a previsão de embarque. Chegada confirmada encerra a previsão de chegada.
              Digitação avançada (Conferência DI, Conferido ag. chegada, Ag. registro) encerra o prazo anterior.
              Numerário pago/inexistente deixa de ser pendência.
            </p>
          </div>
          <div className="param">
            <h4>Processo como chave</h4>
            <p>
              O número do processo é a chave. Dentro da mesma etapa da Timeline não há duplicidade. O mesmo processo
              pode aparecer em abas e etapas diferentes quando operacionalmente válido.
            </p>
          </div>
          <div className="param">
            <h4>Dashboard por analista</h4>
            <p>
              Cada processo conta uma vez, posicionado na etapa mais avançada detectada, evitando inflar a carteira por
              sobreposição.
            </p>
          </div>
          <div className="param">
            <h4>Tratamento Administrativo (ordenação)</h4>
            <p>NÃO ENVIADO → AGUARDANDO NCM → INEXISTENTE → demais. Depois, maior Qtd Dias Abertura.</p>
          </div>
          <div className="param">
            <h4>Dono da pendência</h4>
            <p>
              Freitas, Cliente, Externa/Órgão, Longo prazo antigo ou Sem classificação — inferido de follow, observação,
              status, anuente/numerário e antiguidade. Qtd Dias Abertura sozinha não torna o processo crítico.
            </p>
          </div>
          <div className="param">
            <h4>Modal de transporte</h4>
            <p>Aéreo, Marítimo (FCL/LCL/Break Bulk/Isotank), Rodoviário ou N/I quando não há evidência segura.</p>
          </div>
          <div className="param">
            <h4>Etapas da Timeline</h4>
            <p>
              {FLOW_STAGES.map((s) => `${s.idx} ${s.name}`).join(' · ')}.
            </p>
          </div>
          <div className="param">
            <h4>Privacidade</h4>
            <p>
              Processamento 100% no navegador. Sem login, banco, backend ou histórico. Ao recarregar a página, o painel
              volta para a tela de upload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

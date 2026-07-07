import type { Modal } from '../lib/types';

export function modalClass(modal: Modal): string {
  if (modal === 'Aéreo') return 'aereo';
  if (modal === 'Marítimo') return 'maritimo';
  if (modal === 'Rodoviário') return 'rodoviario';
  return 'ni';
}

export function ModalIcon({ modal }: { modal: Modal }) {
  if (modal === 'Aéreo')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 12.5 21 5.5l-6.2 6.2 3.2 5.8-2 1-4.2-4.6-3.6 3.6.4 3-1.5.7-2.1-3.1-3.1-2.1.7-1.5 3 .4 3.6-3.6-4.6-4.2 1-2 5.8 3.2Z" />
      </svg>
    );
  if (modal === 'Marítimo')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" data-stroke>
        <path d="M3 15h18l-2 4H6l-3-4Z" />
        <path d="M7 15V8h10v7M10 8V5h4v3M4 21c1 .7 2 .7 3 0 1 .7 2 .7 3 0 1 .7 2 .7 3 0 1 .7 2 .7 3 0 1 .7 2 .7 3 0" />
      </svg>
    );
  if (modal === 'Rodoviário')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" data-stroke>
        <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-stroke>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2.2-2.5 4M12 18h.01" />
    </svg>
  );
}

export function ModalBadge({ modal, rawType }: { modal: Modal; rawType?: string }) {
  const title = rawType && rawType !== 'NÃO INFORMADO' ? `${modal} · ${rawType}` : modal;
  return (
    <span className={`modal-badge ${modalClass(modal)}`} title={title}>
      <ModalIcon modal={modal} />
      {modal}
    </span>
  );
}

/** Classe de badge por faixa de prazo (nº de dias). */
export function rangeClass(n: number | null): string {
  if (n === null) return 'green';
  if (n < 0) return 'red';
  if (n <= 3) return 'pink';
  if (n <= 15) return 'orange';
  return 'green';
}

export function priorityClass(label: string): string {
  if (label === 'Vencido' || label === 'Sem data') return 'high';
  if (label === 'Hoje' || label === 'Até 3 dias' || label === 'Até 7 dias') return 'medium';
  return 'low';
}

export function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

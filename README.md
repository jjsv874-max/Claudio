# Pré-Registro | Gestão Operacional (Freitas)

> **Publicação (aplicativo original):** o app publicado é o arquivo único,
> self-contained, em [`site/index.html`](site/index.html) — HTML + CSS + JS +
> bibliotecas (JSZip) todos inline, sem build e sem dependências externas.
> Vercel, Netlify e GitHub Pages estão configurados para servir a pasta `site/`
> de forma **estática** (`outputDirectory`/`publish` = `site`, sem `npm run build`).
> Basta abrir o arquivo no navegador ou importar o repositório no host.
> O código React/Vite em `src/` permanece como implementação alternativa, mas
> **não** é o que vai ao ar.

Aplicação web que transforma a planilha Excel de **Pré-Registro** em um painel
operacional com **Dashboard por analista**, **Calendário** (recorrente e de
vencidos) e **Timeline** por atividade.

O processamento é **100% no navegador** (SheetJS/`xlsx`). Sem login, sem banco
de dados, sem backend e sem histórico — os dados existem apenas em memória
durante a sessão. Ao recarregar a página, o painel volta para a tela de upload.

## Stack

- React + TypeScript + Vite
- `xlsx` (SheetJS) para leitura do Excel
- CSS próprio com a identidade visual Freitas (azul `#2C2D65`, rosa `#CE0F69`,
  laranja `#FF9E1B`)

## Como executar

```bash
npm install
npm run dev      # ambiente de desenvolvimento (http://localhost:5173)
```

Build de produção:

```bash
npm run build    # gera ./dist (typecheck + bundle)
npm run preview  # serve o build localmente
```

Na tela inicial, arraste ou selecione a planilha. Um arquivo de exemplo real
está em [`samples/BASE_EXEMPLO_ATUALIZADA.xlsx`](samples/BASE_EXEMPLO_ATUALIZADA.xlsx).

## Abas esperadas do Excel

- `Ag. Envio Digitação`
- `Ag. Chegada`
- `Chegada Confirmada`
- `Registro com Pendência`

A validação normaliza espaços e caixa, preserva os nomes originais e, se faltar
alguma aba, mostra exatamente o que é esperado × o que foi encontrado, sem
quebrar a aplicação.

## Regras de negócio implementadas

- **Processo como chave**: único dentro da mesma aba e dentro da mesma etapa da
  Timeline; pode aparecer em abas/etapas diferentes quando operacionalmente
  válido (deduplicação por etapa mantendo a ocorrência mais crítica).
- **Ciclo concluído**: embarque confirmado encerra a previsão de embarque;
  chegada confirmada encerra a previsão de chegada; digitação avançada
  (Conferência DI, Conferido ag. chegada, Ag. registro) encerra o prazo
  anterior; numerário pago/inexistente deixa de ser pendência.
- **Vencidos D+1**: um prazo só vira vencido no dia seguinte ao vencimento.
  A data-base é a data do processamento em `America/Sao_Paulo` (não fixa).
- **Aging de vencidos**: 1–3, 4–7, 8–15, 16–30 e mais de 30 dias.
- **Dashboard por analista**: cada processo conta uma vez, posicionado na etapa
  mais avançada detectada (ranking, detalhe, distribuição por etapa, matriz
  analista × etapa, alertas de concentração/vencidos e insights).
- **Timeline** (10 etapas): Sem previsão de embarque, Sem previsão de chegada,
  Com previsão de chegada, Aguardando documentos do cliente, Em digitação,
  Aguardando envio de numerário, Conferido aguardando chegada, Chegada
  confirmada com pendência, Conferência de DI e Registro de DI — cada uma com
  ordenação, origem, contagem, cards específicos por estágio e critérios.
- **Modal de transporte**: Aéreo, Marítimo (FCL/LCL/Break Bulk/Isotank),
  Rodoviário ou N/I, com filtro global e badge nos cards.
- **Dono da pendência**: Freitas, Cliente, Externa/Órgão, Longo prazo antigo ou
  Sem classificação (inferido de follow, observação, status, anuente/numerário
  e antiguidade).
- **Parsing robusto**: serial do Excel, `dd/mm/yyyy`, `dd/mm/yyyy hh:mm`,
  `yyyy-mm-dd`, prazos embutidos em texto (`PRAZO: …`), delimitador `@|@`,
  células vazias/`null`/`undefined`, sentinelas de data (ex.: `01/01/1753`).

## Filtros globais

Analista, Célula, Etapa da Timeline, Tarefa/Evento, Faixa de prazo, Prioridade,
Dono da pendência, Modal, Aba e busca livre (com debounce). Chips dos filtros
ativos e botão **Limpar filtros**. Os filtros são coerentes entre Dashboard,
Calendário e Timeline.

## Teste de ponta a ponta

```bash
npm run build && npm run preview   # em um terminal
npm run e2e                        # em outro (usa Playwright + samples/…xlsx)
```

O teste sobe o painel, processa o Excel real de exemplo e valida contagens,
troca de abas, modal de processo, calendário de vencidos e filtros.

## Publicação

Pronto para **Vercel** (`vercel.json`) ou **Netlify** (`netlify.toml`). Basta
importar o repositório — build `npm run build`, saída `dist`. Como todo o
processamento é client-side, também funciona em qualquer hospedagem estática.

# HANDOFF — Projeto PreRegistro | Excel → Backlog, Kanban, Calendário e Timelines

## 1. Objetivo do projeto

Criar e evoluir uma ferramenta em **HTML local** que receba uma planilha Excel extraída do sistema e transforme os dados em visão operacional para gestão do backlog.

Fluxo desejado:

**Excel bruto → leitura das abas → aplicação de regras → priorização → Kanban → Calendário → Timelines → exportações futuras**

A ferramenta será usada primeiro para **destravar backlog acumulado** e depois poderá evoluir para **gestão operacional recorrente/futura**.

---

## 2. REGRA TÉCNICA CRÍTICA PARA ESTE CHAT

### HTML
- **NUNCA mostrar preview, prévia, renderização ou conteúdo HTML dentro do chat.**
- **NUNCA plotar o HTML na conversa.**
- Sempre gerar o arquivo `.html` e responder **somente com link para download/abrir o arquivo**.
- Não colar código HTML completo no chat.
- Ao alterar um HTML existente, preservar a versão-base e gerar um novo arquivo para download.

Motivo: previews e HTMLs grandes travam a conversa.

---

## 3. Arquivos-base

### Excel original
`PreRegistroControle.xlsx`

Estrutura conhecida:
- `Ag. Envio Digitação`
- `Ag. Chegada`
- `Chegada Confirmada`
- `Registro com Pendência`

Premissa:
- O número do processo é a chave principal.
- Na mesma aba, o processo deve ser tratado como único.
- O mesmo processo pode aparecer em abas diferentes porque pode ter frentes operacionais simultâneas.

### HTML-base mais recente
`PreRegistro_Calendario_Operacional_Timeline_FluxoDI_PENDENCIAS_MVP.html`

Este HTML deve ser tratado como **base funcional atual**.

Regra:
- Manter o que já existe.
- Alterar somente quando solicitado.
- Não remover visões, filtros ou funcionalidades anteriores sem pedido explícito.

---

## 4. Visões já criadas no HTML

### 4.1 Calendário mensal
Formato de agenda/calendário real.

Deve permitir:
- visão por mês;
- demandas por dia;
- clique no dia para detalhar processos;
- filtros globais.

### 4.2 Semana
Visão operacional semanal.

### 4.3 Próximas 4 semanas
Visão de capacidade e volume futuro.

### 4.4 Agenda detalhada
Lista de eventos/processos com filtros.

### 4.5 Kanban
Backlog por prioridade/faixa.

### 4.6 Timeline operacional por prazo
Agrupa demandas em faixas:

- Vencidos
- Hoje
- Até 3 dias
- Até 7 dias
- Até 15 dias
- Até 30 dias
- Mais de 30 dias
- Sem data

Dentro da timeline, mostrar volume e tarefas.

### 4.7 Timeline Fluxo DI
Visão por **atividade**, não por prazo.

Etapas obrigatórias:

1. Abertura de processo
2. Tratamento administrativo e análise documental
3. Aguardando envio para digitação
4. Em digitação
5. Aguardando envio de numerário
6. Conferência de DI
7. Registro de DI

Características:
- Cada etapa mostra volume.
- Deve permitir clicar/expandir.
- Ao expandir, mostrar processos priorizados dentro daquela atividade.
- Serve para entender gargalo, volume e necessidade de realocação de fluxo.

### 4.8 Parâmetros/Filtros
Filtros já esperados:
- Célula
- Tipo de tarefa/evento
- Faixa de prazo
- Prioridade
- Aba origem
- Busca por processo/responsável/motivo
- Dono da pendência

---

## 5. Regra de deduplicação

### Regra obrigatória
Dentro da **mesma etapa/atividade da Timeline Fluxo DI**, o mesmo processo não pode aparecer duas vezes.

Permitido:
- Processo X aparecer em `Aguardando envio para digitação`
- E também aparecer em `Em digitação`

Não permitido:
- Processo X aparecer duas vezes dentro de `Em digitação`

Ao deduplicar dentro da mesma etapa:
- manter a ocorrência mais crítica;
- preservar a melhor data-chave disponível;
- preservar o motivo mais útil;
- não somar duplicidade no contador.

---

## 6. Faixas de prazo usadas no painel

Parâmetros principais:

- Vencidos
- Hoje
- A vencer em até 3 dias
- A vencer em até 7 dias
- A vencer em até 15 dias
- A vencer em até 30 dias
- Mais de 30 dias
- Sem data

Importante:
- O painel precisa trabalhar tanto com backlog atrasado quanto com visão futura.
- Datas não devem ser analisadas com base fixa; usar a data atual do processamento.

---

## 7. Calendário — lógica desejada

O calendário deve mostrar demandas por tarefa/data.

Exemplos de eventos:
- Digitação/Numerário
- Deadline documental
- Chegada prevista
- Chegada confirmada
- Embarque
- Previsão de embarque
- Outros eventos definidos futuramente pelas regras

Exemplo de leitura do dia:
- 10 chegadas
- 8 digitações
- 15 cargas
- 4 retornos
- 3 críticos

Ao clicar:
- abrir processos daquele dia;
- mostrar célula;
- prioridade;
- etapa;
- responsável;
- motivo.

---

## 8. Dono da pendência

Foi criada uma classificação para separar:

- `Freitas`
- `Cliente`
- `Externa/Órgão`
- `Longo prazo antigo`
- `Sem classificação`

Essa classificação deve ser inferida principalmente por:
- Último Follow
- Observação Digitação
- Status operacionais
- Campos como NCM/anuente/documentos
- Datas e antiguidade

### 8.1 Pendência Freitas
Sinais típicos:
- não enviado
- item não enviado
- falta enviar
- pendente análise
- conferir
- validar
- providenciar interno
- digitação pendente
- numerário pendente
- registro pendente
- regularizar

### 8.2 Pendência Cliente
Sinais típicos:
- aguardando cliente
- aguardando NCM
- aguardando documentos
- aguardando correção
- falta invoice
- falta packing
- falta BL/HBL
- sem retorno
- aguardando depósito
- débito cliente

### 8.3 Externa/Órgão
Sinais típicos:
- MAPA
- anuente
- terminal
- armador
- agente
- transportador
- licença
- LPCO
- Siscomex
- Receita

### 8.4 Longo prazo antigo
Usar para processos antigos/controlados que não devem poluir o crítico operacional.

Sinais possíveis:
- admissão temporária
- vencimento futuro
- acompanhamento
- controle
- renovação
- prazo de regime
- processo antigo sem execução imediata
- follow que explique monitoramento de longo prazo

Regra importante:
- **Qtd Dias Abertura sozinha não torna o processo crítico.**

---

# 9. REGRA VALIDADA/EM CONSTRUÇÃO — ABA `Ag. Envio Digitação`

## 9.1 Objetivo
Mostrar:
- processos ainda não enviados para digitação;
- o que falta para liberar o envio;
- quem está segurando a pendência;
- quais processos devem subir na fila.

Etapa principal:
`Aguardando envio para digitação`

---

## 9.2 Lógica macro

Ordem de análise:

1. Existe previsão de embarque?
2. Existe previsão/data de chegada?
3. O embarque já ocorreu?
4. A chegada está próxima?
5. Existe pendência de tratamento administrativo?
6. A pendência depende da Freitas ou do cliente?
7. O último follow está vencido?
8. A observação explica exceção/controle de longo prazo?

---

## 9.3 Regra de previsão

### Sem previsão de embarque
Por padrão:
- vai para o final da fila.

Exceção:
- processo muito antigo sem previsão e sem justificativa clara → `Triagem por antiguidade`.

Outra exceção:
- processo antigo com follow/observação que demonstre controle de longo prazo → `Longo prazo antigo`.

### Com previsão de embarque
Sobe na análise operacional.

### Com chegada prevista/confirmada
Usar a proximidade da chegada como forte fator de prioridade.

---

## 9.4 Tratamento administrativo / coluna de anuente

Status conhecidos:

### `NÃO ENVIADO`
Interpretação:
- pendência ruim;
- depende da Freitas;
- prioridade alta quando houver data operacional ativa.

### `AGUARDANDO NCM`
Interpretação:
- pendência cliente;
- NCM incompleta/incorreta/aguardando retorno;
- deve considerar último follow.

### `INEXISTENTE`
Interpretação atual:
- tratamento já resolvido ou não aplicável;
- não deve gerar alerta de TA.

Essa interpretação ainda pode ser refinada depois.

---

## 9.5 Follow-up

Regra:
- Último follow há mais de 7 dias → gerar alerta.

Impacto:
- especialmente importante quando a pendência é do cliente;
- ajuda a subir casos esquecidos;
- não deve sozinho transformar qualquer processo em crítico.

---

## 9.6 Observação Digitação

Campo obrigatório na interpretação.

Usar para identificar:
- pendência cliente;
- pendência Freitas;
- dependência externa;
- exceção de longo prazo;
- justificativas operacionais.

Exemplo:
- “aguardando cliente” → Cliente
- “aguardando NCM” → Cliente
- “falta enviar” → Freitas
- “admissão temporária / vencimento futuro” → Longo prazo antigo

---

## 9.7 Qtd Dias Abertura

Regra:
- não usar isoladamente como criticidade.

Processos com 300, 500 ou mais dias podem ser:
- admissão temporária;
- regime com vencimento futuro;
- acompanhamento;
- controle de prazo;
- espera justificada.

Portanto:

### Antigo + sem justificativa
→ `Triagem por antiguidade`

### Antigo + justificativa/controlado
→ `Longo prazo antigo`

---

## 9.8 Priorização provisória da aba

1. Chegada vencida/próxima + pendência Freitas
2. Chegada vencida/próxima + pendência Cliente
3. Embarque ocorrido + pendência Freitas
4. Previsão/chegada até 30 dias + `NÃO ENVIADO`
5. `AGUARDANDO NCM` + follow > 7 dias
6. Outros processos com data operacional ativa
7. Sem data + muito antigo + sem justificativa
8. Longo prazo antigo/controlado
9. Sem previsão + abertura recente

---

## 9.9 Regra final consolidada — Ag. Envio Digitação

A aba `Ag. Envio Digitação` deve mostrar processos ainda não enviados para digitação e classificar o motivo da pendência.

A prioridade principal será por data operacional:
- chegada vencida;
- chegada próxima;
- embarque ocorrido;
- previsão de chegada em até 30 dias.

Processos com `ANUENTE = NÃO ENVIADO` devem ganhar prioridade quando houver data operacional ativa, pois dependem da Freitas.

Processos com `ANUENTE = AGUARDANDO NCM` devem ser classificados como pendência cliente e priorizados conforme:
- proximidade da chegada;
- tempo desde o último follow.

Processos com `ANUENTE = INEXISTENTE` não geram alerta inicial de tratamento administrativo.

As colunas `Observação Digitação` e `Último Follow` devem ser lidas para classificar a pendência em:
- Freitas
- Cliente
- Externa/Órgão
- Longo prazo antigo
- Sem classificação

`Qtd Dias Abertura` não torna o processo crítico sozinha.

Processos muito antigos, sem chegada próxima e com observação de:
- admissão temporária;
- vencimento futuro;
- acompanhamento;
- renovação;
- controle;
- prazo de regime;

devem ir para `Longo prazo antigo`, e não para crítico operacional.

Processos muito antigos, sem previsão e sem justificativa clara devem ir para `Triagem por antiguidade`.

Follow-up acima de 7 dias gera alerta, principalmente quando a pendência depende do cliente.

Processos sem previsão de embarque, sem previsão de chegada e sem pendência clara ficam no fim da fila.

---

## 10. Fluxo de trabalho no novo chat

O usuário prefere explicar regras por áudio.

### Procedimento
Para cada áudio:

1. Identificar a aba/regra discutida.
2. Interpretar a lógica.
3. Responder de forma curta com:
   - Regra entendida
   - O que entra
   - O que exclui
   - Como prioriza
   - Quem é dono da pendência
   - Dúvidas reais
4. Não executar HTML a cada áudio.
5. Acumular as regras.
6. Quando o usuário disser:
   - `executa a regra`
   - `executa o HTML`
   - `gera nova versão`

   então aplicar o consolidado e gerar novo HTML.

### Importante
Não pedir novamente algo que já foi validado.

---

## 11. Estilo esperado nas respostas

- Português do Brasil.
- Objetivo.
- Direto.
- Frases curtas.
- Sem introdução longa.
- Sem linguagem rebuscada.
- Priorizar resposta pronta.
- Explicar lógica apenas quando necessário.
- Em regras: mostrar a regra final consolidada.
- Em HTML: **somente link para download**.

---

## 12. Próximos passos sugeridos

Continuar validando regras aba por aba:

1. Finalizar `Ag. Envio Digitação`
2. Definir `Ag. Chegada`
3. Definir `Chegada Confirmada`
4. Definir `Registro com Pendência`
5. Revisar Timeline Fluxo DI com regras reais
6. Revisar classificação Cliente x Freitas
7. Validar calendário por tipo de evento
8. Só depois consolidar versão final do HTML
9. Em etapa futura, criar HTML com upload do Excel e processamento automático
10. Em etapa futura, exportar Excel tratado a partir do HTML

---

## 13. Instrução inicial recomendada ao novo chat

Leia este handoff inteiro antes de responder.
Use o Excel original e o HTML-base anexados.
Não recrie o projeto do zero.
Continue a partir do estado atual.
Preserve o HTML existente.
Não mostre preview de HTML no chat.
Todo HTML gerado deve ser entregue exclusivamente por link para download.

---
name: roteiros-de-teste
description: >-
  Produz roteiros de teste manuais em português, bem curtos (1–3 linhas por
  seção salvo listas tipo pré-condição): Descrição, Pré-condição, Procedimento e
  Resultado esperado, a partir do contexto (feature, PR, código). Use quando o
  usuário pedir caso de teste, roteiro de QA, cenário de teste ou documentação
  de teste nesse formato. Ao criar tarefa no Jira: primeiro gerar o snapshot
  Markdown (Resumo / Labels / Descrição) no projeto; só depois subir pela API/atlassian,
  salvo quando o usuário pedir explicitamente para pular o arquivo. Resumo no
  formato [Contexto] Ação sucinta quando aplicável; label Testing sempre.
---

# Roteiros de teste

## Como entregar

### Tom e extensão (obrigatório)

Roteiro **bem simples**, para **humanos**: ler de relance e entender. Sucinto, **sem firula**. Em **Descrição**, **Procedimento** e **Resultado esperado**, no máximo **uma a três linhas** cada. **Exceto** em **Pré-condição** e, quando fizer sentido, **listas com bullets** noutras seções: aí vale vários itens curtos, um por linha.

1. Produzir o roteiro **nesta ordem** e com **estes títulos exatos** (incluindo dois-pontos onde indicado):

   - `Descrição:`
   - `Pré-condição:`
   - `Procedimento:`
   - `Resultado Esperado:`

2. **Preencher** cada seção com conteúdo concreto derivado do contexto ( código, fluxo da tela, regras de negócio ). Não copiar placeholders genéricos; não deixar seções vazias se o contexto permitir inferir algo útil.

3. **Pré-condição:** usar lista com `*` quando houver vários itens.

4. **Procedimento:** passos na ordem de execução; usar **lista com bullets** quando facilitar — ver **Boas práticas** abaixo. Respeitar **Tom e extensão**.

5. **Resultado esperado:** o que deve ser observável ao final ( mensagem, persistência, UI ), sem frase vaga tipo “deve funcionar”; respeitando **Tom e extensão**.

6. **Não** incluir o rótulo `Exemplo:` na entrega; os exemplos abaixo são apenas referência de estilo fornecida pelo usuário.

### Boas práticas (produto e Jira)

**Procedimento**

- Preferir **um bullet por passo** ( navegação, abrir fluxo/modal, concluir **uma etapa** de wizard ); evitar um único bullet que mistura várias ações.
- **Confirmação final** ( ex.: botão **Criar modelo**, **Salvar** ) em **bullet próprio** quando for ação explícita separada do preenchimento da etapa anterior.
- Nomear etapas com os **rótulos reais da interface** ( ex.: **Detalhes**, **Aplicabilidade** ), não sinônimos genéricos; quando houver código ou `locales`, alinhar ao texto da UI.

**Pré-condição**

- Vários **bullets curtos** em vez de uma frase longa com URL crua, “regra da página” ou jargão técnico, salvo se o usuário pedir esse nível.
- Separar **quem pode testar** ( perfis que a pessoa vê no produto, ex.: **Administrador**, **Proprietário** ) do **estado inicial** quando importar ( ex.: primeiro cadastro, lista vazia ).

**Linguagem simples (obrigatório)**

- Escrever para **humano de QA / produto**, não para dev. Frase do dia a dia, **sem jargão técnico**.
- **Evitar** mencionar: front, código, locale, idioma da sessão, formato literal de string ( ex.: `Cargos: N | Áreas: 1` ), contagens, célula, payload, API, mapper, hook, etc.
- **Resultado esperado** descreve o que a pessoa **vê** ou **conclui** ao olhar a tela ( ex.: “fica claro que o modelo vale para todos os colaboradores” ), nunca a string exata da UI a menos que o usuário tenha pedido textualmente.
- Quando precisar comparar dois cenários, falar em termos de **comportamento** ( “vale pra todos” vs “vale só pra quem se encaixa em X” ), não em estrutura de texto.

**Consistência**

- Destacar rótulos de menu, botões e opções em **negrito** markdown para leitura rápida e fácil conferência na tela.

**Escopo de alterações (obrigatório)**

- Quando o usuário apontar **um trecho específico** ( ex.: “arruma a Pré-condição”, “Resultado esperado ficou estranho” ), **mexer só nesse trecho**. Não reformatar as outras seções por iniciativa própria.
- Se identificar problema fora do escopo pedido, **sugerir** na resposta em vez de já alterar a issue.
- Ao corrigir, **preservar** o resto do conteúdo já aprovado em iterações anteriores.

**Snapshot Markdown antes do Jira (obrigatório)**

- Antes de qualquer criação/edição de issue no **Jira** ( API, MCP Atlassian, `gh`/automação, etc.), **materializar sempre** um arquivo `.md` que seja cópia fiel dos campos a preencher no Jira: nada de rúbricas internas tipo **Critérios de aceite**, **Roteiro**, **Notas técnicas** ou disclaimers extras no mesmo arquivo ( salvo pedido explícito do usuário ).
- Preferir gravar em `docs/jira/` no workspace ( ex.: `<CHAVE-da-issue>-slug-curto.md` ou slug descritivo se ainda não existir chave ).
- **Estrutura fixa do arquivo** ( três blocos só no primeiro nível, para espelhar o Jira ):

```markdown
## Resumo

`[Contexto] Ação bem curta`

## Labels

`Testing`

## Descrição

Descrição:
...
Pré-condição:
...
Procedimento:
...
Resultado Esperado:
...
```

- Dentro de **## Descrição** ficam **apenas** os quatro rótulos do roteiro (`Descrição:`, `Pré-condição:`, etc.) na ordem da skill — sem checklist duplicado nem subtítulo **Roteiro** em volta disso.
- Se o usuário quiser só o texto inline no chat, **mesmo assim** criar/atualizar o `.md` no repo quando estivermos num projeto versionado — exceto quando disser textualmente para **não** guardar arquivo.
- Depois de o snapshot existir, copiar para os campos do Jira (**Summary**, **Labels**, **Description**) ou repetir esse conteúdo na ferramenta de criação. Se o usuário habitualmente **valida antes de publicar**, manter esse hábito: o MD sai primeiro; o Jira só após confirmação dele, salvo instrução em contrário.

**Destino Markdown / Jira**

- O conteúdo colável na **Description** do Jira é exatamente o bloco **## Descrição** do snapshot ( sem incluir `## Resumo` nem `## Labels` nesse paste ).
- **Resumo da issue (título)** no Jira: tema ou módulo **entre colchetes**, espaço e **ação bem curta**. Exemplo: `[Modelo de Admissão] Cadastrar um modelo`. Trocar o que vai nos colchetes quando o assunto for outro, mantendo o mesmo padrão.
- **Label:** incluir `Testing` em toda issue criada neste fluxo (`additional_fields.labels` na criação, ou `labels` na edição; unir com labels já existentes na issue em vez de sobrescrever ).
- **Erro em `createJiraIssue` não é garantia de falha.** Se o MCP devolver erro ( ex.: `Issue does not exist or you do not have permission to see it` ), **NÃO** retentar de imediato. Antes, rodar `searchJiraIssuesUsingJql` filtrando por `project` e `summary` para ver se a issue foi criada. Só recriar se realmente não existir.
- Ao detectar duplicatas criadas por essa falha: marcar a extra como **Duplicate** da que vai ficar ( `createIssueLink` type `Duplicate` ) e fechar via `transitionJiraIssue` para um status `done` apropriado ( ex.: `🔒 CLOSED` ).

**Checklist rápido antes de entregar**

- Existe arquivo snapshot `.md` ( `docs/jira/…` ) **antes** de criar/atualizar a issue no Jira ( salvo skip explícito )?
- O snapshot tem só `## Resumo`, `## Labels`, `## Descrição` no topo — sem secções extra “Critérios de aceite” / “Roteiro” / notas de dev?
- Resumo no Jira: tem `[Contexto]` + título sucinto?
- Labels: existe `Testing`?
- Procedimento: cada bullet cobre um passo só? Ação de confirmação final tem bullet próprio quando fizer sentido?
- Pré-condição: sem URL ou detalhe técnico desnecessário? Perfil(es) + estado inicial em bullets separados quando aplicável?
- Nomes iguais ou fiéis à UI?
- Linguagem: dá pra alguém de QA entender sem abrir o código? Sem jargão dev?
- Resultado esperado: fala do **comportamento visível**, não da string literal da UI?
- Se a iteração foi um ajuste pontual: mexi **só** no trecho pedido?

## Modelo e exemplos (texto verbatim do usuário)

Descrição:

Exemplo:
Quando o usuário precisa delimitar o roio do funcionário....podemos usar a cerca vistual....

Pré-condição:

Exemplo:
* Usuário precisar ser admin para criar uma cerca virtual
* O ponto precisa estar tivo

Procedimento:

Exemplo:
Na tela de configurações de regas de jornada, o usuario ira clicar...

Resultado Esperado:

Exemplo:
O sistema deve criar uma cerca virtual, etc

## Skeleton para copiar ao popular (sem linhas Exemplo)

**Só o corpo da Descrição do Jira** ( também vai **dentro** de `## Descrição` no snapshot completo ):

```markdown
Descrição:


Pré-condição:


Procedimento:


Resultado Esperado:
```

**Snapshot completo para guardar em `docs/jira/` antes do Jira:**

```markdown
## Resumo

`[Contexto] Ação bem curta`

## Labels

`Testing`

## Descrição

Descrição:


Pré-condição:


Procedimento:


Resultado Esperado:
```

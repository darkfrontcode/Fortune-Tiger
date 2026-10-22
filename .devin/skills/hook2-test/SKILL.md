---
name: hook2-test
description: >-
  Audita hooks React de um módulo front-end (hr-tech-frontend), identifica hooks
  com **lógica de negócio relevante** sem teste, cria ou corrige specs **só
  quando valer a pena** e executa Jest **um arquivo por vez**, aguardando cada
  execução terminar antes da próxima (máquina do usuário é lenta e com pouca
  memória). **Não** testa hooks triviais, de requisição (`use*Request`), **mappers**,
  **labels**, **modal/portal** (open/close + config) nem wiring fino. Inclui
  **factories** e **mediators** apenas com regra de negócio não trivial.
  Use quando o usuário escrever "hook:test",
  "hook:test?target=<modulo>" ou pedir verificação/testes de hooks de um módulo.
---

# hook:test

Comando para **auditar e testar hooks React** de um módulo de view no **front-end** (`hr-tech-frontend`). **Não** se aplica a back-end.

**Princípio:** cobertura **seletiva** — spec só onde a lógica é **relevante** e o teste **protege comportamento que pode quebrar**. Hooks pequenos, wiring ou CRUD trivial **não** entram no escopo, mesmo que tecnicamente tenham `useState`/`useMemo`.

## Gatilho

Ativar esta skill quando a mensagem do usuário for (ou contiver):

- `hook:test?target=<nome-do-modulo>`
- `hook:test` (sem `target` → perguntar qual módulo verificar)

### Resolver o módulo

| Entrada | Ação |
|---------|------|
| `target=ExportLayouts` | `src/views/ExportLayouts` |
| `target=Admissions` | `src/views/Admissions` |
| Path parcial informado | Resolver sob `src/views/`, `src/modules/` ou `src/designSystem/Components/` (só front-end) |

Se o módulo não existir ou for ambíguo, **parar** e pedir confirmação em uma frase.

## Escopo

### O que **vale** testar (lógica relevante)

Criar spec **somente** quando o hook concentra regra de negócio **não trivial** — comportamento que merece regressão:

- Filtros, busca, ordenação, paginação com condições
- Seleção/check/toggle com regras (grupo, item, contador derivado com regra)
- Validação de formulário ou fluxo condicional (`valid()`, continue/cancel com guard)
- Orquestração assíncrona com efeitos colaterais (`start`, `save`, troca de abas com side effects)
- Transformação/derivação com condicionais que alteram UX ou dados
- Factories/mediators com algoritmo próprio (não só delegar para outra classe)

### O que **não** vale testar (trivial / wiring)

**Não criar spec** — nem contar como gap — para:

- **Mappers** (`*Mapper.ts`) — transformação DTO
- Hooks de **labels** — `useLabels`, `use*Labels`
- Hooks de **modal/portal** — `useModals`, `use*Portal`, `useConfig` em `*Portal/` (`open`/`close` + guardar config)
- Hooks de **tradução** — `useTranslations.ts`
- Hooks de **contexto** — `useXContext`, repasse de `useContext`
- Hooks de **requisição** — `use*Request`, `useRequests` agregador
- Hooks de **repasse puro** — só montam objeto estático ou delegam sem regra
- **CRUD/state fino** — `add`/`update`/`remove` em array, `set`/`clear` em ref, contador = `length`, troca de tab/scene óbvia
- **Composição fina** — só junta hooks já testados sem regra nova (ex.: `useSelection` = `useSelectables` + `useChecks` + `useChange`)
- **Wiring de UI** — monta header/footer/botões sem fluxo (ex.: `useLayoutConfigModal` com `cancel` + placeholder)
- **Options/labels derivados** — `replace` mapeando lista + sort alfabético (`useLayoutTypeOptions`, `useTemplateOptions`)
- Factories/mediators **triviais** — só instanciam formatter/classe conhecida sem regra (`FormatterFactory`)

Para classificar, **ler o arquivo**. Na dúvida, **não testar** — só incluir se a regra for claramente relevante.

### Varredura (inventário)

- `**/hooks/**/use*.ts(x)` — todos os hooks, inclusive aninhados
- `**/*Factory.ts`, `**/*Mediator.ts` — só entram no inventário; mappers **fora**

### Referência rápida por tipo

**Hook de requisição:** expõe `useRequest` + `execute`/`get` chamando API. Padrão: `use*Request`, `useRequests`.

**Hook de labels:** rótulos derivados de i18n/enum. Padrão: `useLabels`, `use*Labels`.

**Hook de modal/portal:** portal (`useSimplePortal`) + `open`/`close` + guardar config (`useRef`). Padrão: `useModals`, `use*Portal`, `useConfig`. Hooks de **conteúdo** com fluxo real (ex.: `useNewLayout`, `useFieldSelectionContext`) **só** entram se a orquestração for relevante — wiring de footer/header **não**.

**Exemplos ExportLayouts (orientação, não lista fixa):**

| Testar | Ignorar |
|--------|---------|
| `useChange`, `useChecks`, `useFilters`, `useForm` (validação NewLayout), `useNewLayout`, `useFieldSelectionContext` | `useSelection`, `useFixedFields`, `useStageField`, `useStageContext`, `useCategoryTabs`, `useModals`, `useLayoutConfigModal`, `useLayoutTypeOptions`, `*Mapper` |

Referência de padrões de hook e teste: skill **formatos-de-codigo** (seção *Hooks de view*).

## Fluxo (ordem obrigatória)

### 1. Inventário

Varredura obrigatória (glob ou equivalente):

1. `**/hooks/**/use*.ts(x)` — todos os hooks, inclusive aninhados.
2. `**/*Factory.ts`, `**/*Mediator.ts` — classes/funções com lógica (mappers **fora** do inventário).

Para cada item do inventário, classificar em: **relevante** (precisa teste), **já coberto**, **trivial** ou **categoria excluída**.

| Item | Tipo | Classificação | Spec existe? |
|------|------|---------------|--------------|
| `useChange` | hook | relevante | **não** |
| `useStageField` | hook | trivial | — |
| `OverviewFactory` | factory | relevante | **não** |

**Arquivos de teste válidos** (mesmo diretório, `__tests__/` adjacente ou `hooks/__tests__/`):

- `useX.spec.ts`, `useX.spec.tsx`, `useX.test.ts`, `useX.test.tsx`
- `OverviewFactory.spec.ts`, `MappingStatusMediator.spec.ts`, etc. (não criar specs para `*Mapper.ts`).

### 2. Relatório inicial (obrigatório)

Antes de escrever ou rodar qualquer teste, responder com:

```markdown
## hook:test — `<modulo>`

**Hooks com lógica relevante (devem ter teste):** N
**Com teste:** N
**Sem teste:** lista curta (`useX`, …)

**Factories / mediators relevantes:** N
**Com teste:** N
**Sem teste:** lista curta

**Ignorados (trivial / mapper / labels / modal-portal / tradução / contexto / requisição / wiring):** lista curta
```

Se **não houver gap relevante**, informar e **não** rodar Jest.

### 3. Criar ou corrigir testes (só o necessário)

Para cada hook **relevante** ainda **sem teste**:

1. Criar spec em `hooks/__tests__/useX.spec.ts` (ou `.tsx` se precisar de JSX/provider), ou `__tests__/OverviewFactory.spec.ts` ao lado da classe.
2. Seguir convenções do projeto:
   - Hooks: `describe('[Hook] useX', () => { ... })`
   - Factory/Mediator: `describe('[Factory] OverviewFactory', () => { ... })` (ou `[Mediator]`)
   - Poucos casos `WHEN … - SHOULD …` — só caminhos que exercitam **regra de negócio**, não happy path óbvio duplicado
   - `@testing-library/react` (`renderHook`, `act`) para hooks; teste direto da classe/função para factory/mediator
   - Mock de `hooks/useTranslation` quando o hook ou dependência usar i18n
   - Referências: `useListing.spec.tsx`, `useFilters.spec.ts` em ExportLayouts; `useSelection.spec.ts` em Admissions
3. Aplicar skill **formatos-de-codigo** ao código novo.

**Um hook por vez** — implementar o spec → **rodar só aquele arquivo** → esperar terminar → corrigir se falhar → **só então** passar ao próximo hook. **Nunca** criar vários specs e rodar Jest em lote no final.

### 4. Executar Jest — um arquivo por vez (crítico)

A máquina do usuário é **lenta** e tem **pouca memória**. Rodar mais de um spec por vez, a suíte inteira ou specs em paralelo pode **travar ou reiniciar o PC**.

#### Regra de ouro

**1 spec = 1 comando Jest = aguardar 100% terminar = só então o próximo.**

Fluxo obrigatório quando houver **N** specs para rodar:

1. Rodar o spec 1 → **esperar** exit code / output completo.
2. Rodar o spec 2 → **esperar** exit code / output completo.
3. Repetir até o último — **nunca** disparar dois `jest` na mesma rodada (nem em paralelo, nem em background).

| ❌ Proibido | ✅ Obrigatório |
|-------------|----------------|
| `npm test` sem filtro | **Exatamente um** arquivo por comando |
| `npm test -- <modulo>` (vários specs) | Path **completo** do `.spec.ts(x)` |
| Vários `jest` no mesmo turno do agente | **Um** `jest` por turno de execução, em sequência |
| `jest` em background enquanto cria outro spec | Terminar o atual antes de qualquer outro |
| `--testPathPattern` amplo (ex.: `ExportLayouts`) | Pattern que bata em **um único** arquivo |
| `--runInBand` **e** `--maxWorkers=1` juntos | Só `--runInBand --forceExit` |

**Comando canônico** (copiar e trocar só o path do arquivo):

```bash
npx jest "src/views/<Modulo>/.../hooks/__tests__/useX.spec.ts" --runInBand --forceExit
```

- **`--runInBand`** — um processo só, sem pool de workers (economiza RAM).
- **`--forceExit`** — encerra após o arquivo; evita handles abertos segurando memória.
- **Não** usar `--maxWorkers=1` junto com `--runInBand` (Jest rejeita os dois).

Alternativa com `npm test` (mesma regra — **um arquivo**):

```bash
npm test -- --runInBand --forceExit --testPathPattern=useX.spec.ts
```

- `--testPathPattern` **só** se o nome for **único** no repositório (ex.: `useSimpleAccordionGroup.spec.ts`).
- Se houver risco de colisão de nome, usar sempre o **path completo** com `npx jest "..."`.

#### Checklist antes de cada execução

- [ ] Estou rodando **apenas um** arquivo `.spec.ts(x)`?
- [ ] O comando anterior **já terminou** (sucesso ou falha)?
- [ ] Não vou lançar outro Jest até ler o resultado deste?

Se um teste falhar, corrigir **esse** spec e rodar **de novo só ele** antes de avançar.

### 5. Resposta final

```markdown
## Resultado — `<modulo>`

**Specs criados:** …
**Specs já existentes:** …
**Ignorados:** …

**Jest (um a um):**
- ✅ `useFilters.spec.ts`
- ✅ `useSearch.spec.ts`
- ❌ `useSort.spec.ts` — [motivo curto]
```

## O que não fazer

- Não auditar ou testar back-end.
- **Não** buscar cobertura exaustiva — priorizar hooks com lógica que **importa**.
- **Não** criar spec para hook trivial (CRUD fino, composição sem regra, wiring de modal/UI, options+sort).
- Não criar teste para **mappers**, hooks de **labels**, hooks de **modal/portal**, `useTranslations`, hook de **contexto**, hook de **requisição** (`use*Request`) ou repasse puro.
- Não criar, corrigir nem rodar Jest para specs de hooks de requisição — mesmo que já existam no módulo.
- **Não** recriar spec para hook cuja lógica já é coberta indiretamente por hook composto testado (ex.: `useSelection` quando `useChange`/`useChecks` já têm spec).
- **Nunca** rodar a suíte inteira, todos os specs do módulo ou mais de um arquivo `.spec` no mesmo comando.
- **Nunca** disparar vários comandos Jest em paralelo ou em background nesta skill.
- **Nunca** agrupar “rodar todos os testes” no final — rodar **cada arquivo assim que o spec dele existir**, um de cada vez.
- Não pular o relatório inicial mesmo quando for só criar um spec.

## Exemplos

**Usuário:** `hook:test?target=ExportLayouts`

**Agente:**

1. Varre hooks + factories/mediators do módulo.
2. Classifica cada item: **relevante**, **trivial** ou **categoria excluída** (mapper, labels, modal-portal, tradução, contexto, requisição).
3. Lista **só gaps relevantes** (ex.: `useChange`, `useFilters`, `MappingStatusMediator`).
4. Se houver gap relevante, cria spec mínimo → roda **só aquele arquivo** → espera → próximo.
5. Repete **sequencialmente** (nunca dois Jest ao mesmo tempo). Se não houver gap relevante, **para sem rodar Jest**.

**Usuário:** `hook:test`

**Agente:** Qual módulo de view você quer que eu verifique? (ex.: `ExportLayouts`, `Admissions`)

> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Estilo de actions

## Nunca usar alias

**Regra absoluta:** não renomear símbolos só para “encaixar” em outro lugar. Proibido em **destructuring**, **objetos literais** (`actions`, `return`, props, config) e **imports** quando o objetivo for contornar conflito de nome com outro identificador no mesmo escopo. Exceção única: model do Prisma no `*Map` (`<Entity> as Prisma<Entity>`), porque colide com a entidade de domínio.

### O que é alias (proibido)

| Forma | Exemplo proibido |
|-------|------------------|
| Destructuring renomeado | `const { open: openEvent } = useEvents()` |
| Destructuring de hook com rename | `const { actions: sourceLabels } = useSourceLabels()` |
| Prop com nome diferente da `const` | `const actions = { open: openAction }` |
| Return / objeto com rename | `return { open: events.open }` |
| Sufixo artificial por conflito | `openAction`, `closeHandler`, `handleOpen`, `openEvent` só para não colidir com `open` |

### Destructuring: nunca renomear props

**Regra reforçada:** em **qualquer** destructuring — retorno de hook, props, contexto, imports — **nunca** usar a forma `prop: outroNome`. Especialmente comum e **proibido**: renomear `actions` (ou `state`, `events`, `getters`) só porque outro hook no mesmo componente também expõe `actions`.

**Evitar:**

```typescript
const { actions: sourceLabels } = useSourceLabels()
const { actions: fieldActions } = useFieldStatus({ mappings, source })
const { actions: fieldActions } = useHeading({ fieldId })

const sourceLabel = sourceLabels.get.label(source)
onClick={fieldActions.remove}
```

**Preferir** — guardar o retorno do hook inteiro e acessar pelo caminho:

```typescript
const sourceLabels = useSourceLabels()
const fieldStatus = useFieldStatus({ mappings, source })
const heading = useHeading({ fieldId })

const sourceLabel = sourceLabels.actions.get.label(source)
onClick={heading.actions.remove}
```

- Se dois hooks retornam `actions`, **não** renomear um deles no destructuring — usar **dois objetos pai** com nomes de domínio (`sourceLabels`, `fieldStatus`, `listing`, `edition`) e `hook.actions.metodo(...)`.
- Destructuring **só** quando extrai prop **sem rename** e **sem** conflito no escopo: `const { listing } = filters` — nunca `{ listing: items }`.

### Como resolver conflito de nome

Quando dois conceitos precisam do **mesmo nome** no mesmo escopo (ex.: evento `open` e action `open`), **reestruturar** — não renomear um deles com alias.

**Evitar:**

```typescript
const { open: openEvent, close: closeEvent } = useEvents()

const openAction = () => {
  openEvent.publish(undefined)
}

const actions = {
  open: openAction,
  close: closeAction,
}

return {
  actions,
  open: openEvent,
  close: closeEvent,
}
```

**Preferir:**

```typescript
const events = useEvents()

const actions = {
  open: () => {
    events.open.publish(undefined)
  },
  close: () => {
    events.close.publish(undefined)
  },
}

return { actions, events }
```

- Manter o **objeto pai** (`events`, `filters`, `modal`) e acessar a prop pelo caminho (`events.open`) em vez de extrair com rename.
- Dentro de `actions`, o corpo fica na propriedade. Fora de `actions`, a `const` tem o mesmo nome da prop e o `return` usa shorthand.
- Se o nome da prop no retorno for diferente do símbolo local, **agrupar** num objeto intermediário com nome de domínio (`events`, `navigation`) em vez de `prop: valor` renomeado.

### Palavras reservadas da linguagem

Quando o nome ideal for **palavra reservada** do JavaScript/TypeScript (`delete`, `class`, `import`, `default`, etc.), **nunca** contornar com alias (`delete: deleteLayout`, `delete: deleteRequest`).

**Trocar a palavra** por sinônimo de domínio com o **mesmo nome** na `const` e na prop — e usar **shorthand** no `return`:

| Reservada | Preferir (exemplo) |
|-----------|-------------------|
| `delete` | `remove` |
| `class` | `kind`, `cssClass` (domínio) |

**Evitar:**

```typescript
const deleteLayout = (layoutId: string) => execute(...)

return { ...request, delete: deleteLayout }
```

**Preferir:**

```typescript
const remove = (layoutId: string) => execute(...)

return { ...request, remove }
```

- Vale para **métodos de hook**, **chaves de `useRequests`**, **props de retorno** — em todo lugar onde a palavra reservada impediria `const remove = …` + `return { remove }`.
- A rota/serviço pode continuar com verbo HTTP (`deleteExportLayoutRequest`) — só o **identificador exposto no front** muda.

### Destructuring permitido

Destructuring **sem rename** continua válido quando extrai prop com o **mesmo nome**:

```typescript
const { listing } = filters
const { open, close } = useEvents()
```

Só usar quando **não** houver outro `open`/`close`/`listing` no mesmo escopo. Se houver conflito, usar o objeto pai (`events.open`) ou reagrupar — nunca `{ open: outroNome }`.

## Retorno de objetos: só shorthand

Ao retornar um **objeto literal** — hooks, controllers, factories, mappers — **nunca** montar `prop: valor` inline no `return`. Montar cada valor (ou objeto aninhado) em **`const` antes**; o `return` usa **apenas shorthand** das props já definidas.

**Evitar:**

```typescript
return {
  listing: filters.listing,
  actions: {
    open: navigate.to.edition,
  },
}
```

**Preferir:**

```typescript
const { listing } = filters

const actions = {
  open: (id: string) => {
    navigate.to.edition(id)
  },
}

return { listing, actions }
```

**Evitar** — mappers com `prop: valor` inline no `return`:

```typescript
export class CompanyOptionMapper implements IMapper<Input, Output> {
  map(input: Input): Output {
    return {
      key: input.id,
      label: input.tradeName || input.legalName,
    }
  }
}
```

**Preferir** — cada prop em `const` antes; `return` só com shorthand:

```typescript
type Input = {
  id: string
  tradeName: string
  legalName: string
}
type Output = UnorderedOption

export class CompanyOptionMapper implements IMapper<Input, Output> {
  map(input: Input): Output {
    const { id, tradeName, legalName } = input

    const key = id
    const label = tradeName || legalName

    return { key, label }
  }
}
```

O `legalName?` do model fica em quem chama: `const legalName = company.legalName ?? EMPTY_STRING`. A regra `tradeName || legalName` fica no `*Mapper`.

Callback de `map` que monta objeto: **Nomenclatura de callbacks em coleções** ([estilo-escrita.md](estilo-escrita.md)).

- Objetos aninhados (`actions`, `navigate`, `selection`, etc.) também são **`const` separadas** antes do `return` — não inline dentro do objeto retornado.
- Dentro de `actions`, cada handler fica **inline na propriedade** — ver **Actions: definir inline no objeto**.
- Preferir **destructuring sem rename** quando extrair valor de outro objeto (`const { listing } = filters`, não `const listing = filters.listing` nem `{ listing: items }`), alinhado ao ESLint do projeto — ver **Nunca usar alias**.
- **Exceções**, só estas: retorno trivial de valor único (`return data`, `return null`) ou expressão que **não** seja objeto literal; a API do `*Map` de Prisma/DTO, que copia campo a campo (`tenantId: raw.tenant_id`); o objeto que uma lib pede com chave fixa: Prisma (`data`, `where`), Zod (`errorMap`), styled (`attrs`). Valem para o `return`, para o objeto de entrada e para o objeto montado no callback.

## `change` não entra em `actions`

`actions` é clique: abrir, fechar, salvar, confirmar. `change` é o `onChange` de input ou select. Exceção: o `actions.get` do hook de labels, que só lê (**`useLabels`**, arquitetura-front-hooks.md).

**Nunca** colocar `change` dentro de `actions`. Ou o retorno tem `actions`, ou tem `change` solto. Os dois podem existir juntos, mas `change` fica **irmão** de `actions`, nunca filho.

**Evitar:**

```typescript
const actions = {
  change: (id: string, value: string) => {
    reply(replies)
  },
}

return { answers, actions }
```

**Preferir:**

```typescript
const [answers, reply] = useState(new Array<Answer>())

const change = (id: string, value: string) => {
  reply(replies)
}

return { answers, change }
```

No JSX: `onChange={change}`. Clique continua `onClick={actions.open}`.

## Verbos da mesma ação viram um objeto

Dois métodos que fazem a mesma ação não ficam soltos, um ao lado do outro, com o verbo repetido no nome. Eles entram num objeto. O tipo do dono usa a interface desse objeto.

**Evitar:**

```typescript
type ParteneroChatSDK = {
  toggle: (open: boolean) => void
  toggleBubbleVisibility: (mode: Bubble) => void
}
```

**Preferir:**

```typescript
interface Toggle {
  open: (open: boolean) => void
  visibility: (mode: Bubble) => void
}

type ParteneroChatSDK = {
  toggle: Toggle
}
```

## Agrupar só o que é a mesma coisa

Um objeto (`change`, `actions`, `file`, …) só guarda operações que fazem a **mesma coisa**. Operação de outro assunto **não entra** nesse objeto. Ela **sai** e vira **irmão** no retorno. Se essa outra coisa tiver lógica própria, ela vai para um **hook** dela — não fica misturada no objeto dos outros.

Trocar o valor de um campo (`state`, `city`, `other`) é uma coisa: `change`. Criar e apagar arquivo é outra: `file`. Os dois não moram juntos. A chave velha **some** do objeto de origem — não fica nos dois lugares.

**Evitar** — arquivo misturado no `change`:

```typescript
const change = {
  state: (id: string, value: Value) => {
    save(id, value, replies)
  },
  city: (id: string, value: Value) => {
    save(id, value, replies)
  },
  other: (id: string, value: Value) => {
    save(id, value, replies)
  },
  file: async (id: string, file: FileProps) => {
    saveFiles(id, files)
  },
  removeFile: async (id: string, name: string) => {
    saveFiles(id, files)
  },
}

return { fields, answers, change }
```

**Preferir** — `change` só com troca de campo. Arquivo num hook `useFile`, devolvido como irmão:

```typescript
const file = useFile()

const change = {
  state: (id: string, value: Value) => {
    save(id, value, replies)
  },
  city: (id: string, value: Value) => {
    save(id, value, replies)
  },
  other: (id: string, value: Value) => {
    save(id, value, replies)
  },
}

return { fields, answers, change, file }
```

Dentro de `useFile`, o retorno é o objeto `file`:

```typescript
const file = {
  create: async (id: string, file: FileProps) => {
    saveFiles(id, files)
  },
  remove: async (id: string, name: string) => {
    saveFiles(id, files)
  },
}

return file
```

- `state`, `city` e `other` são a mesma coisa (troca de valor). Ficam juntos em `change`.
- `create` e `remove` são a mesma coisa (arquivo). Ficam juntos em `file`.
- Apareceu uma terceira coisa? Ela ganha o próprio objeto ou hook. Nunca entra no objeto dos outros.

## Actions: definir inline no objeto

Em objetos `actions` de **hooks, controllers e modals**:

1. **Nunca** repassar referência direta de outro serviço (`open: navigate.to.edition`, `close: modals.x.actions.close`) quando houver delegação com lógica ou side effects.
2. **Sempre** definir o handler **inline** na propriedade do `actions` — **nunca** extrair para `const` nomeada antes e repassar por shorthand.

Mesma regra de **`events.on`** (handler inline na chave) — ver **`events.on` em hooks locais**.

**Evitar** — referência direta:

```typescript
const actions = {
  open: navigate.to.edition,
}
```

**Evitar** — `const` separada + shorthand:

```typescript
const open = () => {
  modals.layoutConfig.open()
}

const actions = {
  open,
}
```

**Preferir** — corpo inline na propriedade:

```typescript
const actions = {
  open: () => {
    modals.layoutConfig.open()
  },
}
```

**Preferir** — curried inline quando a ação depende de id da linha:

```typescript
const actions = {
  open: (id: string) => () => {
    navigate.to.edition(id)
  },
}
```

- O objeto `actions` continua sendo **`const` separada** antes do `return` (shorthand no retorno) — ver **Retorno de objetos: só shorthand**.
- Quando a ação tiver lógica extra (validação, side effects, encadeamento), o corpo fica **dentro** da propriedade inline — não espalhar delegação solta nem extrair para `const` só para montar `actions`.
- **Nunca** anotar o objeto local com o tipo exportado do hook (`FieldSelectionActions`, `*Output['actions']`, etc.) — o tipo já está na assinatura de retorno (`FieldSelectionOutput`, `*Output`). Deixar o TypeScript inferir.

**Evitar** — anotação redundante na `const`:

```typescript
const actions: FieldSelectionActions = {
  replace: (groups: Groups) => {
    changeGroups(groups)
  },
}
```

**Preferir** — inferência + retorno tipado:

```typescript
const actions = {
  replace: (groups: Groups) => {
    changeGroups(groups)
  },
}

return { value, actions, change }
```

- Mesma regra para `change`, `getters`, `filters` e objetos irmãos montados antes do `return` em hooks — **sem** `: TipoExportado` na `const`; tipagem explícita fica no `export type *Output` e no retorno do hook.

### Componentes e stories: `actions` do contexto/hook

Componente ou story que só repassa a ação do hook ou do contexto: referência direta pode. Hook, controller e modal: corpo inline na propriedade.

Em **componentes** e **stories** que consomem contexto ou hook, montar um objeto `actions` local espelhando as ações necessárias e usar **`onClick={actions.open}`** (ou equivalente) — **sem** wrapper intermediário e **sem** prefixo `handle`.

```typescript
const context = useSimpleAccordionGroupContext()

const actions = {
  open: context.actions.open,
  close: context.actions.close,
}

<button type={BUTTON_TYPE} onClick={actions.open} />
```

- Delegação pura (`context.actions.open` → `actions.open` → `onClick`) **não** exige método wrapper — ver **Nunca usar prefixo `handle` ou `handler` em ações**.
- Só encapsular em método nomeado quando o componente **adiciona** lógica antes/depois da chamada.
- Quando `actions` (ou `state`, `getters`) já vêm **injetadas por props** — ex.: filho de `SimpleAccordionGroup.Header` — **não** criar hook local (`useHeading`, `useX`) só para repassar props ou embrulhar `actions.toggle` sem lógica extra; a prop chega pronta, usar direto no JSX (`onClick={actions.toggle}`). Ver **Não criar hook sem lógica**.

## Peça de papel: método do protocolo

Método, propriedade e resultado da peça, e o verbo genérico com as suas exceções, estão em [desenho.md](desenho.md): **A peça**, **Verbo genérico** e **Quem usa a peça**.

## Nunca usar prefixo `handle` ou `handler` em ações

Funções que executam ações — callbacks de botão, delegação a `actions`, submit de formulário, toggle, etc. — **nunca** usam o prefixo `handle` nem o sufixo/prefixo `handler` (`handleOpen`, `handleClick`, `handleSubmit`, `closeHandler`, `openHandler`).

**Evitar** — prefixo `handle`:

```typescript
const handleOpenAll = () => {
  actions.open()
}

<button type="button" onClick={handleOpenAll} />
```

**Evitar** — wrapper desnecessário quando a ação já existe no contexto/hook (delegação pura, sem lógica extra):

```typescript
const openAll = () => {
  actions.open()
}

<button type="button" onClick={openAll} />
```

**Preferir** — o bloco de **Componentes e stories: `actions` do contexto/hook**: `actions` montado do contexto e usado direto no JSX.

- Vale para componentes, stories e hooks — **sem exceção** por ser “só UI” ou Storybook.
- O prefixo `handle` é redundante: o uso em `onClick`, `onChange`, etc. já deixa claro que é callback de evento.
- **Não** criar função intermediária só para repassar `actions.open()` quando basta expor `actions.open` no objeto local e referenciar no evento.

## Nunca usar prefixo `resolve` em funções

Funções puras que calculam, derivam ou transformam um valor **nunca** usam o prefixo `resolve` (`resolveMappingStatus`, `resolveTheme`, `resolveUser`, etc.). O prefixo não comunica o que a função faz — só indica que algo "é resolvido".

**Evitar:**

```typescript
export const resolveMappingStatus = (code: string | null) => ...
export const resolveTheme = (status: Status) => ...
```

**Preferir** — nomear pelo **resultado** ou pelo **papel** da função:

| Papel | Padrão | Exemplo |
|-------|--------|---------|
| Retorna um conceito do domínio | substantivo do resultado | `mappingStatus(code)`, `theme(status)` |
| Transforma formato ou tipo (callback) | `toSomething` | `toDto`, `toUpperLabel` |
| Busca em mapa ou coleção | `findSomething` | `findThemeByStatus` |

**Certo:**

Dentro do hook ou da classe, sem `export const` solto:

```typescript
const mappingStatus = (code: string | null): MappingStatus => ...
const theme = (status: Status): Theme => ...
```

## Nunca usar prefixo `build` em métodos

Funções e métodos **nunca** usam o prefixo `build` (`buildAvailabilityContext`, `buildQuery`, `buildPayload`, etc.). O prefixo é genérico — não comunica o que a operação faz no domínio.

**Única exceção:** o `.build()` do `*Builder` que implementa `BuilderProtocol` ([desenho.md](desenho.md), **Verbo genérico**).

**Evitar:**

```typescript
private buildAvailabilityContext(...): Map<string, Context> { ... }
const buildPayrollQueryString = (params: Params) => ...
```

**Preferir** — verbo alinhado ao papel da operação:

| Papel | Padrão | Exemplo |
|-------|--------|---------|
| Montar estrutura ou coleção indexada | `create` + substantivo | `createAvailabilityContext`, `createTemplateNames` |
| Transformar formato ou tipo (método de classe) | `create` + substantivo ou verbo de domínio | `createFieldDTO`, `createMappings` |
| Transformar formato ou tipo (callback) | `toSomething` | `toDto`, `toContext` |
| Extrair de estrutura aninhada | `collect` + substantivo | `collectSystemFields` |

Esses verbos valem para passo `private` de peça nova ou de use case. Fix em arquivo velho não ganha `private collect*` / `create*` com regra: a regra vai numa peça de papel ([desenho.md](desenho.md)).

**Certo:**

```typescript
private createAvailabilityContext(categories: Array<Category>): Map<string, Context> { ... }
private collectSystemFields(categories: Array<Category>): Array<SystemField> { ... }
```

## Nunca usar `with` ou `without` em nomes (funções, tipos, variáveis, parâmetros)

**Nunca** usar os segmentos **`with`** ou **`without`** em identificadores — funções, callbacks, tipos, interfaces, parâmetros, `const`/`let`, props. Padrões como `WithSomething`, `somethingWithSomething`, `withoutPrefix` ou `withCountryCode` são genéricos demais e não comunicam o papel no domínio.

Vale para **todo** TypeScript/JavaScript do projeto — mappers, use cases, hooks, providers — **sem exceção**.

**Evitar:**

```typescript
type FieldWithMappings = { field: SystemDictionaryField; name: string; mappings: MappingWithLabel[] }
type MappingWithLabel = { mapping: SystemDictionaryMapping; label: string }

const withOrder = (options: OptionWithoutOrder[]): Option[] => ...
const withoutPrefix = value.replace(DDI_PREFIX_EXPRESSION, EMPTY_STRING)
const withCountryCode = digits.startsWith(BRAZIL_COUNTRY_CODE)
static toDTO(dictionary: SystemDictionary, fieldsWithMappings: FieldWithMappings[]): DTO
const toFieldDTO = (fieldWithMappings: FieldWithMappings) => ...
```

**Preferir** — nomear pelo **resultado**, pelo **papel de domínio** ou por `toSomething` quando for transformação:

| Papel | Padrão | Exemplo |
|-------|--------|---------|
| Tipo agregado para mapper/DTO | substantivo de domínio | `DictionaryField`, `FieldOption` |
| Parâmetro / variável | mesmo vocabulário do tipo | `dictionaryFields`, `dictionaryField`, `fieldOption` |
| Transformação (callback) | `toSomething` | `toOrdering`, `toOptionDTO` |
| Método privado de mapper | `create` + substantivo | `createFieldDTO`, `createMappings` |
| Função que retorna conceito | substantivo ou verbo de domínio | `orderedOptions(options)` |

**Certo:**

```typescript
type DictionaryField = { field: SystemDictionaryField; name: string; options: Array<FieldOption> }
type FieldOption = { mapping: SystemDictionaryMapping; label: string }

const orderedOptions = (options: Array<UnorderedOption>): Array<Option> => ...
static toDTO(dictionary: SystemDictionary, dictionaryFields: Array<DictionaryField>): DTO
const toFieldDTO = (dictionaryField: DictionaryField) => ...
```

- Alinhar com **Nomenclatura de callbacks em coleções**: transformações em `map` usam `toSomething`.
- **Não** confundir com APIs de biblioteca (`Object.assign`, HOCs de terceiros) — a regra vale para **código nosso**.

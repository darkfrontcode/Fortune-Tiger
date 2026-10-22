> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Arquitetura — front-end HR Tech

> **Escopo:** vale só no `hr-tech-frontend`. Some com o SKILL.md, o desenho.md e os arquivos de estilo. O código do projeto não é exemplo, nem o módulo de admission cards. Hooks de tela: [arquitetura-front-hooks.md](arquitetura-front-hooks.md).

## Pasta de componente

O componente **não** mora no `index`. A pasta tem o nome do componente. O arquivo do componente repete esse nome. O `index.ts` é barrel: só reexporta.

```
AdditionalFields/
  AdditionalFields.tsx
  index.ts
  styles.ts    # só se tiver estilo próprio
  types.ts     # só se tiver 3+ tipos compartilhados
```

```typescript
export { AdditionalFields } from './AdditionalFields'
```

**Evitar** — componente escrito direto no `index.tsx`.

**Preferir** — `AdditionalFields.tsx` com o componente e `index.ts` só com o export.

## Estrutura de um módulo de domínio

Um domínio se divide em **model** (`src/models/<Domain>`) e **API** (`src/services/api/<Domain>`), e a camada de tela consome via **mappers** e **hooks**.

Domínio novo: antes da primeira pasta, pergunte ao dono se vai nesta estrutura ou no `src/domains/` do AGENTS.md.

```
src/protocols/                 # IMapper, IFormatter, IFilter…: um contrato por papel, exportado no index.ts
src/models/<Domain>/
  data/          # constantes e dados estáticos do domínio
  dtos/          # contratos de payload e resposta (namespaces)
  enums/         # enums do domínio (um por arquivo)
  strategies/    # regras de decisão encapsuladas em classe
  filters/       # tira ou esconde valor (*Filter)
    AttachmentFieldFilter.ts
    AttachmentFieldFilter.spec.ts
  validators/    # confere regra (*Validator)
  index.ts       # barrel: export * de cada subpasta
src/services/api/<Domain>/
  <action><Entity>Request.ts   # uma função por request
  formatters/<Algo>QueryStringFormatter.ts
  index.ts                     # barrel: export * de cada request
src/views/<Area>/mappers/
  <Entity>Mapper.ts            # classes que implementam IMapper
src/views/<Area>/.../hooks/
  use<Action>Request.ts        # hook que orquestra o request
```

Cada subpasta tem seu próprio `index.ts` (barrel) reexportando os arquivos; o `index.ts` raiz do domínio faz `export * from './data'`, `'./dtos'`, etc. Os barrels de classe usam **named export explícito** (`export { AttachmentFieldFilter } from './AttachmentFieldFilter'`), e os de tipos/enums usam `export * from './Arquivo'`.

Domínio legado, com as interfaces no `index.ts`: a pasta nova (`filters/`) ganha `export * from './filters'` no fim dele. Quem usa importa de `models/<Domain>`. A peça importa os tipos do domínio com `import type`. Campo novo que a API manda entra no model como uma linha a mais. Somar linha no model ou no barrel não é mexer no vizinho.

## DTOs em `namespace`

Modelar contrato de cada operação como um `export namespace <Operacao>`, agrupando `Payload`, `DTO` e os tipos de entidade aninhados. Referenciar de fora como `Operacao.Tipo`.

```typescript
export namespace ListAdmissionCards {
  export type Assignee = {
    id: string
    name: string
    avatarUrl: string | null
    company: Snapshot | null
  }

  export type Card = {
    id: string
    laneKey: LaneKeyNames
    status: AdmissionCardStatus
    assignedTo: Assignee
    createdAt: Date
  }

  export type DTO = Array<Lane>
}
```

- Dentro do namespace de DTO, use `type` (não `interface`).
- Campos opcionais com `?`; ausência de valor com `| null` (seguir o que o contrato da API expõe).
- Reaproveitar tipos compartilhados (ex.: `Snapshot` de `models/Shared`) em vez de redeclarar.
- Nome do arquivo = nome do namespace (`GetAdmissionCardDetails.ts`).

### Resposta vazia (204 / sem body)

Quando a API retorna **204 No Content** ou sucesso **sem JSON**, **não** criar namespace/DTO em `models/.../dtos/` (ex.: `DeleteExportLayout` com `DTO = void`).

- **Request:** `Promise<void>` — `await api.delete(url)` sem desestruturar `data`.
- **Hook `useRequest`:** generic `void | undefined`, `initialValue` `undefined`; método do hook tipado como `Promise<void | null>` (sucesso `undefined`, erro `null` via `execute`).
- **Só** criar DTO quando existir contrato de payload de resposta de fato.

## Enums

Um enum por arquivo, nome do arquivo igual ao do enum; chaves em `UPPER_SNAKE_CASE`, valores string no formato que a API usa (`'form'`, `'in_admission'`, `'form/fill-employee-details'`). Quando houver enums fortemente relacionados, podem coexistir no mesmo arquivo (ex.: `StageTaskKeyNames.ts`). Barrel `enums/index.ts` reexporta todos.

```typescript
export enum TaskType {
  SYSTEM = 'system',
  TEMPLATE = 'template',
  CUSTOM = 'custom',
}
```

## Requests de API

Uma função por endpoint, **arrow function** `export const <action><Entity>Request`, sempre `async` e tipada com `Promise<DTO>`. Importar a instância `api` de `'..'`.

A função de request é exceção de 'sem função solta'.

```typescript
import { CreateManyAdmissionCards } from 'models/AdmissionCards/dtos'
import { api } from '..'

export const createManyAdmissionCardsRequest = async (
  body: CreateManyAdmissionCards.Payload,
): Promise<CreateManyAdmissionCards.DTO> => {
  const url = '/admission-cards'
  const { data } = await api.post<CreateManyAdmissionCards.DTO>(url, body)

  return data
}
```

```typescript
export const listSystemDictionariesRequest = async (): Promise<
  Array<ListSystemDictionaries.DTO>
> => {
  const url = '/system-dictionaries'
  const { data } = await api.get<Array<ListSystemDictionaries.DTO>>(url)

  return data
}
```

- **URL estática:** nunca passar path inline em `api.get` / `api.post` / `api.put` / `api.delete` — declarar `const url = '...'` **no corpo da função**, imediatamente antes da chamada, e usar `url` como argumento. É exceção registrada em **Strings literais: nunca soltas no código** (estilo-visual.md).
- Extrair `const { data } = await api.get<DTO>(url)` e **retornar `data`**.
- Parâmetros estruturados: receber um objeto e **desestruturar na assinatura**. A forma do parâmetro vem de `Namespace.Payload` ou de um `export interface <Nome>Payload` / `<Nome>Request` local no próprio arquivo do request.
- URLs com identificador dinâmico: `const url = \`/admission-cards/${cardId}/archive\`` (template literal na mesma `const url`, nunca inline na chamada `api.*`).
- URLs compostas de vários segmentos: usar **`StringBuilder`** (de `builders`), **um `.add(...)` por linha** e `.build()` no fim — alinhado à seção *Encadeamento estilo builder*.
- Identificadores dinâmicos na URL: passar por `encodeURIComponent`.

```typescript
const url = new StringBuilder()
  .add(`/admission-cards/${cardId}`)
  .add(`/stages/${stageKeyName}`)
  .add(`/tasks/${taskType}/${identifier}`)
  .build()
```

- Query string nova: classe `<Algo>QueryStringFormatter implements IFormatter<Input, Output>`, método `format`, em `formatters/`, dentro da pasta dos requests. `URLSearchParams` e um `if` por parâmetro. Lista: `value.join(SEPARATOR)` com `const` no topo. `create*QueryString` solta em `mappers.ts` é legado.

## Mappers

Transformação de DTO → modelo de tela vive em classe que `implements IMapper<Input, Output>` (de `protocols`), com `type Input` / `type Output` no topo e um método `map(input: Input): Output`.

```typescript
type Input = ListAdmissionCards.DTO
type Output = Array<Stage>

export class AdmissionCardMapper implements IMapper<Input, Output> {
  map(input: Input): Output {
    const toCard = (card: ListAdmissionCards.Card): Card => {
      const date = moment(card.createdAt)
      const createdAt = date.toDate()

      return { ...card, createdAt }
    }

    const toLane = (lane: ListAdmissionCards.Lane): Stage => {
      const cards = lane.cards.map(toCard)

      return { ...lane, cards }
    }

    const byOrder = (prev: ListAdmissionCards.Lane, next: ListAdmissionCards.Lane): number => prev.order - next.order

    return input
      .slice()
      .sort(byOrder)
      .map(toLane)
  }
}
```

- Definir as transformações e predicados como **callbacks nomeados dentro do `map`** (`toCard`, `toLane`, `toTrack`, `toCalendar`, `byOrder`, `byActiveStage`) — seguindo a tabela `to*` / `by*` das seções de estilo.
- Encadeamentos (`.slice().sort().map()`) **quebrados, um método por linha**.
- `EMPTY_STRING` vem de `helpers`: pasta legada, só importe, nunca crie arquivo lá.
- Formatação de data com `moment` e um `const DATE_FORMAT = 'DD/MM/YYYY'` no topo do arquivo (string literal nunca solta).

### Mapper centralizador (payload com variantes por origem)

Quando o payload junta **várias origens** (ex.: diretório, evento de folha, data dinâmica, campo fixo), **não** colocar toda a lógica num único arquivo — nem repetir o mesmo encadeamento (`flatMap` → `filter` → `map`) várias vezes com callbacks diferentes.

**Estrutura:**

```
mappers/
  SelectableTabFieldsBaseMapper.ts       # lógica compartilhada entre abas (se houver)
  DirectoryAddExportLayoutFieldMapper.ts # uma origem
  PayrollEventAddExportLayoutFieldMapper.ts
  DynamicDateAddExportLayoutFieldMapper.ts
  FixedAddExportLayoutFieldMapper.ts
  AddExportLayoutFieldsPayloadMapper.ts  # centralizador — só delega e junta
  index.ts
```

**Evitar** — monolito com funções soltas e blocos repetidos no mesmo arquivo (`AddExportLayoutFieldsPayloadMapper.ts`):

```typescript
const toGroup = (group: ISelectable<SelectableGroupData>) => group.data.fields
const byChecked = (field: ISelectable<ExportationFieldProps>) => field.checked

const createDirectoryFields = (tab: SelectableTab): Array<DirectoryField> => {
  const toDirectoryField = (field: ISelectable<ExportationFieldProps>): DirectoryField => ({
    source: LayoutFieldOrigin.DIRECTORY,
    systemFieldId: field.data.id,
  })

  return tab.fields.selection.selectables.value
    .flatMap(toGroup)
    .filter(byChecked)
    .map(toDirectoryField)
}

const createPayrollEventFields = (tab: SelectableTab): Array<PayrollEventField> => { ... }

const createDynamicDateFields = (tab: SelectableTab): Array<DynamicDateField> => { ... }

export class AddExportLayoutFieldsPayloadMapper implements IMapper<Input, Output> {
  map({ directory, events, dates, fixedFields }: Input): Output {
    return {
      fields: [
        ...createDirectoryFields(directory),
        ...createPayrollEventFields(events),
        ...createDynamicDateFields(dates),
        ...createFixedFields(fixedFields),
      ],
    }
  }
}
```

Problemas: lógica de várias origens no mesmo arquivo; encadeamento duplicado; difícil de testar e de estender.

**Evitar também** — “DRY falso” com `createFields(tab, toField)` genérico no centralizador: continua sendo monolito; só esconde a repetição.

**Preferir** — mapper por origem + base compartilhada + centralizador enxuto.

`SelectableTabFieldsBaseMapper.ts`:

```typescript
type Input = FieldsSelectionOutput
type Output = Array<ISelectable<ExportationFieldProps>>

export class SelectableTabFieldsBaseMapper implements IMapper<Input, Output> {
  map(input: Input): Output {
    const { selection } = input

    const toFields = (group: ISelectable<SelectableGroupData>) => group.data.fields
    const byChecked = (field: ISelectable<ExportationFieldProps>) => field.checked

    const groups = selection.selectables.value

    return groups
      .flatMap(toFields)
      .filter(byChecked)
  }
}
```

`DirectoryAddExportLayoutFieldMapper.ts`:

```typescript
type Input = DirectoryOutput
type Output = Array<AddExportLayoutFields.DirectoryField>

export class DirectoryAddExportLayoutFieldMapper implements IMapper<Input, Output> {
  private readonly mapper = new SelectableTabFieldsBaseMapper()

  map(input: Input): Output {
    const { fields } = input

    const toDirectoryField = (field: ISelectable<ExportationFieldProps>) => {
      const source = LayoutFieldOrigin.DIRECTORY
      const systemFieldId = field.data.id

      return { source, systemFieldId }
    }

    const mapped = this.mapper.map(fields)

    return mapped.map(toDirectoryField)
  }
}
```

`AddExportLayoutFieldsPayloadMapper.ts` (centralizador):

```typescript
type Input = {
  directory: DirectoryOutput
  events: PayrollEventsOutput
  dates: DynamicDatesOutput
  fixedFields: FixedFieldsOutput
}

type Output = AddExportLayoutFields.Payload

export class AddExportLayoutFieldsPayloadMapper implements IMapper<Input, Output> {
  private readonly directory = new DirectoryAddExportLayoutFieldMapper()

  private readonly payrollEvent = new PayrollEventAddExportLayoutFieldMapper()

  private readonly dynamicDate = new DynamicDateAddExportLayoutFieldMapper()

  private readonly fixed = new FixedAddExportLayoutFieldMapper()

  map(input: Input): Output {
    const { directory, events, dates, fixedFields } = input

    const mapped = {
      directory: this.directory.map(directory),
      payrollEvent: this.payrollEvent.map(events),
      dynamicDate: this.dynamicDate.map(dates),
      fixed: this.fixed.map(fixedFields),
    }

    const fields = [
      ...mapped.directory,
      ...mapped.payrollEvent,
      ...mapped.dynamicDate,
      ...mapped.fixed,
    ]

    return { fields }
  }
}
```

Regras:

| Papel | Responsabilidade |
|---|---|
| **Base** (`*BaseMapper`) | Trecho **idêntico** reutilizado por 2+ mappers concretos (ex.: extrair campos marcados de uma aba) |
| **Mapper concreto** (`Directory*`, `PayrollEvent*`, …) | **Uma origem** — `implements IMapper<Input, Output>` com `map` único |
| **Centralizador** (`*PayloadMapper`) | Uma `private readonly` **por mapper** (`directory`, `payrollEvent`, …) — delega via `this.<prop>`, concatena — **sem** objeto agrupando mappers |
| **Factory** (`*MapperFactory`) | Input com discriminante (`field.source`): `IFactory`, `create(input)` de instância, um `if` por origem |

- Centralizador **nunca** cresce com `createXFields` / `toXField` de cada origem — isso vira arquivo próprio.
- Arquivo com o nome da classe: `DirectoryAddExportLayoutFieldMapper.ts`.
- Exportar centralizador + tipos no barrel; mappers internos só se outro módulo precisar.

## Sem `tools/` e sem `helpers/`

Nunca gaveta, front e back: a lista, o papel, o protocolo e o exemplo estão em [desenho.md](desenho.md). `StagePipelineTools` e outros `*Tools` do projeto são legado. Não copie.

## Strategies (regra de decisão)

Quando a regra de negócio **escolhe entre variantes** (tipos de campo, origem, modo de operação), encapsular em **`strategies/`** no nível do módulo, nunca numa gaveta ([desenho.md](desenho.md)).

### Estrutura

```
strategies/
  protocols/
    <Feature>StrategyProtocol.ts   # input + interface estendendo StrategyProtocol
    index.ts
  <Variant>AStrategy.ts            # uma classe por variante
  <Variant>BStrategy.ts
  <Feature>.ts                     # Context: instância, implementa StrategyProtocol
  index.ts
```

- **Protocol** em `strategies/protocols/`, estendendo o protocolo de strategy do lado: `StrategyProtocol` de `shared/protocols` no back, `IExecute` de `protocols` no front. Método **`execute`**, nunca `matches`.
- **Concretas** implementam o protocol; nomes **curtos** (`WaterStrategy`, `SelectFieldStrategy`) — o contexto do módulo já qualifica o domínio. **Uma classe por variante.** A regra dessa variante mora nela. **Nunca** uma classe só que recebe a variante no constructor e lê uma tabela com todas as combinações.
- **Context** (`FieldAvailability`) é instância e implementa o mesmo protocolo de strategy. Guarda a lista em `private readonly`, acha a variante pelo discriminante (`readonly source`) e chama o `execute` dela. Quem usa guarda o Context em `private readonly`. Nunca `static`, `from`, `resolve`, `*Registry`, nem tabela de combinações.
- Pré-condições transversais (ex.: ativo e não deletado) ficam no **orquestrador**, não duplicadas em cada strategy.
- Callback do `.find()` nomeado: `bySource`.

`strategies/protocols/FieldAvailabilityStrategyProtocol.ts`:

```typescript
import type { StrategyProtocol } from '../../../../shared/protocols'

export type FieldAvailabilityInput = {
  source: SystemDictionaryFieldSource
  field: SystemField
}

export interface FieldAvailabilityStrategyProtocol
extends StrategyProtocol<FieldAvailabilityInput, boolean> {
  readonly source: SystemDictionaryFieldSource
}
```

`strategies/SelectFieldStrategy.ts`:

```typescript
type Input = FieldAvailabilityInput
type Output = boolean

export class SelectFieldStrategy implements FieldAvailabilityStrategyProtocol {
  readonly source = SystemDictionaryFieldSource.SELECT_FIELD

  execute(input: Input): Output {
    const { field } = input

    return field.options.length > EMPTY_NUMBER
  }
}
```

`strategies/FieldAvailability.ts`:

```typescript
type Input = FieldAvailabilityInput
type Output = boolean

export class FieldAvailability implements StrategyProtocol<Input, Output> {
  private readonly strategies: Array<FieldAvailabilityStrategyProtocol> = [
    new SelectFieldStrategy(),
    new EntityFieldStrategy(),
  ]

  execute(input: Input): Output {
    const { source } = input

    const bySource = (strategy: FieldAvailabilityStrategyProtocol) => strategy.source === source
    const strategy = this.strategies.find(bySource)

    if (!strategy) { return false }

    return strategy.execute(input)
  }
}
```

## Só front: mapa local no hook

No back, nunca: use classe `Map` ([arquitetura-back-dados.md](arquitetura-back-dados.md)).

Quando um hook precisa **agir de formas diferentes conforme um enum ou chave** (passo do wizard, origem do fluxo, tipo de ação), montar um **objeto literal** com **uma entrada por valor** e despachar com `mapa[chave]()` — **nunca** cadeia de `if`/`else if` nem `switch` no corpo da action.

Chaves repetidas com o mesmo comportamento **reutilizam a mesma referência** de callback (ex.: `proceed` em vários passos). Cada ramo é uma referência a uma `const` ou uma função de uma linha. Ramo com mais de um passo vira `const` com nome antes do objeto (`save`). Sem tipo `Record`.

**Evitar** — ramificação por enum dentro da action:

```typescript
advance: async () => {
  const { keyName } = timeline.step.value

  if (keyName !== StepKeyNames.FIELDS) {
    timeline.actions.advance()
    return
  }

  const saved = await layoutConfig.actions.update()
  if (saved === null) {
    return
  }

  timeline.actions.advance()
},
```

**Preferir** — mapa local dentro da action + lookup:

```typescript
advance: async () => {
  const { keyName } = timeline.step.value

  const proceed = () => timeline.actions.advance()

  const save = async () => {
    const saved = await layoutConfig.actions.update()

    if (saved === null) { return }

    proceed()
  }

  const steps = {
    [StepKeyNames.FIELDS]: save,
    [StepKeyNames.MAPPINGS]: proceed,
    [StepKeyNames.SETTINGS]: proceed,
  }

  const step = steps[keyName]

  await step()
},
```

Quando o mapa vira regra de domínio, cada valor vira uma strategy. Se só converte, vira `*Mapper`. Em hook de tela, o objeto local basta.

## Data / constantes do domínio

- Constantes em `UPPER_SNAKE_CASE`; tuplas de ordem com `as const`.
- Usar `Set` para checagem de pertencimento (`DISABLED_STAGES.has(...)`) e `Object.fromEntries(...)` para registros derivados (ex.: ordem a partir da tupla do pipeline).
- Não comentar a regra em cima da constante. A classe ou o nome já dizem. Ver **Sem comentário**.
- Estados iniciais de entidade ficam em constantes `INITIAL_<X>` tipadas pelo DTO, reaproveitando `EMPTY_STRING`.

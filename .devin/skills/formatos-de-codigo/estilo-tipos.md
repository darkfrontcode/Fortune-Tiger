> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Estilo de tipos

## Tipos antes de constantes

No topo do arquivo, depois dos imports, **todo tipo vem antes de qualquer `const`**. Vale para `export type`, `type`, `interface` e `export interface`.

O tipo **não** fica no meio do arquivo, depois de função, mapper ou helper. Se ele nasceu lá embaixo, **sobe** para junto dos outros tipos, antes da primeira `const`.

Exceção: o tipo que sai de uma `const` (`z.infer<typeof schema>`) vem logo depois dela. Antes dela, o lint do back acusa uso antes da definição.

**Evitar:**

```typescript
const mapper = new CheckedFieldIdsMapper()

export type CreateAdmissionTemplatePayloadInput = {
  form: NewTemplateForm
  groups: Array<Group>
}
```

**Preferir:**

```typescript
export type CreateAdmissionTemplatePayloadInput = {
  form: NewTemplateForm
  groups: Array<Group>
}

const mapper = new CheckedFieldIdsMapper()
```

## Input e Output de peça de papel

`type Input` e `type Output` no topo, sem `export`. Não vão para `types.ts` nem para namespace, não importa o vizinho. O resto da forma e o exemplo estão em [desenho.md](desenho.md), **A peça**.

## Tupla com nome no topo

Tupla não fica escrita na hora, no retorno nem no parâmetro. Ela vira um `type` no topo do arquivo, depois dos imports e antes de qualquer `const`.

**Errado:**

```typescript
const toPair = (layout: ExportLayout): [string, ExportLayout] => {
  return [layout.id, layout]
}
```

**Certo** — o tipo nasce no topo do arquivo, e o callback fica no método que faz o `.map`:

```typescript
type LayoutPair = [string, ExportLayout]

private createLayoutContext(layouts: Array<ExportLayout>): Map<string, ExportLayout> {
  const toPair = (layout: ExportLayout): LayoutPair => [layout.id, layout]
  const pairs = layouts.map(toPair)

  return new Map(pairs)
}
```

## Atalho do namespace no arquivo que usa

Quando o arquivo importa um `namespace` de `types.ts` (`ExtraFieldsType`, `FieldsType`, …) e usa os tipos dele, **criar um `type` alias no topo**, depois dos imports e **antes** de qualquer `const`. O resto do arquivo usa só o atalho. **Nunca** repetir `ExtraFieldsType.Answer` no meio da função.

O alias tem o **mesmo nome** do tipo de dentro (`Answer`, `Value`, `Field`).

**Evitar:**

```typescript
const [answers, reply] = useState(new Array<ExtraFieldsType.Answer>())

const change = (id: string, value: ExtraFieldsType.Value) => {
  reply(replies)
}
```

**Preferir:**

```typescript
type Answer = ExtraFieldsType.Answer
type Value = ExtraFieldsType.Value

const [answers, reply] = useState(new Array<Answer>())

const change = (id: string, value: Value) => {
  reply(replies)
}
```

Vale para **todo** tipo do namespace usado naquele arquivo (`Field`, `Input`, `Output`, …), não só os que aparecem muitas vezes.

**Tipos em arquivos de hook:** composições internas (`Actions`, `Getters`, `Events`, `On`, `State`) não repetem o nome do hook. Só a saída leva o nome: `{Hook}Output` (no namespace, só `Output`). **Um namespace por hook ou componente.** Ordem: ver **Ordem de tipos em hooks**.

## Namespace em `types.ts`

O `export namespace` **não** fica no arquivo da lógica (`accountingGroups.ts`, `useX.ts`). Ele mora no `types.ts` do dono (a pasta do hook ou do componente).

**Evitar** — tipo e função no mesmo arquivo:

```typescript
export namespace AccountingGroupsType {
  export type Group = { templateId: string }
}

export const createAccountingGroups = async () => {}
```

**Preferir** — `types.ts` do hook, e o hook só importa o atalho.

## Tipos em `types.ts`: usar `namespace`

Quando o hook ou componente tiver **3 ou mais tipos** exportados e existir `types.ts` na subpasta do hook ou na pasta do componente, **sempre** agrupar em um **`export namespace`** com sufixo **`Type`** — nome da feature **sem** prefixo `use` + `Type` (`LayoutConfigModalType`, `BulletType`, `SimpleTimelineType`, …).

| Dono | Sufixo do namespace | Exemplo |
|------|---------------------|---------|
| Hook (`useBullet`, `useTimeline`, …) | `Type` | `BulletType`, `TimelineType` |
| Componente (`Bullet`, `SimpleTimeline`, …) | `Type` | `BulletType`, `SimpleTimelineType` |

**Evitar** — namespace sem sufixo (só o nome da feature):

```typescript
export namespace Bullet { ... }
export namespace LayoutConfigModal { ... }
export namespace SimpleTimeline { ... }
```

- `Bullet` é hook: vira `BulletType`.
- `LayoutConfigModal` é hook: vira `LayoutConfigModalType`.
- `SimpleTimeline` é componente: vira `SimpleTimelineType`.

Dentro do namespace:

1. **Composições internas** — do mais aninhado ao agregador (`Header`, `Footer` → `Config`; `On` → `Events`; `Getters` → `Actions`).
2. **`Input`** — parâmetros do hook, quando existir.
3. **`Output`** — retorno público do hook.

**Evitar** — tipos soltos com prefixo do hook:

```typescript
type Header = { title: string; callback: () => void }

export type LayoutConfigModalInput = { close?: () => void }

export type LayoutConfigModalOutput = { config: Config }
```

**Preferir** — namespace único; referência externa `LayoutConfigModalType.Input`, `LayoutConfigModalType.Output`:

```typescript
export namespace LayoutConfigModalType {
  export type Header = {
    title: string
    callback: () => void
  }

  export type Footer = {
    left: Array<IButtonConfig>
    right: Array<IButtonConfig>
  }

  export type Config = {
    header: Header
    footer: Footer
  }

  export type Input = {
    close?: () => void
  }

  export type Output = {
    config: Config
  }
}
```

```typescript
import { LayoutConfigModalType } from './types'

export const useLayoutConfigModal = ({
  close,
}: LayoutConfigModalType.Input): LayoutConfigModalType.Output => { ... }
```

- Barrel da subpasta: `export type { LayoutConfigModalType } from './types'` — **não** reexportar `Input`/`Output` soltos.
- Hook **sem** parâmetros omite `Input`; composições internas continuam acima de `Output`.
- Tipos **inline** no mesmo arquivo do hook (sem `types.ts`, menos de 3 tipos) seguem **Ordem de tipos em hooks** abaixo — **sem** namespace.

## Um `namespace` por componente ou hook (nunca centralizar na raiz)

O `export namespace` agrupa tipos **de um único dono** — hook, componente raiz ou subcomponente — **não** de um módulo/feature inteiro.

**Regra:** cada hook ou componente com `types.ts` tem **seu próprio** arquivo e **seu próprio** namespace com sufixo **`Type`** (nome da feature **sem** prefixo `use` + sufixo). **Proibido** um `types.ts` na raiz da pasta da feature reunindo tipos de vários hooks, subcomponentes e contextos.

| Dono | Onde fica o `types.ts` | Namespace (exemplo) |
|------|------------------------|---------------------|
| Hook `useTimeline` | `hooks/timeline/types.ts` | `TimelineType` |
| Hook `useBullet` | `components/Bullet/hooks/bullet/types.ts` | `BulletType` |
| Componente raiz `SimpleTimeline` | `SimpleTimeline/types.ts` (ou inline se &lt; 3 tipos) | `SimpleTimelineType` |
| Subcomponente `Content` | `components/Content/types.ts` (ou inline se &lt; 3 tipos) | `ContentType` |
| Subcomponente `Bullet` | `components/Bullet/types.ts` (ou inline se &lt; 3 tipos) | `BulletType` |

**Evitar** — `types.ts` na raiz acumulando hook + componentes:

```text
SimpleTimeline/
  types.ts              ← Timeline.Item, SimpleTimeline.Input, ContentInput… tudo junto
  hooks/timeline/
  components/Content/
```

Anti-padrão em `SimpleTimeline/types.ts`: centralizado e sem sufixo `Type`. `Item` e `Actions` são do hook Timeline (`TimelineType`). `ContentInput` é do `Content` (`ContentType`). `Input` fica aqui, mas em `SimpleTimelineType`.

```typescript
export namespace SimpleTimeline {
  export type Item = { ... }
  export type Actions = { ... }
  export type ContentInput = { ... }
  export type Input = { ... }
}
```

**Preferir** — colocado no dono; import cruzado quando outro arquivo precisar:

```text
SimpleTimeline/
  hooks/timeline/types.ts
  components/Content/Content.tsx
  types.ts
```

Em `hooks/timeline/types.ts`:

```typescript
export namespace TimelineType {
  export type Item = { key: string; label: string; order?: number }
  export type Actions = { advance: () => void; back: () => void; go: (key: string) => void }
  export type Input = { mode: TimelineMode; items: Array<Item> }
  export type Output = { mode: TimelineMode; active: string; items: Array<Item>; actions: Actions }
}
```

Em `SimpleTimeline/types.ts`, só props da raiz:

```typescript
import { PropsWithChildren } from 'react'
import { TimelineType } from './hooks/timeline/types'

export namespace SimpleTimelineType {
  export type Input = PropsWithChildren<TimelineType.Input>
}
```

- **Enums** continuam em `enums/` (um arquivo por enum), **fora** de `types.ts` — ver **Estrutura de um módulo de domínio** (arquitetura-front.md).
- Tipos compartilhados entre dois hooks **só** quando o **mesmo bloco** de tipos for consumido **identicamente** — caso raro; preferir duplicar `Input` mínimo ou extrair tipo de domínio em `models/`, não um mega-`types.ts` na raiz da UI.
- Barrel da feature (`index.ts`) pode reexportar namespaces públicos (`TimelineType`, `SimpleTimelineType`) — **não** significa que os tipos vivam no mesmo arquivo.

## Ordem de tipos em hooks

Em arquivos `use*.ts` **sem** `types.ts` separado, a ordem do arquivo é:

1. **imports**
2. **Tipos exportados** — nesta ordem interna (do topo para baixo):
   - **Composições internas** — do mais aninhado ao agregador (`On` → `Events`; `Getters` → `Actions`).
   - **Tipo de entrada** — `Input` ou `{Hook}Input` (`OverrideInput`, …), quando existir.
   - **Tipo de saída** — `{Hook}Output` (`LabelsOutput`, `OverrideOutput`, `SelectionOutput`, …).
3. **`const` de módulo** — instâncias (`const mapper = new …()`), constantes de arquivo, etc.
4. **Implementação do hook** — `export const use… = …`.

**Tipos exportados sempre acima de `const` de módulo** — nunca declarar mapper ou constante de arquivo antes dos `export type`.

**Errado:**

```typescript
const mapper = new AvailableFieldsMapper()

interface Actions {
  start: () => Promise<void>
}

export interface SelectionOutput {
  selection: DictionaryFieldSelectionOutput
  loader: boolean
  actions: Actions
}
```

**Certo:**

```typescript
interface Actions {
  start: () => Promise<void>
}

export interface SelectionOutput {
  selection: DictionaryFieldSelectionOutput
  loader: boolean
  actions: Actions
}

const mapper = new AvailableFieldsMapper()
```

Em arquivo de hook, a instância é `const` de módulo. Em classe, é `private readonly` ([desenho.md](desenho.md)).

Com **`types.ts`**, a ordem interna dos tipos vale **dentro do `namespace`** — ver **Tipos em `types.ts`: usar `namespace`**.

**Evitar** — saída antes da entrada, ou entrada/saída acima de tipos que compõem o retorno:

```typescript
export type OverrideInput = { mappingId: string }

interface On { change: (event: ChangeEvent<HTMLInputElement>) => void }

export interface OverrideOutput { events: Events }
```

**Preferir:**

```typescript
interface On {
  change: (event: ChangeEvent<HTMLInputElement>) => void
}

interface Events {
  on: On
}

export type OverrideInput = {
  mappingId: string
  code: string | null
  status: SystemDictionaryMappingStatus
}

export interface OverrideOutput {
  placeholder: string
  value: string
  message: string | null
  events: Events
}

export const useOverride = ({ mappingId, code, status }: OverrideInput): OverrideOutput => {
  return { placeholder, value, message, events }
}
```

- Hook **sem** parâmetros omite o tipo de entrada; composições internas continuam acima de `{Hook}Output`.
- Sem `types.ts`: composições e `{Hook}Output` são `interface`; `{Hook}Input` é `type`. Com `types.ts`, tudo dentro do namespace é `export type`.

## Retorno de hook: `actions` em interface separada

Quando `{Hook}Output` (ou `{Hook}Output` como `export interface`) incluir **`actions`**, **nunca** definir `actions` inline dentro do tipo de saída. Extrair **`Actions`** (sem o nome do hook) como **`interface`** **acima** de `{Hook}Output` e referenciar `actions: Actions`.

- **`Actions`:** `interface` sem `export` quando só compõe o output daquele arquivo; `export interface` só se outro módulo importar.
- **`{Hook}Output`:** preferir **`export interface`** (não `export type`) quando for o contrato público do hook.
- Mesma regra vale para composições irmãs (`Events`, `Getters`, …) quando forem objeto nomeado no output — extrair interface/type nomeado **antes** do output, alinhado à **Ordem de tipos em hooks**.

**Evitar:**

```typescript
export type SearchOutput = {
  value: string
  actions: {
    clear: () => void
  }
}
```

**Preferir:**

```typescript
interface Actions {
  clear: () => void
}

export interface SearchOutput {
  value: string
  actions: Actions
}
```

## Composição interna de ações: preferir `Actions`

Quando o arquivo do hook define um **tipo de saída de domínio** (ex.: `Checks`) cujas propriedades são **ramificações irmãs** com a **mesma forma** de handlers (`item`, `group`, …), extrair essa forma em **`interface Actions`** — **não** `{Hook}Actions`, `{Parent}Actions`, `*Scope`, etc.

O contexto já está no arquivo do hook e nas chaves do agregador (`check`, `uncheck`, …).

**Evitar:**

```typescript
export interface ChecksActions {
  item: (groupId: string, itemId: string) => () => void
  group: (groupId: string) => () => void
}

export interface Checks {
  check: ChecksActions
  uncheck: ChecksActions
}
```

**Preferir:**

```typescript
export interface Actions {
  item: (groupId: string, itemId: string) => () => void
  group: (groupId: string) => () => void
}

export interface Checks {
  check: Actions
  uncheck: Actions
}
```

- **`Actions`** é a composição do retorno; **`export interface Actions`** quando outro módulo importar.

## Constantes de validação (booleanas)

Constantes locais que guardam o resultado de uma comparação, checagem ou predicado (`===`, `!==`, `.includes()`, etc.) **não** usam prefixos booleanos como `is`, `has`, `can`, `should`, `was`, `were`.

O nome descreve **o estado ou condição validada** — substantivo ou particípio/adjetivo — não a forma “pergunta sim/não”.

**Certo:**

```typescript
const archived = status === ExportLayoutStatus.ARCHIVED
const active = user.status === UserStatus.ACTIVE
const empty = list.length === EMPTY_NUMBER
```

**Errado:**

```typescript
const isArchived = status === ExportLayoutStatus.ARCHIVED
const hasItems = list.length > 0
const canEdit = role === Role.EDITOR
```

## Nunca usar `match` em nomes

**Proibido** usar **`match`**, **`matches`**, **`matching`** ou **`matched`** em nomes de variáveis, constantes, callbacks, parâmetros ou métodos — inclui compostos como `matchCompanyName`, `matchesCompanyName`, `hasMatch`, `nameMatch`, `matchedPerson`, etc. Soa genérico, ambíguo e **nunca** deve ser sugerido como nome — nem em revisões, nem em respostas de naming.

**Preferir** nome de estado (`target`, `found`, `duplicate`, `equal`, `empty`). Callback de predicado: `by*`.

**Errado:**

```typescript
const matches = option.id === optionId
const match = companyNames.some(matchesCompanyName)
const matchesCompanyName = (companyName: string) => { ... }
const hasCompanyName = (companyName: string) => { ... }

if (!matches) {
  return option
}
```

**Certo:**

```typescript
const target = option.id === optionId

const byCompanyName = (companyName: string) => companyName === name
const found = companyNames.some(byCompanyName)

if (!target) { return option }
```

**Exceção:** símbolos **já existentes** no código legado (ex.: `TextMatcherFactory`) — não renomear; a proibição vale para **nomes novos** que o agente cria ou sugere.

## Nunca estreitar valor com `typeof` e ternário

**Proibido** gambiarra para “descobrir o tipo” no meio do código: `typeof value === 'string' ? value : undefined`, `typeof x === 'number' ? x : null`, e o mesmo espírito com `as` só para o TypeScript calar.

O valor do campo **já é** o valor. Se não tem resposta, o `if` para. Não inventa um segundo valor mágico.

**Evitar:**

```typescript
const stateValue = typeof saved?.value === 'string' ? saved.value : undefined

if (!stateValue) { return }

localities.cities(stateValue)
```

**Preferir:**

```typescript
if (!saved) { return }

localities.cities(saved.value)
```

## Nunca usar `!!` (double negation)

**Proibido** usar o operador `!!` para forçar booleano ou estreitar tipo.

**Preferir:**

- Comparação explícita: `value !== undefined`, `value !== null`, `value != null`
- `Boolean(value)` quando a intenção for coerção truthy/falsy explícita
- Type guard com comparação: `(id): id is string => id !== undefined`

**Evitar:**

```typescript
const byDefinedSystemFieldId = (
  systemFieldId: string | undefined,
): systemFieldId is string => !!systemFieldId
```

**Preferir:**

```typescript
const byDefinedSystemFieldId = (
  systemFieldId: string | undefined,
): systemFieldId is string => systemFieldId !== undefined
```

## Nunca usar Row / Col (e variantes)

**Nunca** chamar uma `div`, um styled component ou qualquer bloco de **`Row`**. Nem `Row`, nem `*Row`, nem `row` em parâmetro. O nome descreve posição de tabela, não o papel na tela. Use `Line`, `Item` ou o papel real (`Field`, `Label`).

**Proibido** usar termos de layout genérico de tabela/grid — **`Row`**, **`Col`**, **`Column`**, **`HeaderRow`**, **`ColumnHeader`**, **`DataRow`**, etc. — como nome de:

- `const`
- componentes React
- styled components
- tipos, interfaces e props

Esses nomes descrevem **posição visual**, não **domínio** nem **papel semântico**. Preferir substantivos do negócio ou do papel na UI:

| Evitar | Preferir (exemplos) |
|--------|---------------------|
| `MappingRow`, `toMappingRow` | `Mapping`, `MappingItem`, `MappingLine` |
| `HeaderRow`, `ColumnHeader` | `Header`, `Heading`, `Title`, `Caption` |
| `DataRow`, `TableRow` | `Item`, `Line`, `Record` |
| `CatalogRow`, `*Row` em type/interface (ex.: `DominioMunicipalityCatalogRow`) | Nome de **domínio** (`DominioMunicipalityCode`, `CatalogItem`, …) — **nunca** sufixo `Row` |
| `Col`, `Column`, `ColLabel` | `Label`, `LabelSlot`, `FieldName`, `Caption` |
| `Row`, `RowWrapper` | `Item`, `Line`, `Container` |

Em **CSS Grid**, nomes de `grid-template-areas` e wrappers `grid-area` seguem a mesma regra — ver **CSS Grid: sempre com `grid-template-areas`**.

**Certo:**

```typescript
const MappingItem = styled.li`...`
const Header = styled.div`...`
const LabelSlot = styled.span`...`

export const Mapping = ({ mapping }: MappingInput) => ( ... )
```

**Errado:**

```typescript
const MappingRow = styled.div`...`
const HeaderRow = styled.div`...`
const ColumnHeader = styled.span`...`

export const MappingRow = ({ mapping }: MappingRowInput) => ( ... )
```

Vale para **constantes** no topo do arquivo, **callbacks** (`toMappingRow`), **exports**, **pastas** e **aliases de tipo** (`type XxxRow = …`) — mesma regra; parâmetros de callback também (**nunca** `(row: …)` quando o nome for genérico de tabela — usar substantivo de domínio).

Exceção: coluna de arquivo exportado (CSV, planilha) é domínio, não posição na tela. `column: FileColumnsData` pode, como no [desenho.md](desenho.md).

## Tipagem explícita, sem indexação em tipos agregados

**Proibido** tipar props, parâmetros de use case (`IRequest`), assinaturas de método ou variáveis locais com **acesso indexado** a tipos agregados — ex.: `FormChange['type']`, `FormOutput['change']['name']`, `Actions['save']`, `ActionsOutput['actions']`, `HookOutput['state']`, `State['filters']`, `CreateExportLayout.Request['type']`, `UpdateDocumentTemplateRequest['updateData']`.

Esses acessos acoplam a assinatura ao **caminho interno** de um namespace/DTO/interface e dificultam leitura. Declarar sempre a **assinatura explícita** do callback ou o **tipo de valor** importado na origem (`ExportLayoutType`, `ExportLayoutFormat`, `LayoutActions`, `string`, …) — **não** reutilizar via `TipoAgregado['chave']` nem via `TipoAgregado['objeto']['chave']`.

Quando um pedaço de um `*Output` de hook for usado em props de filho, **exportar um tipo nomeado na origem** (ex.: `LayoutActions` em `useActions.ts`) e importar no consumidor — **nunca** `ActionsOutput['actions']`, `ControllerOutput['modals']`, etc.

**Evitar:**

```typescript
type TypeProps = {
  change: FormChange['type']
}

type NameProps = {
  change: FormOutput['change']['name']
}

type MenuProps = {
  actions: ActionsOutput['actions']
}
```

**Preferir:**

```typescript
type TypeProps = {
  change: (value: ExportLayoutType) => void
}

type NameProps = {
  change: (value: string) => void
}

type MenuProps = {
  actions: LayoutActions
}
```

Quando o tipo agregado (`FormChange`, `FormOutput`, `CreateExportLayout.Request`, etc.) já define a assinatura, **copiar a assinatura explícita** no campo — **não** reutilizar via `TipoAgregado['chave']` nem via `TipoAgregado['objeto']['chave']`. No **hr-tech-backend**, o DTO em namespace (`CreateExportLayout.Request`) é contrato HTTP — o `IRequest` do use case **estende** esse contrato com campos de contexto (`tenantId`, `userId`, …) e **repete os tipos na origem**, importados de `@prisma/client` ou do módulo — ver **Use cases: `IRequest` com tipagem explícita**.

## Conjunto fechado é enum

Lista fechada de texto não vira união de string. Vira `enum`. Chave em `UPPER_SNAKE_CASE`. Valor é o texto que a API já usa.

**Evitar:**

```typescript
type Bubble = 'show' | 'hide'
```

**Preferir:**

```typescript
export enum Bubble {
  SHOW = 'show',
  HIDE = 'hide',
}
```

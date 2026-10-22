> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Arquitetura — hooks do front-end HR Tech

## Regras rápidas

- Hook pela feature, nunca `useController`.
- `useTranslations` local, um por componente.
- Sem `useEffect` olhando valor. Pedido nasce de clique, `change` ou abertura da tela.
- `actions` com corpo inline na propriedade.
- Regra pura (filtrar, converter, montar texto) não mora em hook: é peça de papel ([desenho.md](desenho.md)). O hook só chama.
- Peça de papel e instância sem dado do hook (`MinimumLatency`): `const` no topo do arquivo, depois dos tipos.
- Fix ou feature em hook que já existe: a peça entra em `const` no topo do arquivo, e das linhas velhas do hook só muda a que passa a chamar ela (**Fix ou feature em código que já funciona**, [desenho.md](desenho.md)). Ação nova soma uma linha no `Output` e uma no `actions`.

## Sem função solta

**Proibido** função solta no arquivo: `export const createAlgo = () =>`, helper no topo, `function foo`.

| Onde | O que usar |
| --- | --- |
| Front, regra pura com papel | classe de papel com protocolo e spec ([desenho.md](desenho.md)) |
| Front, estado, React ou request | hook (`useAccountingGroups`) |
| Back | classe |

Exceções: só as da lista do SKILL.md, grupo **Escrita**.

Callback de `map`, `filter` ou `reduce` **não** é função solta. Ele nasce **dentro** do método do hook ou da classe e é passado para a lista.

**Evitar:**

```typescript
export const createAccountingGroups = async (input: Input) => {}
export const toAccountingCard = async (id: string) => {}
```

**Preferir:**

```typescript
export const useAccountingGroups = () => {
  const create = async (input: Input) => {}
  const card = async (id: string) => {}

  return { create, card }
}
```

## Peça de papel dentro de hook

Hook não tem propriedade. A peça, e qualquer instância sem dado do hook (`MinimumLatency`), nasce uma vez no topo do arquivo, depois dos tipos, com o nome do papel ([desenho.md](desenho.md), **Quem usa a peça**). Nunca `new` dela dentro do hook.

```typescript
const filter = new AttachmentFieldFilter()

export const useFields = ({ fields, systemFieldId, value }: FieldsInput): FieldsOutput => {
  const input = { fields, systemFieldId, value }
  const filtered = filter.filter(input)

  return { filtered }
}
```

## Hooks de view (`views/<Area>/.../hooks/`)

Regras para hooks de tela no **hr-tech-frontend**. Teste de hook fica em `hooks/__tests__/`, com `describe('[Hook] useX')` e casos `WHEN ... - SHOULD ...`. Peça de papel tem spec ao lado dela, não em `__tests__/`.

### Nome do hook controlador: pela feature, nunca `useController`

O hook que **orquestra** uma feature, modal, tela ou fluxo é nomeado **pela feature/domínio** — `useNewLayout`, `useEdition`, `useListing`, `useDictionaryContext` — **nunca** com o nome genérico **`useController`**.

- O nome comunica **o que** o hook controla; `useController` não diz nada e colide entre modais/telas diferentes.
- Vale para o hook controlador de **modais** (ex.: modal `NewLayout` → `useNewLayout`), de **telas** e de **fluxos** — o arquivo acompanha o nome (`useNewLayout.ts`).

**Evitar:**

```tsx
export const NewLayout = ({ close }: ISimplePortalChildControl) => {
  const { actions } = useController({ close })
}
```

**Preferir** — hook nomeado pela feature da modal:

```tsx
export const NewLayout = ({ close }: ISimplePortalChildControl) => {
  const { actions } = useNewLayout({ close })
}
```

### Colocação: contexto de uso

Hooks ficam **no mesmo contexto do componente que os consome**. A pasta `hooks/` **global do módulo** (`views/<Area>/.../hooks/`) guarda **somente hooks reutilizados** por mais de um componente filho.

| Situação | Onde colocar |
|----------|--------------|
| Hook usado por **um único** componente | `components/<Componente>/hooks/` (ou `contexts/<Contexto>/hooks/` quando o consumidor for o provider) |
| **`useTranslations` do componente** | **Sempre** `components/<Componente>/hooks/useTranslations.ts` — **nunca** na pasta `hooks/` global do modal/módulo só porque vários filhos precisam de i18n |
| Hook usado por **dois ou mais** componentes do módulo | `hooks/` global do módulo + barrel `hooks/index.ts` — **exceto** `useTranslations` (ver **`useTranslations`**) |
| Hook usado só pela view raiz do módulo | `hooks/use<Nome>.ts` **fora** do barrel global (import direto pela view) |

**Evitar** — hook de consumo único na pasta global do módulo:

```text
Edition/hooks/useLabels.ts          ← usado só por Mapping/Status
Edition/hooks/useEditionContent.ts  ← usado só por Edition.tsx
```

**Preferir** — colado ao consumidor:

```text
Edition/components/Mapping/components/Status/hooks/statusLabel/   ← com types.ts
Edition/hooks/useEditionContent.ts                                ← sem types.ts, arquivo solto
Edition/contexts/hooks/useEditionContext.ts
Heading/hooks/useStatus.ts
```

### Estrutura interna de `hooks/`

1. **A partir de 3 tipos** exportados pelo hook → extrair para `types.ts` com **`export namespace`** sufixo **`Type`** (ex.: `BulletType`) na **subpasta do hook** — ver **Tipos em `types.ts`: usar `namespace`** e **Um `namespace` por componente ou hook (nunca centralizar na raiz)**.
2. **Somente quando existir `types.ts`** → criar subpasta com o nome do hook **sem** prefixo `use` (ex.: `useFieldSourceLabels` → pasta `fieldSourceLabels/`).
3. Dentro da subpasta: `use<Nome>.ts`, `types.ts` e `index.ts`.
4. **Sem `types.ts`** → hook fica **solto** em `hooks/use<Nome>.ts` (tipos inline no mesmo arquivo, se couber); **não** criar subpasta.
5. **Proibido** `types.ts` solto na raiz de `hooks/` ao lado de `use<Nome>.ts` — se o hook tem `types.ts`, ele **sempre** fica dentro da subpasta nomeada (ex.: `hooks/bullet/types.ts`, não `hooks/types.ts`).

**Evitar** — `types.ts` solto na raiz de `hooks/`:

```text
Bullet/hooks/
  types.ts
  useBullet.ts
  index.ts
```

**Preferir** — subpasta do hook com `types.ts` dentro:

```text
Bullet/hooks/
  bullet/
    types.ts              ← export namespace BulletType
    useBullet.ts
    index.ts
  index.ts
```

Em `bullet/types.ts`:

```typescript
export namespace BulletType {
  export type Actions = { select: () => void }
  export type Input = { label: string; order: number; key: string }
  export type Output = { actions: Actions }
}
```

**Exemplo** — hook com 3 tipos (`Getters`, `Actions`, `StatusLabelOutput`):

```text
Status/hooks/
  statusLabel/
    types.ts
    useStatusLabel.ts
    index.ts
  index.ts
```

Em `layoutConfigModal/useLayoutConfigModal.tsx`:

```typescript
import { useTranslations } from './useTranslations'
import { LayoutConfigModalType } from './types'

export const useLayoutConfigModal = (): LayoutConfigModalType.Output => { ... }
```

Em `layoutConfigModal/index.ts`:

```typescript
export { useLayoutConfigModal } from './useLayoutConfigModal'
export type { LayoutConfigModalType } from './types'
```

**Exemplo** — hook com 2 tipos, sem `types.ts` (arquivo solto):

```text
Heading/hooks/
  useStatus.ts       ← StatusInput e StatusOutput exportados aqui
  fieldSourceLabels/        ← subpasta só porque tem types.ts
    types.ts
    useFieldSourceLabels.ts
    index.ts
  index.ts
```

- Barrel do componente (`hooks/index.ts`) reexporta hooks soltos e subpastas com `types.ts`.
- **Não** repetir o prefixo `use` no nome da pasta (`fieldSourceLabels/`, não `useFieldSourceLabels/`).

### Ordem dos hooks no componente

Em componentes de view, declarar os hooks na seguinte ordem:

1. **Hooks utilitários / de apresentação** — tradução, labels, tema, contexto genérico (`useTranslations`, `useLabels`, etc.).
2. **Hooks de domínio / orquestradores** — compõem estado, dados e comportamento da tela (`useListing`, `useFilters`, etc.).

Separar os dois grupos com uma linha em branco. Hooks utilitários vêm **antes** dos hooks que dependem deles ou agregam a lógica da view.

**Evitar:**

```typescript
const { layouts, tabs, status } = useListing()
const translations = useTranslations()
const labels = useLabels()
```

**Preferir:**

```typescript
const translations = useTranslations()
const labels = useLabels()

const { layouts, tabs, status } = useListing()
```

### Sem `useEffect` para observar valor

**Evitar `useEffect` ao máximo.** O trabalho nasce de **evento**: `click`, `change`, ou a abertura da tela.

A abertura da tela é o `componentDidMount`: um `useEffect` com a lista de dependências **vazia** (`[]`). Roda uma vez, quando a tela abre. Só isso.

**Proibido** um `useEffect` que olha um valor (`stateValue`, id, filtro, uf) e dispara requisição. Cada mudança do valor pede de novo e gasta memória à toa.

| Disparo | Onde |
| --- | --- |
| Pessoa clicou | `onClick` / `actions` |
| Pessoa mudou um campo | `change` |
| Tela acabou de abrir | `useEffect(() => { ... }, [])` |

**Evitar** — efeito olhando valor, ainda mais com requisição:

```typescript
useEffect(() => {
  if (!stateValue) { return }

  localities.getCities(stateValue)
}, [stateValue])
```

**Preferir** — pedido no `change`. Se a tela abre já com estado preenchido, o pedido entra no `useEffect` de deps vazio (uma vez), não numa lista de dependências.

**Evitar:**

```typescript
useEffect(() => {
  if (!selectedAddressStateUf) { return }
  fetchMunicipalities()
}, [selectedAddressStateUf])
```

**Preferir:**

```typescript
const change = async (id: string, value: string) => {
  answers.save(id, value)

  const state = id === STATE_FIELD_ID

  if (!state) { return }

  await localities.cities(value)
}
```

Não pedir a lista se os campos da tela **não** têm estado nem cidade. Sem esse campo, não há o que preencher.

### `useTranslations`

**Regra principal (front-end HR Tech):** cada componente ou hook de view que consome i18n tem **seu próprio** `hooks/useTranslations.ts` na pasta do **próprio** componente/hook — com **apenas** as chaves que **ele** usa. **Proibido** manter um hook centralizado gigante no modal/módulo com todas as traduções da feature para os filhos importarem.

| Situação | O que fazer |
|----------|-------------|
| Componente **não** usa tradução | **Não** criar `useTranslations` |
| Componente usa tradução (mesmo 1 chave) | `components/<Componente>/hooks/useTranslations.ts` + export no `hooks/index.ts` |
| Hook interno (`useTabs`, `useDates`, …) usa i18n | `hooks/useTranslations.ts` **na pasta desse hook** (ex.: `hooks/dates/useTranslations.ts`) |
| View/modal raiz usa só `title`/`description` | Hook em `hooks/useTranslations.ts` **só** com essas chaves — **não** acumular traduções dos filhos |
| Mesma chave em dois componentes (`selectAll`, `types`, …) | **Duplicar** a chave nos dois hooks locais — a fonte única continua sendo o JSON de locale |

Hooks dedicados a tradução (`useTranslations.ts`) **não** extraem namespace nem chaves i18n para constantes no topo do arquivo — exceção à regra global de strings literais.

- Namespace e chaves ficam **inline** na chamada a `translate(...)` e `translation(...)`.
- Tipar a saída com `TranslationsOutput` (ou equivalente) e exportar pelo barrel `hooks/index.ts` **do componente**.
- Importar de `./hooks` (local) — **não** de `../../hooks` do modal/módulo quando o consumidor é um filho.
- **Não criar teste unitário** — é mapeamento de i18n sem lógica de negócio.
- **Sem lógica no hook:** retornar **apenas strings estáticas** mapeadas de chave i18n. **Proibido** incluir funções wrapper, `translation(key, { … })`, formatação ou qualquer derivação. Texto dinâmico monta no hook consumidor com template literal + strings de `useTranslations`.

**Evitar** — hook centralizado com traduções de toda a modal para os filhos importarem:

```text
FieldSelection/hooks/useTranslations.ts   ← 180+ linhas: tabs, footer, fixedFields, dynamicDates…
Footer/Footer.tsx                         ← import { useTranslations } from '../../hooks'
Form/Form.tsx                             ← import { useTranslations } from '../../../../../../../hooks'
```

Anti-padrão em `FieldSelection/hooks/useTranslations.ts`:

```typescript
export interface TranslationsOutput {
  title: string
  tabs: { directory: string; payrollEvents: string; fixedFields: string }
  footer: { summary: string; fixed: string }
  fixedFields: { labels: { name: string }; types: { text: string } }
  dynamicDates: { fields: { start: string } }
}
```

**Preferir** — um hook por consumidor, só com o que ele usa:

```text
FieldSelection/hooks/useTranslations.ts              ← title, description (só o modal raiz)
FieldSelection/components/Footer/hooks/useTranslations.ts
FieldSelection/components/Tabs/PayrollEvents/hooks/useTranslations.ts
FieldSelection/components/Tabs/FixedFields/components/Field/components/Form/hooks/useTranslations.ts
FieldSelection/hooks/dates/useTranslations.ts          ← campos de dynamic dates (só useDates)
FieldSelection/hooks/tabs/useTranslations.ts           ← títulos de aba (só useTabs)
```

Em `Footer/hooks/useTranslations.ts`:

```typescript
export interface TranslationsOutput {
  summary: string
  fixed: string
  buttons: { cancel: string; confirm: string }
}

export const useTranslations = (): TranslationsOutput => {
  const translation = translate('exportLayouts')

  const summary = translation('fieldSelectionModal.footer.summary')
  const fixed = translation('fieldSelectionModal.footer.fixed')

  const buttons = {
    cancel: translation('fieldSelectionModal.buttons.cancel'),
    confirm: translation('fieldSelectionModal.buttons.confirm'),
  }

  return { summary, fixed, buttons }
}
```

Em `Footer/Footer.tsx`. Use `translations.summary`, não `translations.footer.summary`.

```typescript
import { useTranslations } from './hooks'

export const Footer = ({ close }: ISimplePortalChildControl) => {
  const translations = useTranslations()
}
```

- Ao refatorar um hook centralizado existente: **componente por componente** — criar hook local, atualizar import, enxugar o central até restar só o que a view raiz consome; **não** deixar chaves órfãs no central.
- Chaves compartilhadas entre tabs/irmãos **não** justificam hook compartilhado — duplicar nos hooks locais. Só extrair hook compartilhado se o **mesmo bloco inteiro** de traduções for consumido **identicamente** por vários componentes (caso raro).

**Evitar:**

```typescript
export const useTranslations = (): TranslationsOutput => {
  const translation = translate('exportLayouts')

  const pendingOne = (count: number) => (
    translation('dictionary.edition.field.status.pendingOne', { count })
  )

  return {
    field: {
      status: {
        pendingOne,
      },
    },
  }
}
```

**Preferir** — só strings estáticas em `useTranslations`:

```typescript
export const useTranslations = (): TranslationsOutput => {
  const translation = translate('exportLayouts')

  const mapping = {
    status: {
      ok: translation('dictionary.edition.mapping.status.ok'),
      pending: translation('dictionary.edition.mapping.status.pending'),
    },
  }

  return { mapping }
}
```

**Preferir** — montar texto dinâmico no hook consumidor com strings estáticas de `useTranslations`:

```typescript
const translations = useTranslations()

const single = size === UNIQUE_FIELD
const noun = single ? translations.list.field : translations.list.fields
const label = `${size} ${noun}`
```

**Evitar** — interpolação i18n com segundo argumento quando o padrão do módulo é composição no hook:

```typescript
const label = translation(PENDING_ONE_STATUS_KEY, { count: pending })
```

### `useLabels`

Hooks que montam labels ou accessors a partir de `useTranslations()` **não** usam `useMemo` — a saída de `useTranslations` é **imutável** entre re-renders; memoizar com `[translations]` não traz benefício, só ruído.

**Evitar:**

```typescript
export const useLabels = (): LabelsOutput => {
  const translations = useTranslations()

  return useMemo(() => {
    const mappingStatus = (value: SystemDictionaryMappingStatus) =>
      labels.mappingStatus[value]

    return { mappingStatus }
  }, [translations])
}
```

**Evitar** — nomes que repetem o contexto do hook:

```typescript
const mappingStatusLabels: Record<SystemDictionaryMappingStatus, string> = { ... }

export type LabelsActions = { get: LabelsGet }
export type LabelsGet = { label: (value: SystemDictionaryMappingStatus) => string }
```

**Preferir:**

```typescript
interface Getters {
  label: (value: SystemDictionaryMappingStatus) => string
}

interface Actions {
  get: Getters
}

export interface LabelsOutput {
  actions: Actions
}

export const useLabels = (): LabelsOutput => {
  const translations = useTranslations()

  const labels = new Map<SystemDictionaryMappingStatus, string>([
    [SystemDictionaryMappingStatus.OK, translations.mapping.status.ok],
    [SystemDictionaryMappingStatus.PENDING, translations.mapping.status.pending],
  ])

  const actions = {
    get: {
      label: (value: SystemDictionaryMappingStatus) => labels.get(value) ?? EMPTY_STRING,
    },
  }

  return { actions }
}
```

- **Não empilhar contexto no nome** quando o escopo já deixa claro — variáveis: `labels` + `label`, não `mappingStatusLabels`; tipos auxiliares no arquivo do hook: **`Actions`**, **`Getters`**, não `LabelsActions` / `LabelsGetters` — o arquivo `useLabels.ts` **já é** o contexto.
- **Saída do hook** mantém prefixo do domínio (`LabelsOutput`, `EditionOutput`); tipos internos de composição (`Actions`, `Getters`) ficam genéricos.
- Expor accessors via **`actions.get`** — leitura de label fica `actions.get.label(value)`, não função solta no retorno do hook.
- Vale para qualquer hook de labels que **só** derive de `translations`, sem estado externo, request ou efeito.
- O `Map` fica no hook porque o valor vem da tradução, que só existe ali. Tabela fixa de enum continua classe que estende `Map` em `mappers/`.
- **`useMemo` continua válido** quando a dependência muda de fato (filtros, seleção, props dinâmicas, composição com dados de API).

### Context `Provider`

Providers de React Context **não** usam `useMemo` para montar o `value` — passar o retorno do hook orquestrador direto no `Provider`. A lógica e a estabilidade necessária ficam no hook (`useXContext`); memoizar o value no Provider só adiciona ruído.

**Evitar:**

```typescript
const wizard = useWizardContext({ close })

const value = useMemo(
  () => ({ ...wizard }),
  [wizard],
)

return (
  <WizardContext.Provider value={value}>
    {children}
  </WizardContext.Provider>
)
```

**Preferir:**

```typescript
const wizard = useWizardContext({ close })

return (
  <WizardContext.Provider value={wizard}>
    {children}
  </WizardContext.Provider>
)
```

### Não criar hook sem lógica

**Não** extrair hook local (`useHeading`, `useX`) quando ele **só repassa** props, contexto ou `actions` sem transformação, estado, efeito colateral ou composição de domínio.

Sinais de hook desnecessário:

- Retorna o mesmo `name`/`label` recebido na entrada, sem derivar nada.
- Encapsula `actions.toggle` (ou equivalente) em método local que **só** chama `actions?.toggle()` — delegação pura.
- Existe apenas para “organizar” o componente, sem lógica testável ou reutilizável.

Nesses casos, o componente consome **direto** o que o pai/contexto injeta (ex.: `SimpleAccordionGroup.Header` clona `actions` no filho).

**Evitar:**

```typescript
export const useHeading = ({ name, actions }: UseHeadingInput): UseHeadingOutput => {
  const toggle = () => {
    actions?.toggle()
  }

  const localActions = {
    toggle,
  }

  return { name, actions: localActions }
}

export const Heading = ({ name, actions }: HeadingInput) => {
  const heading = useHeading({ name, actions })

  return (
    <Toogler type={BUTTON_TYPE} onClick={heading.actions.toggle}>
      {heading.name}
    </Toogler>
  )
}
```

**Preferir:**

```typescript
export const Heading = ({ name, actions }: HeadingInput) => (
  <Toogler type={BUTTON_TYPE} onClick={actions?.toggle}>
    {name}
  </Toogler>
)
```

- Hook local **sim** quando houver estado, derivação, efeito, composição de requests ou regra de negócio.
- Hook orquestrador da **view** continua concentrando `actions` da tela; a regra acima vale para **componentes filho** que recebem props prontas do pai/contexto.
- Delegação pura no JSX: `onClick={actions?.toggle}` — alinhado a **Componentes e stories: `actions` do contexto/hook** e **Nunca usar prefixo `handle` ou `handler` em ações**.

### Callbacks de evento no componente

Função de evento **não** fica escrita direto na tag (`onChange={(option) => …}`).

| Quantos callbacks o componente precisa | Onde fica |
| --- | --- |
| **1** | `const` no próprio componente (`selectChange`) e a tag recebe a referência (`onChange={selectChange}`) |
| **2 ou mais** | hook da feature, com `actions`. O componente só usa `onChange={actions.select}` |

**Um só — evitar** a função na tag:

```tsx
<Select onChange={(option: string) => change(option)} />
```

**Um só — preferir** a `const` no componente. **Não** criar hook só para esse callback.

```tsx
const [template, change] = useState<string>()

const selectChange = (option: string) => {
  change(option)
}

<Select onChange={selectChange} />
```

### Handlers de evento (`onClick`, etc.)

Quando já existe **`actions`** (hook da tela ou contexto), a tag usa `onClick={actions.open}`. **Nunca** arrow inline. **Nunca** prefixo `handle` — ver **Nunca usar prefixo `handle` ou `handler` em ações** e **Componentes e stories: `actions` do contexto/hook**. Com **um** callback e sem hook, vale a `const` da seção **Callbacks de evento no componente**. Com **dois ou mais**, o hook é obrigatório.

Em **componentes filho** que recebem `actions` prontas (ex.: via `SimpleAccordionGroup.Header`), referenciar direto no JSX (`onClick={actions?.toggle}`) — **sem** hook local intermediário; ver **Não criar hook sem lógica**.

**Evitar** — helper no componente:

```typescript
const createOpenHandler = (open: (id: string) => void, id: string) => () => {
  open(id)
}

<Card onClick={createOpenHandler(actions.open, dictionary.id)} />
```

**Evitar** — arrow inline no JSX:

```typescript
<Card onClick={() => actions.open(dictionary.id)} />
```

**Preferir** — action curried no hook; componente só invoca com o id.

Em `useListing.ts`:

```typescript
const actions = {
  open: (id: string) => () => {
    navigate.to.edition(id)
  },
}
```

Em `Listing.tsx`:

```typescript
<Card onClick={actions.open(dictionary.id)} />
```

- Quando a ação depende de um identificador da linha/item, tipar como `(id: string) => () => void` (ou equivalente) e retornar o handler no hook.
- Ações sem parâmetro de item expõem o handler direto: `onClick={actions.close}`.

### `events.on` em hooks locais

Hooks de componente que expõem callbacks de UI via **`events.on.{nome}`** (`change`, `click`, …) definem o handler **inline** dentro de `events.on` — **sem** extrair para `const` nomeada antes e repassar por shorthand.

**Evitar:**

```typescript
const change = (event: ChangeEvent<HTMLInputElement>) => {
  actions.mapping.changeCode(mappingId, event.target.value)
}

const events = {
  on: {
    change,
  },
}
```

**Preferir:**

```typescript
const events = {
  on: {
    change: (event: ChangeEvent<HTMLInputElement>) => {
      actions.mapping.changeCode(mappingId, event.target.value)
    },
  },
}
```

- Estrutura fixa: **`events` → `on` → `{evento}`**.
- Tipos de composição seguem a mesma cadeia (`On` → `Events` com `on: On`) — ver **Ordem de tipos em hooks**.
- Regra vale para **`events.on`**; **`actions`** segue o mesmo espírito (inline na chave) — ver **Actions: definir inline no objeto** ([estilo-actions.md](estilo-actions.md)).

### Testes de hooks

- `useTranslations` e hook sem lógica não ganham teste. Hook que só repassa nem existe: **Não criar hook sem lógica**.
- Teste o hook com lógica de negócio: filtro, estado derivado, transformação, efeito, composição de requests.
- Tabs, filtros e estado da tela se testam no hook orquestrador (ex.: `useListing` testa filtro por status e troca de tab).

## Hooks de request

Um hook por operação, `use<Action>Request`, que orquestra `loader`, `error`, `notification` e tradução, retornando `{ data, loader, error, <verbo> }`. Tipar a saída com um `type <...>Output`.

```typescript
const latency = new MinimumLatency()

export const useCreateManyAdmissionCardsRequest = (): CreateManyAdmissionCardsRequestOutput => {
  const translations = useTranslations()
  const loader = useLoader()
  const error = useRequestError()
  const notification = useNotification()
  const [data, change] = useState<CreateManyAdmissionCards.DTO>()

  const post = async (payload: CreateManyAdmissionCards.Payload) => {
    try {
      error.clear()
      loader.go.start()

      const request = createManyAdmissionCardsRequest(payload)
      const response = await latency.take(request)

      change(response)

      return response
    } catch {
      const message = translations.errors.create

      error.set.message(message)
      notification(message, NotificationType.ERROR)

      return null
    } finally {
      loader.go.end()
    }
  }

  return { data, loader, error, post }
}
```

- Fluxo sempre `try / catch / finally`: limpar erro e iniciar loader no início; setar/notificar erro com mensagem traduzida no `catch`; encerrar loader no `finally`.
- Mensagem de erro vem do `useTranslations` local. Nunca string solta.
- Sempre envolva o request com `MinimumLatency`, guardado em `const` no topo do arquivo.

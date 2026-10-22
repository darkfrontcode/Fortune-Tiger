> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Arquitetura — casos de uso do back-end HR Tech

Antes de escrever, responda o **Portão de desenho** (SKILL.md). Regra pura nova (tira, confere, converte, monta texto) é peça de papel ([desenho.md](desenho.md)). A regra nunca mora num método `private` do arquivo velho nem numa `const` solta no topo: o método novo só monta o `input` e chama a peça.

## Classes `IExecutable`: aliases `Input` e `Output`

Toda classe que implementa **`IExecutable`** (services em `services/`, contexts, commands, factories orquestradoras, use cases que adotam o protocolo) **sempre** declara **`type Input`** e **`type Output`** no **topo do arquivo**, logo após os imports — **nunca** coloca os tipos direto em `implements IExecutable<…>` nem repete tipos longos na assinatura de `execute`. `IExecutable` é de quem orquestra (repositório, outra peça, transação). Peça que só tira, confere, converte ou monta texto usa o protocolo do papel.

**Evitar** — tipos inline no `implements` ou `Promise<…>` repetido:

```typescript
export class FindFailedControlIdSyncLogsUseCase
implements IExecutable<FindFailedControlIdSyncLogsRequest, Promise<ControlIdSyncLogLine[]>> {
  async execute(request: FindFailedControlIdSyncLogsRequest): Promise<ControlIdSyncLogLine[]> { ... }
}
```

```typescript
export class ExportPayrollUseCase implements IExecutable<null, Promise<HttpFileData>> {
  async execute(): Promise<HttpFileData> { ... }
}
```

**Preferir** — aliases `Input` e `Output`; `Output` inclui o wrapper `Promise<…>` quando a operação for assíncrona. Arquivo `services/ReconcileSystemDictionaryMappingsService.ts`:

```typescript
type Input = {
  tenantId: string
  dictionaryFields: Array<SystemDictionaryField>
  systemFieldContext: Map<string, SystemField>
}

type Output = Promise<void>

export class ReconcileSystemDictionaryMappingsService implements IExecutable<Input, Output> {
  async execute(input: Input): Output { ... }
}
```

### Regras

- **`Input`** — parâmetros de `execute`; objeto quando houver mais de um campo — **nunca** reutilizar DTO de operação ou tipo externo só no `implements` sem alias local.
- **`Output`** — retorno de `execute`; para métodos `async`, **`Output = Promise<…>`** (não `Promise<Output>` no `implements` com `Output` desembrulhado).
- Usar **`Input`** / **`Output`** no `implements`, no parâmetro de `execute` e no tipo de retorno — **não** repetir o tipo qualificado ou inline.
- Tipos de composição interna (`FieldOption`, `DictionaryField`, `ExportLine`, …) ficam **entre** `Input`/`Output` e a classe — **não** misturar com o contrato público de `execute`.
- Service com pasta `types.ts`: **`Guards`** fica no namespace do `types.ts` — ver **Classes Guard (`Guards` no `types.ts`)**; no `.ts` do service só `type Guards = …Type.Guards` + `const guards`.
- Sempre `type Input` e `type Output`. O arquivo vizinho não decide.
- Use case **sem** parâmetros: `type Input = void` ou `type Input = null` conforme o protocolo do call site — **ainda assim** declarar alias; **nunca** `implements IExecutable<null, Promise<…>>` inline.
- **`constructor`** com **um único** parâmetro de injeção: **uma linha** — ver **Constructor: uma linha com parâmetro único**.

## Services transacionais (Prisma `$transaction`)

Quando a operação precisa **persistir mais de uma entidade/tabela de forma atômica** (ex.: layout + fields), extrair a escrita para um **service** em `services/` que implementa **`IExecutable`**. O use case monta as entidades de domínio e delega a persistência transacional ao service — **não** chamar repositórios Prisma soltos em sequência no use case.

```
src/modules/<Module>/services/
  <Operation><Entity>PrismaService.ts
  index.ts
```

**Evitar** — repositório `*TransactionRepository` novo em módulos que seguem o padrão atual; `$transaction` com array de promises soltas no use case; Prisma direto no use case; service transacional **sem** sufixo `PrismaService`.

Use case orquestrando a persistência:

```typescript
await this.layoutRepository.create(layout)
await this.fieldRepository.createMany(fields)
```

Interface `ICreateXTransactionRepository` só para encapsular `$transaction`:

```typescript
export interface ICreateExportLayoutTransactionRepository {
  create(layout: ExportLayout, fields: ExportLayoutField[]): Promise<ExportLayout>
}
```

**Preferir** — service `IExecutable`; callback nomeado `operation`; `TransactionClient` dentro do callback; mappers com o nome inteiro. Arquivo `services/CreateExportLayoutPrismaService.ts`:

```typescript
import type { Prisma, PrismaClient } from '@prisma/client'

import type { IExecutable } from '../../../shared/protocols'
import type { ExportLayout } from '../domain/ExportLayout'
import type { ExportLayoutField } from '../domain/ExportLayoutField'
import { ExportLayoutFieldMap } from '../mappers/ExportLayoutFieldMap'
import { ExportLayoutMap } from '../mappers/ExportLayoutMap'

import { EMPTY_NUMBER } from '../../../shared/constants'

type Input = {
  layout: ExportLayout
  fields: Array<ExportLayoutField>
}

type Output = Promise<ExportLayout>

export class CreateExportLayoutPrismaService implements IExecutable<Input, Output> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: Input): Output {
    const { layout, fields } = input

    const operation = async (transaction: Prisma.TransactionClient) => {
      const data = ExportLayoutMap.toCreatePersistence(layout)
      const created = await transaction.exportLayout.create({ data })

      if (fields.length > EMPTY_NUMBER) {
        const records = fields.map(ExportLayoutFieldMap.toCreatePersistence)
        await transaction.exportLayoutField.createMany({ data: records })
      }

      return ExportLayoutMap.toDomain(created)
    }

    return this.prisma.$transaction(operation)
  }
}
```

### Regras

| Aspecto | Padrão |
|---------|--------|
| **Onde vive** | `services/<Operation><Entity>PrismaService.ts` — **não** `repositories/` |
| **Nome** | Classe e arquivo com sufixo **`PrismaService`** — ex.: `AddExportLayoutFieldsPrismaService` — **não** `AddExportLayoutFieldsService` |
| **Contrato** | `IExecutable<Input, Output>` com aliases no topo — ver **Classes `IExecutable`: aliases `Input` e `Output`** |
| **Injeção** | `constructor(private readonly prisma: PrismaClient) {}` — **uma linha** |
| **Callback** | `const operation = async (transaction: Prisma.TransactionClient) => { … }` — **sempre** usar `transaction`, **nunca** `this.prisma` dentro do callback |
| **Mappers** | Nome inteiro, sem alias: `ExportLayoutMap.toCreatePersistence` na escrita, `ExportLayoutMap.toDomain` no retorno |
| **Coleção opcional/vazia** | Guard com `EMPTY_NUMBER` antes de `createMany` — **não** literal `0` |
| **Retorno** | Entidade de domínio (`ExportLayout`) — **não** model Prisma cru |
| **Use case** | Monta entidades (`ExportLayout.create`, fields via guard/factory) e chama `service.execute({ layout, fields })` |

### Quando usar vs repositório com `$transaction`

- **Service transacional (preferido em módulos novos):** operação de **criação/atualização atômica** acionada por **um use case**; input são **entidades de domínio** já montadas; retorno é **domínio**.
- **Repositório `*TransactionsRepository` (legado):** módulos antigos (`workflows`, `importations`, `refuturiza`). Não replique. Fix nesses fluxos: a escrita nova nasce numa peça nova (`*PrismaService`) e o legado só ganha a linha que chama.
- **Repositório simples com `$transaction` interno:** operações **locais a um agregado filho** (ex.: `replaceAll` em `PrismaExportLayoutFieldRepository`) — transação **dentro** do repositório, **sem** service dedicado.

## Use cases: `IRequest` com tipagem explícita

Cada use case declara **`interface IRequest`** (ou `type IRequest`) **no próprio arquivo**, com campos de contexto da operação (`tenantId`, `userId`, …) mais os campos do payload HTTP. Cada campo usa o **tipo na origem** — enum Prisma, `string`, tipo compartilhado do módulo — **nunca** indexação no DTO da operação.

O namespace do DTO (`CreateExportLayout.Request`) descreve o **contrato da API**; o `IRequest` do use case é a **entrada interna** enriquecida com contexto. Repetir os tipos explicitamente no `IRequest` **não** é duplicação indevida — indexar `Operacao.Request['campo']` é anti-padrão.

**Evitar** — indexação no DTO da operação:

```typescript
import type { CreateExportLayout } from '../../dtos/CreateExportLayoutDTO'

interface IRequest {
  tenantId: string
  name: string
  type: CreateExportLayout.Request['type']
  format: CreateExportLayout.Request['format']
  encoding: CreateExportLayout.Request['encoding']
}
```

**Preferir** — tipos importados na origem; `execute` retorna `Operacao.DTO`:

```typescript
import type { ExportLayoutFormat, ExportLayoutType } from '@prisma/client'
import type { CreateExportLayout } from '../../dtos/CreateExportLayoutDTO'

interface IRequest {
  tenantId: string
  name: string
  type: ExportLayoutType
  format: ExportLayoutFormat
  encoding: string
}

export class CreateExportLayoutUseCase {
  async execute(request: IRequest): Promise<CreateExportLayout.DTO> { ... }
}
```

**Mesma regra** vale para parâmetros de método privado, validators e mappers — **nunca** `IRequest['campo']`, `UseCaseRequest['update']` nem `ICreateEmployeeRequest['employees'][0]` quando o tipo de origem já existe e pode ser importado ou declarado explicitamente.

Use case chamado por controller: `IRequest` e parâmetro `request`. Todo o resto (service, peça de papel): `type Input` / `type Output` e parâmetro `input`.

## Use cases: evitar métodos `static`

Em use cases, services com injeção de dependência e classes orquestradoras de fluxo, **preferir métodos `private` de instância** para extrair passos do `execute` — **não** `private static`.

Chamar com `this.metodo(...)` e usar dependências injetadas via `this` — **não** passar dependência como parâmetro só para contornar `static`.

**Evitar:**

```typescript
const availabilityContext = ListAvailableFieldsUseCase.createAvailabilityContext(
  categories,
  this.fieldAvailabilityOrchestrator,
)

private static createAvailabilityContext(
  categories: Category[],
  orchestrator: FieldAvailabilityOrchestrator,
): Map<string, Context> { ... }

private static collectSystemFields(categories: Category[]): SystemField[] { ... }
```

**Preferir:**

```typescript
const availabilityContext = this.createAvailabilityContext(categories)

private createAvailabilityContext(categories: Array<Category>): Map<string, Context> {
  const availability = this.fieldAvailabilityOrchestrator.execute({ ... })
  ...
}

private collectSystemFields(categories: Array<Category>): Array<SystemField> { ... }
```

### Onde `static` é esperado

Só nas duas exceções de **Static: só duas exceções** ([desenho.md](desenho.md)).

## Classes Guard (`Guards` no `types.ts`)

Qual usar: pré-condição do fluxo que lança erro e depende do banco → `*Guard` com `execute`. Regra pura sobre dado pronto → `*Validator` ([desenho.md](desenho.md)), chamado por um `private assert*` de quem usa, que lança a mensagem que a peça devolveu. Checagem curta só deste use case → `private assert*`. Guards stateless em `const guards` é a forma fixa de guard; peça de papel nova vai em `private readonly`.

Classes `*Guard` **sem dependências (stateless)** usam `type Guards` + `const guards`. O **tipo** `Guards` fica no **`types.ts`** do use case ou service (dentro do namespace com sufixo `Type`, junto de `Request`/`Response` ou `IRequest`) — **nunca** declarar o shape de `Guards` inline no arquivo da classe.

No arquivo da implementação (use case ou service): alias local `type Guards = …Type.Guards` + `const guards: Guards = { … }` antes da classe — **nunca** instância avulsa com nome da classe (`layoutFoundGuard`, `layoutAvailableGuard`).

**`types.ts`** — shape de `Guards` no namespace. Arquivo `services/generateExportLayoutFile/types/GenerateExportLayoutFileType.ts`:

```typescript
import type { LayoutRequiredGuard } from '../../../guards'

export namespace GenerateExportLayoutFileType {
  export type Request = { tenantId: string, layoutId: string }
  export type Response = { file: string }

  export type Guards = {
    layout: LayoutRequiredGuard
  }
}
```

**Implementação** — alias + instâncias; **não** repetir o shape. Arquivo `services/generateExportLayoutFile/GenerateExportLayoutFileService.ts`:

```typescript
import { LayoutRequiredGuard } from '../../guards'
import type { GenerateExportLayoutFileType } from './types/GenerateExportLayoutFileType'

type Input = GenerateExportLayoutFileType.Request
type Output = Promise<GenerateExportLayoutFileType.Response>
type Guards = GenerateExportLayoutFileType.Guards

const guards: Guards = {
  layout: new LayoutRequiredGuard(),
}

export class GenerateExportLayoutFileService implements IExecutable<Input, Output> {
  async execute(input: Input): Output {
    const { tenantId, layoutId } = input
    const layout = await this.layoutRepository.read(tenantId, layoutId)

    guards.layout.execute(layout)
  }
}
```

**Evitar** — `type Guards = { … }` inline no use case ou service quando já existe `types.ts`. Shape duplicado fora do `types.ts`:

```typescript
type Guards = {
  layout: LayoutRequiredGuard
}

const guards: Guards = {
  layout: new LayoutRequiredGuard(),
}
```

**Guard com DI no constructor** — `private readonly guard` montado no `constructor` (padrão normal de injeção); **não** usar `type Guards` / `guards` nesse caso.

**Com dependências (DI)** — `private readonly guard` no `constructor`:

```typescript
export class CreateExportLayoutUseCase {
  private readonly guard: ExportLayoutFieldsGuard

  constructor(
    private readonly createExportLayoutService: CreateExportLayoutPrismaService,
    systemFieldRepository: ISystemFieldRepository,
    payrollEventRepository: IPayrollEventRepository,
  ) {
    this.guard = new ExportLayoutFieldsGuard(
      systemFieldRepository,
      payrollEventRepository,
    )
  }

  async execute(request: IRequest): Promise<ListExportLayouts.DTO> {
    await this.guard.execute(request.tenantId, request.fields)
  }
}
```

Peça de papel sem dependência: **Quem usa a peça** ([desenho.md](desenho.md)).

**Regras:**

1. **`Guards` no `types.ts`** — use case **e** service com namespace `*Type`; chaves descrevem o **domínio validado** (`layout`, `availability`) — **nunca** o nome completo da classe.
2. **Implementação** — `type Guards = …Type.Guards` + `const guards`; uso via `guards.<chave>.execute(...)` — **nunca** `const layoutFoundGuard`.
3. Com DI: `this.guard.execute(...)` — **não** aplicar o padrão `Guards`/`guards`.
4. Vários guards stateless → **todas** as chaves no mesmo `export type Guards` do `types.ts` e no mesmo `const guards`.
5. Use case **sem** `types.ts` dedicado (raro): shape inline no topo do arquivo — preferir extrair `types.ts` quando houver `Guards`.
6. Métodos `private assert*` no use case (validação inline) são **outro padrão** — ver **Use cases: guards com prefixo `assert`**.

## Use cases: guards com prefixo `assert`

Métodos `private` de use case que **validam pré-condição e lançam erro** quando a regra não é atendida usam sempre o prefixo **`assert`** — **nunca** `reject`, `ensure`, `validate` nem verbos genéricos.

**Evitar:**

```typescript
this.rejectAlreadyAddedFields(dictionaryFields, systemFieldIds)

private rejectAlreadyAddedFields(
  dictionaryFields: Array<SystemDictionaryField>,
  systemFieldIds: Array<string>,
): void {
  const alreadyAdded = systemFieldIds.some(included)

  if (alreadyAdded) {
    throw new InvalidParamError(SYSTEM_DICTIONARY_FIELD_ALREADY_ADDED)
  }
}
```

**Preferir:**

```typescript
this.assertUniqueDictionaryFields(dictionaryFields, systemFieldIds)

private assertUniqueDictionaryFields(
  dictionaryFields: Array<SystemDictionaryField>,
  systemFieldIds: Array<string>,
): void {
  const toSystemFieldId = (field: SystemDictionaryField) => field.systemFieldId
  const ids = dictionaryFields.map(toSystemFieldId)

  const byIncluded = (systemFieldId: string) => ids.includes(systemFieldId)
  const duplicate = systemFieldIds.some(byIncluded)
  const message = SYSTEM_DICTIONARY_FIELD_ALREADY_ADDED

  if (duplicate) { throw new InvalidParamError(message) }
}
```

**Regras:**

1. Nome descreve a **condição que deve ser verdadeira** (`assertPersonIsActive`, `assertNoOverlapInPeriodChain`, `assertDictionaryMappings`) — o método **interrompe o fluxo** com `throw` quando falha.
2. Separar de passos de **transformação** (`toEligibleFields`, `remapping`) e de **orquestração** (`createDictionaryFields`) — só validação pré-condição usa `assert`.
3. Guard clause inline no `execute` (ex.: `if (!dictionary) { throw ... }`) **não** precisa virar método `assert` — extrair quando a validação tem lógica própria ou é reutilizada.
4. O `assert*` devolve `void`. Em arquivo que já funciona, a chamada entra como linha nova: **Fix ou feature em código que já funciona** ([desenho.md](desenho.md)).

## Repositórios: `tenantId` sempre primeiro

Em interfaces e implementações de repositório (`I<Entity>Repository`, Prisma, in-memory), **`tenantId` é sempre o primeiro parâmetro** quando o método recebe escopo de tenant — **antes** de `id`, `layoutId`, `cardId`, `personId`, filtros, paginação ou listas de ids.

**Evitar** — `tenantId` depois do identificador:

```typescript
export interface IExportLayoutRepository {
  read: (layoutId: string, tenantId: string) => Promise<ExportLayout | null>
  delete: (layoutId: string, tenantId: string) => Promise<void>
}

const layout = await this.repository.read(layoutId, tenantId)
```

**Preferir** — `tenantId` primeiro na interface, implementação e chamada no use case:

```typescript
export interface IExportLayoutRepository {
  read: (tenantId: string, layoutId: string) => Promise<ExportLayout | null>
  delete: (tenantId: string, layoutId: string) => Promise<void>
  list: (tenantId: string, status?: ExportLayoutStatus) => Promise<Array<ExportLayout>>
}

const layout = await this.repository.read(tenantId, layoutId)
```

### Regras

| Situação | Ordem |
|----------|--------|
| Leitura por id | `(tenantId, entityId)` |
| Exclusão por id | `(tenantId, entityId)` |
| Listagem | `(tenantId, …filtros opcionais)` |
| Busca composta | `(tenantId, personId)`, `(tenantId, cardIds)` |
| Método só com entidade | `(entity)` — ex.: `create(layout)`, `update(layout)` — **sem** `tenantId` solto; tenant vem da entidade |

- Aplicar a mesma ordem na **interface**, na **implementação Prisma/in-memory** e em **toda chamada** no use case — **nunca** inverter só na chamada.
- Repositório novo segue esta ordem.

## Repositórios: vários ids numa busca só

Lista de ids **não** vira uma cadeia de `read` dentro de `Promise.all`. Isso abre uma ida ao banco por id. A regra é uma busca só.

`Promise.all` continua valendo quando são **pedidos diferentes** que não dependem um do outro (um layout e uma lista de campos, por exemplo). Não vale para repetir a mesma leitura.

Só fuja disso se for **extremamente necessário** e não der para buscar de uma vez. Fora isso, crie o método no repositório.

**Evitar** — `read` de um id, mapeado, e `Promise.all`:

```typescript
const toRead = (layoutId: string) => this.layouts.read(tenantId, layoutId)
const reads = layoutIds.map(toRead)
const found = await Promise.all(reads)
```

**Preferir** — `readMany` no repositório. `tenantId` primeiro. A mesma assinatura na interface, no Prisma e no in-memory.

```typescript
readMany: (tenantId: string, layoutIds: Array<string>) => Promise<Array<ExportLayout>>
```

```typescript
const layouts = await this.layouts.readMany(tenantId, layoutIds)
```

```typescript
async readMany(tenantId: string, layoutIds: Array<string>): Promise<Array<ExportLayout>> {
  if (layoutIds.length === EMPTY_NUMBER) { return new Array<ExportLayout>() }

  const layouts = await this.prisma.exportLayout.findMany({
    where: {
      tenant_id: tenantId,
      id: { in: layoutIds },
    },
  })

  return ExportLayoutMap.toDomainList(layouts)
}
```

### Regras

- O método novo entra na **interface**, no **Prisma** (`id: { in: ids }`) e no **in-memory**.
- Nome da busca por ids: `readMany`. `tenantId` primeiro, depois a lista.
- Quem chama usa uma linha. Sem `map` de `.read` e sem `Promise.all` em cima disso.

## Parâmetros: `context` sempre primeiro

Em métodos de service, use case, strategy ou método privado, quando a assinatura recebe um parâmetro de **contexto** (`context`, `mappingContext`, `{entidade}Context`, tipos `*Context`) **junto** com outros argumentos, o contexto vem **sempre primeiro** — antes de `fields`, `line`, `exportLine`, `value`, ids ou entidades.

**Evitar** — contexto por último, opcional ou `undefined` na assinatura:

```typescript
private collectMissingFields(
  fields: Array<ExportLayoutField>,
  line: ExportLine,
  context?: MappingContext,
): Array<string> { ... }

private translate(value: string, context?: MappingContext): string { ... }
```

**Preferir** — contexto **obrigatório** e **primeiro**; quando o serviço upstream retornar `undefined`, normalizar no método que **cria** o contexto (ex.: `FALLBACK_CONTEXT` com Maps vazios):

```typescript
private collectMissingFields(
  context: MappingContext,
  fields: Array<ExportLayoutField>,
  line: ExportLine,
): Array<string> { ... }

private translate(
  context: MappingContext,
  value: string,
): string { ... }
```

### Regras

| Situação | Ordem |
|----------|--------|
| Contexto + coleção + item | `(context, fields, line)` |
| Contexto + entidade + dado | `(context, field, exportLine)` |
| Contexto + valor escalar | `(context, value)` |
| Só contexto ou criação de contexto | ordem de domínio (`tenantId`, `layout`, `fields` em `createMappingContext`) — **não** forçar contexto inexistente |

- Nome curto **`context`** quando só há um contexto no método; **`mappingContext`** ou `{entidade}Context` quando houver ambiguidade no arquivo.
- Contexto **obrigatório** na assinatura (`context: MappingContext`) — **nunca** `context?` nem `MappingContext | undefined` nos métodos que **consomem** contexto; normalizar `undefined` no método que **monta** o contexto (`createMappingContext` → fallback com Maps vazios).
- Peça de papel não recebe nada opcional, salvo a exceção de **A peça** ([desenho.md](desenho.md)).
- **`tenantId` primeiro** em repositórios continua valendo — ver **Repositórios: `tenantId` sempre primeiro**; esta regra cobre **contexto de execução** (Map, objeto agregador, pipeline context), não escopo de tenant.

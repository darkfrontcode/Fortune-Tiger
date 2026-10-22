> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Arquitetura — back-end HR Tech

> **Escopo:** vale só no `hr-tech-backend`. Some com o SKILL.md, o desenho.md e os arquivos de estilo do índice. Em outro projeto, ignore.

## Estrutura de um módulo back-end

A estrutura é esta. Não abra módulo do projeto para copiar.

```
src/modules/<Module>/
  controllers/
  data/           # messages.ts, constantes
  domain/         # uma subpasta por agregado
  dtos/
  enums/
  factories/      # ParamsFactory (CreationalProtocol) — criação de entidade
  formatters/     # labels/strings de apresentação — StringBuilder + text factories
  mappers/
  repositories/   # interface + prisma/ + inMemory/
  services/       # IExecutable com aliases Input/Output — ver Classes IExecutable (arquitetura-back-casos.md)
  strategies/     # variantes (StrategyProtocol); o Context é instância
  filters/        # *Filter e a spec ao lado
  validators/     # confere regra e acusa erro (*Validator)
  comparers/      # *Comparer (ComparerProtocol)
  builders/       # *Builder da entidade
  pipelines/      # passos em fila: *Stage com PipelineStageProtocol
  useCases/       # um diretório por operação
  index.ts
```

Protocolos: `src/shared/protocols/`, um arquivo por protocolo, exportado no `index.ts`.

Nunca gaveta: a lista, o papel, o protocolo e o exemplo inteiro estão em [desenho.md](desenho.md). Variantes: **Strategies (regra de decisão)** em arquitetura-front.md.

## Peça com nome de papel

A lista de gavetas, a tabela de papéis, o exemplo inteiro, quem usa, o fix em arquivo velho e a spec estão em [desenho.md](desenho.md). Ele é lido sempre. Não repita aqui.

## Tipos auxiliares: alias simples inline no consumidor

**Não criar arquivo de types** (nem namespace) para alias simples (`Map<string, string>`, `string`, etc.). Colocar **direto** no type/objeto que consome — input do pipeline, props, assinatura de service.

**Evitar** — arquivo ou namespace só pra um alias:

```text
types/
  ExportLayoutFieldMunicipalityContextType.ts  ← anti-padrão
```

```typescript
export namespace ExportLayoutFieldMunicipalityContextType {
  export type Schema = Map<string, string>
}
```

**Preferir** — inline no Schema/input:

```typescript
export namespace ExportLayoutFieldPipelineInputType {
  export type Schema = {
    municipalityContext?: Map<string, string>
    municipalityFieldContext?: Map<string, string>
  }
}
```

Só extrair para `types.ts` / namespace quando o type tiver **estrutura própria** (objeto com vários campos, composição não trivial) ou for **reutilizado** em 3+ arquivos com a mesma forma.

## Tipos de entidade de domínio em `namespace`

Quando a entidade de domínio tiver **3 ou mais tipos** (`Schema`, `FactorySchema`, composições internas, etc.), extrair para uma **subpasta** com o nome da entidade e agrupar os tipos em `export namespace` com sufixo **`Type`** — **nunca** usar só o nome da entidade como namespace quando a classe homônima existir no mesmo módulo.

Use sufixo **`DomainType`** em vez de **`Type`** **somente** quando existir enum (ou type) gerado pelo Prisma com o **mesmo nome** que o namespace teria — ex.: entidade `ExportLayout` + enum Prisma `ExportLayoutType` → namespace `ExportLayoutDomainType`, não `ExportLayoutType`.

```
src/modules/<Module>/domain/<Entity>/
  types.ts              # export namespace <Entity>Type { … } — ou <Entity>DomainType se colidir com Prisma
  <Entity>.ts           # classe da entidade (getters + mutações com verbo de ação)
  index.ts              # barrel da entidade

src/modules/<Module>/builders/
  <Entity>Builder.ts    # API fluente de mutação; build() retorna a instância
  index.ts              # barrel dos builders
```

| Dono | Namespace | Motivo |
|------|-----------|--------|
| Entidade `ExportLayout` | `ExportLayoutDomainType` | Colide com enum Prisma `ExportLayoutType` |
| Entidade `AdmissionCard` | `AdmissionCardType` | Sem colisão com enum Prisma |

**Evitar** — namespace sem sufixo (colide com a classe):

Arquivo `domain/ExportLayout/types.ts`:

```typescript
export namespace ExportLayout {
  export type Schema = { ... }
  export type FactorySchema = { ... }
}
```

**Evitar** — sufixo `Type` quando o Prisma já exporta `<Entity>Type`:

Arquivo `domain/ExportLayout/types.ts`:

```typescript
export namespace ExportLayoutType {
  export type Schema = { type: ExportLayoutType }
}
```

**Preferir** — sufixo `DomainType` só nesse caso de colisão; classe separada:

Arquivo `domain/ExportLayout/types.ts`:

```typescript
import type { ExportLayoutStatus, ExportLayoutType } from '@prisma/client'

export namespace ExportLayoutDomainType {
  export type Schema = {
    tenantId: string
    name: string
    type: ExportLayoutType
    status: ExportLayoutStatus
    createdAt: Date
    updatedAt: Date
  }

  export type FactorySchema = Omit<Schema, 'status' | 'createdAt' | 'updatedAt'> & {
    status?: ExportLayoutStatus
    createdAt?: Date
    updatedAt?: Date
  }
}
```

Arquivo `domain/ExportLayout/ExportLayout.ts`:

```typescript
import { ExportLayoutParamsFactory } from '../../factories'
import type { ExportLayoutDomainType } from './types'

const factory = new ExportLayoutParamsFactory()

export class ExportLayout extends Entity<ExportLayoutDomainType.Schema> {
  rename(value: string): void {
    this.props.name = value
  }

  changeStatus(value: ExportLayoutStatus): void {
    this.props.status = value
  }

  archive(): void {
    this.changeStatus(ExportLayoutStatus.archived)
  }

  static create(schema: ExportLayoutDomainType.FactorySchema, id?: string): ExportLayout {
    const created = factory.create(schema)

    return new ExportLayout(created, id)
  }
}
```

**ParamsFactory** — arquivo `factories/ExportLayoutParamsFactory.ts`:

```typescript
import { ExportLayoutStatus } from '@prisma/client'

import type { CreationalProtocol } from '../../../shared/protocols'
import type { ExportLayoutDomainType } from '../domain/ExportLayout'

type Input = ExportLayoutDomainType.FactorySchema
type Output = ExportLayoutDomainType.Schema

export class ExportLayoutParamsFactory implements CreationalProtocol<Input, Output> {
  create(input: Input): Output {
    const now = new Date()

    const status = input.status ?? ExportLayoutStatus.active
    const createdAt = input.createdAt ?? now
    const updatedAt = input.updatedAt ?? now

    return { ...input, status, createdAt, updatedAt }
  }
}
```

- A `*ParamsFactory` existe para pôr o default da entidade: é a exceção do `??` dentro da peça ([desenho.md](desenho.md), **A peça**). Outra `*Factory` não põe default.
- `type Input` é o `FactorySchema` e `type Output` é o `Schema`, sempre, mesmo com nome curto. O protocolo entra com `import type`.
- O parâmetro é `input: Input`, lido campo a campo (`input.status`), sem desestruturar: o retorno espalha o `input`.
- Um default por `const`, antes do retorno. O retorno fecha em shorthand.
- O default mora só na Factory. O `static create` da entidade só chama a Factory, guardada em `const` no topo do arquivo.

**Evitar** — default escrito dentro do objeto:

```typescript
return {
  ...input,
  status: input.status ?? ExportLayoutStatus.active,
  createdAt: input.createdAt ?? now,
}
```

Arquivo `domain/ExportLayout/index.ts`:

```typescript
export { ExportLayout } from './ExportLayout'
export type { ExportLayoutDomainType } from './types'
```

Arquivo `builders/index.ts`:

```typescript
export { ExportLayoutBuilder } from './ExportLayoutBuilder'
```

- **Referência externa:** `ExportLayoutDomainType.Schema`, `ExportLayoutDomainType.FactorySchema` — **não** reexportar `Schema`/`FactorySchema` soltos no barrel do módulo.
- Os defaults de `createdAt`/`updatedAt` no `create` servem só ao domínio/TypeScript — **não** vão no `toCreatePersistence`/`toUpdatePersistence`; o Prisma preenche no insert/update.
- **Composições internas** (`OptionalFactoryFields` e outros tipos auxiliares) ficam **privadas** dentro do namespace ou do `types.ts` — **não** exportar se só servem ao factory.
- **Menos de 3 tipos** e sem composições relevantes: tipos podem permanecer inline no arquivo da entidade — **não** criar pasta só por estética.
- DTO de operação é `export namespace <Operação> { ... }`, sem sufixo `Type`, porque não há classe homônima. Ver **DTOs em `namespace`** (arquitetura-front.md).
- Sufixo **`Type`** é o padrão (front-end e back-end); **`DomainType`** só quando `<Entity>Type` colidir com enum/type do Prisma — ver **Tipos em `types.ts`: usar `namespace`**.

## Texto compartilhado entre módulos

`BracesFactory` (`src/shared/factories/`) é legado com `static create`. Chame como está: `BracesFactory.create(metadata, BraceKind.ROUND)`. Não crie irmão nesse formato.

Peça de texto nova que serve vários módulos: `src/shared/formatters/<Nome>Formatter.ts`, `implements FormatterProtocol<Input, Output>`, `format` de instância, exportada no `index.ts`. Só o que repete entre módulos vai para `shared/`.

### Formatters de label (`formatters/` do módulo)

Labels de apresentação ficam em `src/modules/<Module>/formatters/`: classe `*Formatter` que implementa `FormatterProtocol<Input, Output>`, com `format` de instância. Quem usa guarda em `private readonly formatter = new XFormatter()`.

**Regras:**

| Aspecto | Padrão |
|---------|--------|
| Composição | **`StringBuilder`** — um `.add(...)` por linha; `.build()` no fim |
| Literais | **`const` no topo** — separadores, sufixos, divisor; **nunca** soltos no corpo |
| Espaço | `EMPTY_SPACE` de `shared/constants`, sem alias; nunca `' '` |
| Separador composto | Montar uma vez no topo — ex.: `DIVISOR = EMPTY_SPACE + SEPARATOR + EMPTY_SPACE` |
| Comparação numérica | Constante nomeada — ex.: `SINGLE = 1` para plural/singular |
| Wrappers | Delegar para text factory — ex.: `BracesFactory.create(metadata, BraceKind.ROUND)` |
| Lookups de enum | Instância do `*Map` em `private readonly` na classe |
| Estágios | Quebrar em **`const` intermediárias** (`counter`, `metadata`, `description`) antes do retorno final |

**Preferir** — montagem em estágios + `StringBuilder` + text factory:

Arquivo `src/modules/exportLayouts/formatters/ExportLayoutSummaryLabelFormatter.ts`:

```typescript
import { StringBuilder } from '../../../shared/builders'
import { EMPTY_SPACE } from '../../../shared/constants'
import { BraceKind, BracesFactory } from '../../../shared/factories'
import type { FormatterProtocol } from '../../../shared/protocols'
import type { ExportLayout } from '../domain/ExportLayout'
import { ExportLayoutEncodingMap, ExportLayoutFormatMap } from '../mappers'

type Input = ExportLayout
type Output = string

const SINGLE = 1
const SINGULAR = 'field'
const PLURAL = 'fields'
const SEPARATOR = '·'
const DIVISOR = EMPTY_SPACE + SEPARATOR + EMPTY_SPACE

export class ExportLayoutSummaryLabelFormatter implements FormatterProtocol<Input, Output> {
  private readonly encodings = new ExportLayoutEncodingMap()

  private readonly formats = new ExportLayoutFormatMap()

  format(input: Input): Output {
    const { name, size, format, encoding } = input

    const single = size === SINGLE
    const suffix = single ? SINGULAR : PLURAL
    const count = String(size)

    const counter = new StringBuilder()
      .add(count)
      .add(EMPTY_SPACE)
      .add(suffix)
      .build()

    const kind = this.formats.get(format)
    const charset = this.encodings.get(encoding)

    const metadata = new StringBuilder()
      .add(counter)
      .add(DIVISOR)
      .add(kind)
      .add(DIVISOR)
      .add(charset)
      .build()

    const description = BracesFactory.create(metadata, BraceKind.ROUND)

    return new StringBuilder()
      .add(name)
      .add(EMPTY_SPACE)
      .add(description)
      .build()
  }
}
```

**Evitar** — template literal ou concatenação inline no corpo:

```typescript
return `${layout.name} (${layout.size} ${suffix} · ${format} · ${encoding})`
```

**Evitar** — parêntesis/chaves literais no formatter quando existir text factory:

```typescript
const description = `(${metadata})`
```

- Formatter implementa `FormatterProtocol`, não `MapperProtocol`: é apresentação, não conversão.
- O método é `format`. Sem outro nome.

Formatter com `static` que já existe no projeto é legado. Chame como está. Não converta e não copie. Passo interno de peça nova é método `private` de instância, chamado com `this.`.

### Formatters com `format` de instância: sempre em propriedade da classe

Quando a classe de formatter expõe **`format` de instância** (`implements FormatterProtocol` — **não** `static format`), quem consome (stage de pipeline, service, use case) **sempre** guarda **uma instância** em **`private readonly`** na classe — **nunca** `new Formatter()` dentro de `process`, `execute` ou método público.

**Preferir** — propriedade na classe, import com o nome inteiro, uso via `this.formatter`:

```typescript
import { dominioSalaryLayoutFieldNames } from '../../../data'
import { ExportLayoutFieldAdmissionCurrencyFormatter } from '../../../formatters/ExportLayoutFieldAdmissionCurrencyFormatter'

export class DominioSalaryStage implements PipelineStageProtocol<Context> {
  private readonly formatter = new ExportLayoutFieldAdmissionCurrencyFormatter()

  async process(context: Context): Promise<Context> {
    const admission = context.layoutType === ExportLayoutType.admission
    if (!admission) { return context }

    const salaryField = dominioSalaryLayoutFieldNames.names.has(context.field.name)
    if (!salaryField) { return context }

    const source = context.getValue()
    if (source.length === EMPTY_NUMBER) { return context }

    const value = this.formatter.format(source)

    context.addValue(value)

    return context
  }
}
```

`process` é o método do `PipelineStageProtocol`: é a exceção do verbo genérico ([desenho.md](desenho.md), **Verbo genérico**).

**Evitar** — instanciar a cada chamada:

```typescript
async process(context: Context): Promise<Context> {
  const formatter = new ExportLayoutFieldAdmissionCurrencyFormatter()
  const value = formatter.format(source)
}
```

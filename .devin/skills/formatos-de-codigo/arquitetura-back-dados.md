> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Arquitetura — dados do back-end HR Tech

## Validators Zod (use cases)

Validação de payload HTTP (body, query, params) no back-end usa **Zod** com classe que estende **`ZodValidator`** de `src/shared/validators`. Um arquivo por operação, colocado na pasta do use case:

```
src/modules/<Module>/useCases/<operation>/
  <Operation>Validator.ts    # schema + classe ZodValidator
  <Operation>UseCase.ts
  index.ts                   # export { …Validator, …Schema } …
```

Controller decorado com `@ControllerValidation(<Operation>Validator)`.

### Estrutura do arquivo

1. **Imports:** enums Prisma quando aplicável, `z` de `zod`, `ZodValidator`, mensagens de `../../data/messages`, maps de conversão de `../../mappers/` quando o payload usa valor traduzido (ex.: encoding `'utf-8'` → enum Prisma).
2. **Constantes no topo** (após imports): separador de listas, instância única do map, listas `ALLOWED_*` montadas com `Object.values(...).join(...)` ou `.map(...).join(...)`, predicados nomeados para `refine`, callback do `transform`, mensagem do `refine` (`INVALID_ENCODING_MESSAGE`), objetos `{ errorMap: () => ({ message: … }) }` para `nativeEnum`, **schemas Zod reutilizáveis** (item de array, string base, etc.) com encadeamento quebrado — ver **Não agrupar condições do Zod**. Arquivo de schema Zod é exceção de 'sem função solta': predicado e callback ficam em `const` no topo, porque o schema é `const` de módulo.
3. **`const schema = z.object({ … })`** — encadeamentos quebrados em várias linhas (ver **Encadeamento estilo builder**).
4. **`export type <Operation>Schema = z.infer<typeof schema>`**, logo depois do `schema` — nome alinhado à operação (`CreateExportLayoutSchema`, `ListExportLayoutsSchema`). É a exceção de **Tipos antes de constantes** (estilo-tipos.md).
5. **Classe** `extends ZodValidator<unknown, <Operation>Schema>` com `override readonly schema = schema`.

**Evitar** — mensagem inline, `type Output` genérico, predicado anônimo no `refine`, `errorMap` inline no `nativeEnum`:

```typescript
const schema = z.object({
  type: z.nativeEnum(ExportLayoutType, {
    errorMap: () => ({ message: `Invalid type. Allowed: ${ALLOWED_TYPES}` }),
  }),
  encoding: z
    .string()
    .refine((value) => ENCODING_VALUES.includes(value), 'Invalid encoding')
    .transform((value) => mapper.from(value)),
})

type Output = z.infer<typeof schema>

export class CreateExportLayoutValidator extends ZodValidator<unknown, Output> {
  override readonly schema = schema
}
```

**Preferir** — mensagens em `data/messages.ts`, listas e options extraídas, predicado, mensagem do `refine` e callback do `transform` em `const` no topo. Arquivo `useCases/createExportLayout/CreateExportLayoutValidator.ts`:

```typescript
import {
  ExportLayoutEncoding,
  ExportLayoutFormat,
  ExportLayoutType,
} from '@prisma/client'
import { z } from 'zod'

import { ZodValidator } from '../../../../shared/validators'
import {
  EXPORT_LAYOUT_NAME_REQUIRED,
  INVALID_EXPORT_LAYOUT_ENCODING,
  INVALID_EXPORT_LAYOUT_FORMAT,
  INVALID_EXPORT_LAYOUT_TYPE,
} from '../../data/messages'
import { ExportLayoutEncodingMap } from '../../mappers/ExportLayoutEncodingMap'

const VALUE_SEPARATOR = ', '

const encodings = new ExportLayoutEncodingMap()

const ALLOWED_TYPES = Object
  .values(ExportLayoutType)
  .join(VALUE_SEPARATOR)

const ALLOWED_FORMATS = Object
  .values(ExportLayoutFormat)
  .join(VALUE_SEPARATOR)

const toValue = (encoding: ExportLayoutEncoding) => encodings.get(encoding)
const toEncoding = (value: string) => encodings.find(value)

const ENCODING_VALUES = Object
  .values(ExportLayoutEncoding)
  .map(toValue)

const ALLOWED_ENCODINGS = ENCODING_VALUES.join(VALUE_SEPARATOR)

const INVALID_ENCODING_MESSAGE = INVALID_EXPORT_LAYOUT_ENCODING(ALLOWED_ENCODINGS)

const allowed = (value: string) => ENCODING_VALUES.includes(value)

const TYPE_OPTIONS = {
  errorMap: () => ({ message: INVALID_EXPORT_LAYOUT_TYPE(ALLOWED_TYPES) }),
}

const FORMAT_OPTIONS = {
  errorMap: () => ({ message: INVALID_EXPORT_LAYOUT_FORMAT(ALLOWED_FORMATS) }),
}

const schema = z.object({
  name: z
    .string()
    .min(1, EXPORT_LAYOUT_NAME_REQUIRED),
  type: z
    .nativeEnum(ExportLayoutType, TYPE_OPTIONS),
  format: z
    .nativeEnum(ExportLayoutFormat, FORMAT_OPTIONS),
  encoding: z
    .string()
    .refine(allowed, INVALID_ENCODING_MESSAGE)
    .transform(toEncoding),
})

export type CreateExportLayoutSchema = z.infer<typeof schema>

export class CreateExportLayoutValidator extends ZodValidator<unknown, CreateExportLayoutSchema> {
  override readonly schema = schema
}
```

### Regras por tipo de campo

| Caso | Padrão |
|------|--------|
| **Enum Prisma direto** | `z.nativeEnum(EnumPrisma, OPTIONS)` — `OPTIONS.errorMap` usa função de `data/messages.ts` com lista `ALLOWED_*` |
| **String obrigatória** | `const` no topo ou campo do `z.object` — encadeamento quebrado: `z.string().min(1, MENSAGEM_ESTATICA)` — mensagem estática de `data/messages.ts` |
| **Array de strings** | schema do **item** em `const` no topo; no `z.object`, compor com `z.array(constDoItem)` — **nunca** `.array(z.string()…)` inline (ver **Não agrupar condições do Zod**) |
| **Enum traduzido (map)** | `z.string().refine(allowed, INVALID_ENCODING_MESSAGE).transform(toEncoding)` — predicado, mensagem e callback em `const` no topo; os valores permitidos vêm de `encodings.get(enum)` para cada entrada do enum |
| **Campo opcional** | `.optional()` no final do encadeamento — ex.: `z.nativeEnum(Status, OPTIONS).optional()` |
| **Default** | `.default(CONSTANTE)` — constante nomeada no topo; ex.: paginação com `ListSort` |
| **Paginação** | `positiveIntegerParam(PAGE, DEFAULT_PAGE)` e `positiveIntegerParam(LIMIT, DEFAULT_LIMIT)` de `shared/validators`, com o nome do parâmetro em `const` no topo (`const PAGE = 'page'`) |

### Não agrupar condições do Zod

Cada tipo base (`z.string()`, `z.number()`, etc.) com suas validações fica em **`const` no topo** do arquivo. No `z.object`, **compor** com wrappers (`z.array`, `.optional`, `.nullable`) — **nunca** aninhar o schema completo dentro do wrapper.

**Errado** — condições agrupadas inline no `.array(...)`:

```typescript
const schema = z.object({
  systemFieldIds: z
    .array(z.string().min(1, SYSTEM_FIELD_ID_REQUIRED))
    .min(1, SYSTEM_FIELD_IDS_REQUIRED),
})
```

**Certo** — item extraído com encadeamento quebrado; array composto no campo:

```typescript
const systemFieldIdsSchema = z
  .string()
  .min(1, SYSTEM_FIELD_ID_REQUIRED)

const schema = z.object({
  systemFieldIds: z
    .array(systemFieldIdsSchema)
    .min(1, SYSTEM_FIELD_IDS_REQUIRED),
})
```

Mesma regra para qualquer composição: `optional`, `nullable`, `record`, etc. — extrair o schema interno antes de envolver.

### Mensagens de validação

- **Estáticas** (`campo obrigatório`): `export const EXPORT_LAYOUT_NAME_REQUIRED = '…'` em `data/messages.ts` — passar direto em `.min(1, …)`.
- **Dinâmicas** (lista de valores permitidos): arrow em `data/messages.ts` — ex.: `INVALID_EXPORT_LAYOUT_TYPE = (types: string) => (\`Invalid type. Allowed: ${types}\`)` — montar `ALLOWED_*` no validator e passar para a função no `errorMap`. No `.refine`, a mensagem vira `const` no topo antes (`INVALID_ENCODING_MESSAGE`): chamada não entra dentro de outra chamada.
- **Nunca** string literal solta no schema — ver **Strings literais: nunca soltas no código** e **Mensagens de erro em `data/`**.

### `nativeEnum` e listas permitidas

- Montar texto de valores com **`const VALUE_SEPARATOR = ', '`** e **`Object.values(Enum).join(VALUE_SEPARATOR)`** — encadeamento quebrado em várias linhas.
- Extrair **`const TYPE_OPTIONS = { errorMap: () => ({ message: … }) }`** (ou `STATUS_OPTIONS`, `FORMAT_OPTIONS`, …) — **não** objeto inline dentro de `z.nativeEnum(...)`.
- Quando a mensagem dinâmica depende da lista, pode-se também usar **`const INVALID_STATUS_MESSAGE = INVALID_EXPORT_LAYOUT_STATUS(ALLOWED_STATUSES)`** antes do objeto `OPTIONS`.

### Enum traduzido via `Map`

Quando o payload HTTP traz valor de API (ex.: `'utf-8'`) e o domínio/Prisma usa enum (`ExportLayoutEncoding.utf8`):

1. Classe **`extends Map`** dedicada — ver **Maps de conversão (extends `Map`)**.
2. **`const encodings = new ExportLayoutEncodingMap()`** uma vez no topo do validator. O nome é o do conteúdo, não `mapper`: `*Map` não é `*Mapper`.
3. `ENCODING_VALUES` = valores de API via `Object.values(EnumPrisma).map(toValue)`.
4. `refine(allowed, …)` com predicado nomeado.
5. **`transform(toEncoding)`**, com `const toEncoding = (value: string) => encodings.find(value)` no topo. Sem `.bind` dentro do `transform`: chamada não entra dentro de outra chamada.

### Tipagem genérica do `ZodValidator`

- Entrada HTTP bruta (body/query): **`ZodValidator<unknown, <Operation>Schema>`** — o schema aplica transform e produz o tipo inferido.
- Exceção quando o input já é tipado (domínio interno): `ZodValidator<Input, Output>`.
- Regra de domínio sobre dado pronto: `validators/*Validator`, peça de papel ([desenho.md](desenho.md)). Zod fica para o payload HTTP.

### Export e consumo

- **`index.ts` do use case:** exportar validator **e** schema type — `export { CreateExportLayoutValidator, type CreateExportLayoutSchema } from './CreateExportLayoutValidator'`.
- **Controller:** `ValidationResultProtocol.Data<CreateExportLayoutSchema>` no tipo do request; campos validados em `request.data`.

## Mappers de entidade (Prisma ↔ domínio)

Mappers que convertem entre o model Prisma e a entidade de domínio ficam em `src/modules/<Module>/mappers/<Entity>Map.ts`. **Sempre** tipar com assinaturas geradas pelo Prisma — **nunca** `any` em `toDomain`, `toDomainList` nem nos métodos de persistence.

```
src/modules/<Module>/mappers/
  <Entity>Map.ts        # aliases Raw / CreateInput / UpdateInput + classe estática
  index.ts              # barrel: export { <Entity>Map }
```

### Import e aliases de tipos

- Importar **`Prisma`** e o model Prisma com alias que evite colisão com a entidade de domínio: `import type { Prisma, ExportLayout as PrismaExportLayout } from '@prisma/client'`.
- Declarar **três aliases curtos** no topo do arquivo `<Entity>Map.ts`, **acima** da classe — **não** exportar, **não** extrair para `types.ts` separado e **não** usar `export namespace <Entity>MapType`.
- A classe `<Entity>Map` referencia os aliases diretamente (`raw: Raw`, `: CreateInput`, etc.) — assinaturas enxutas, sem prefixo longo.
- Barrel `mappers/index.ts`: `export { <Entity>Map } from './<Entity>Map'` — **não** reexportar `Raw`, `CreateInput` nem `UpdateInput`.

| Alias | Deriva de | Usado em |
|-------|-----------|----------|
| `Raw` | `Prisma<Entity>` (model Prisma importado com alias) | `toDomain`, `toDomainList` |
| `CreateInput` | `Prisma.<Entity>UncheckedCreateInput` | `toCreatePersistence` |
| `UpdateInput` | `Prisma.<Entity>UncheckedUpdateInput` | `toUpdatePersistence` |

**Evitar** — namespace `MapType`, `import type * as PrismaTypes`, assinaturas longas (`<Entity>MapType.ToDomainInput`), `any`, ou tipo manual duplicando o schema:

```typescript
import type * as PrismaTypes from '@prisma/client'

export namespace ExportLayoutMapType {
  export type ToDomainInput = PrismaTypes.ExportLayout
  export type ToCreatePersistenceOutput = PrismaTypes.Prisma.ExportLayoutUncheckedCreateInput
  export type ToUpdatePersistenceOutput = PrismaTypes.Prisma.ExportLayoutUncheckedUpdateInput
}

static toDomain(raw: ExportLayoutMapType.ToDomainInput): ExportLayout { ... }
```

**Preferir** — aliases curtos no topo; classe referenciando `Raw`, `CreateInput`, `UpdateInput`. Arquivo `mappers/SystemDictionaryMap.ts`:

```typescript
import type { Prisma, SystemDictionary as PrismaSystemDictionary } from '@prisma/client'

import { SystemDictionary } from '../domain/SystemDictionary'
import type { ListSystemDictionaries } from '../dtos/ListSystemDictionariesDTO'

type Raw = PrismaSystemDictionary
type CreateInput = Prisma.SystemDictionaryUncheckedCreateInput
type UpdateInput = Prisma.SystemDictionaryUncheckedUpdateInput

export class SystemDictionaryMap {
  static toDomain(raw: Raw): SystemDictionary {
    return SystemDictionary.create({
      tenantId: raw.tenant_id,
      name: raw.name,
      default: raw.default,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    }, raw.id)
  }

  static toDomainList(dictionaries: Array<Raw>): Array<SystemDictionary> {
    return dictionaries.map(this.toDomain)
  }

  static toListDTO(dictionary: SystemDictionary): ListSystemDictionaries.DTO {
    return {
      id: dictionary.id,
      name: dictionary.name,
      default: dictionary.default,
      createdAt: dictionary.createdAt,
      updatedAt: dictionary.updatedAt,
    }
  }

  static toCreatePersistence(dictionary: SystemDictionary): CreateInput {
    return {
      id: dictionary.id,
      tenant_id: dictionary.tenantId,
      name: dictionary.name,
      default: dictionary.default,
    }
  }

  static toUpdatePersistence(dictionary: SystemDictionary): UpdateInput {
    return {
      tenant_id: dictionary.tenantId,
      name: dictionary.name,
      default: dictionary.default,
    }
  }
}
```

O `*Map` copia campo a campo: `campo: raw.campo` pode no retorno e no `create`. É exceção do shorthand (**Retorno de objetos: só shorthand**, estilo-actions.md).

Barrel em `mappers/index.ts`:

```typescript
export { SystemDictionaryMap } from './SystemDictionaryMap'
```

### Métodos e repositório

| Método | Direção | Retorno / parâmetro |
|--------|---------|---------------------|
| `toDomain` | Prisma → domínio | `Raw` → entidade |
| `toDomainList` | Prisma → domínio | `Array<Raw>` → `Array<entidade>` |
| `toCreatePersistence` | domínio → Prisma (`create`) | `CreateInput` (pode incluir `id`) |
| `toUpdatePersistence` | domínio → Prisma (`update`) | `UpdateInput` (**sem** `id` — `where` usa `entity.id`) |

- **Proibido** um único `toPersistence` genérico com `any` ou com tipo só de create reaproveitado no update — create e update têm assinaturas Prisma distintas.
- Model **sem relations**: preferir `UncheckedCreateInput` / `UncheckedUpdateInput` (campos flat em `snake_case`).
- `toDomain` mapeia `snake_case` do Prisma → `camelCase` do domínio; persistence faz o inverso.
- Repositório Prisma chama `toCreatePersistence` no `create` e `toUpdatePersistence` no `update`.

## Mapper só copia o campo

Campo novo no mapper entra **do mesmo jeito** que o campo vizinho. Uma linha de cada lado: lê da entidade, grava no banco, lê do banco, devolve na resposta.

**Não** inventar método privado para "limpar" o valor. **Não** checar tipo, vazio, `null`, objeto ou array. **Não** filtrar item. **Não** remontar JSON. Se o arquivo já passa `raw.checklist` direto, o campo novo passa direto também.

**Errado** — método novo que valida o que o arquivo vizinho só copia:

```typescript
private static createIds(value: Prisma.JsonValue | undefined): Array<string> {
  if (!Array.isArray(value)) { return new Array<string>() }

  const byString = (item: Prisma.JsonValue): item is string => typeof item === 'string'

  return value.filter(byString)
}

private static createRecord(value: Prisma.JsonValue): Prisma.JsonObject {
  const empty = value === null || typeof value !== 'object' || Array.isArray(value)

  if (empty) { return {} }

  return value
}

private static createChecklist(value: Prisma.JsonValue): Array<Task> {
  if (!Array.isArray(value)) { return new Array<Task>() }

  const toTask = (item: Prisma.JsonValue): Task | null => {
    if (typeof item !== 'object') { return null }

    return item
  }

  return value.map(toTask)
}
```

**Certo** — o valor atravessa, igual ao checklist:

```typescript
audienceSettings: raw.audience_settings,
checklist: raw.checklist,
exportLayoutId: raw.export_layout_id,
fieldIds: raw.field_ids,
```

```typescript
exportLayoutId: template.exportLayoutId,
fieldIds: template.fieldIds,
```

```typescript
export_layout_id: template.exportLayoutId,
field_ids: template.fieldIds,
```

Regra sobre o valor (esvaziar, esconder, trocar) não entra no `*Map` nem no provider. Vira peça de papel em `filters/` (`*Filter`, `FilterProtocol`), chamada por quem monta a saída. Ver [desenho.md](desenho.md).

## Maps de conversão (extends `Map`)

Quando um valor de **enum** vira outro valor — API, tela, ou regra (qual elemento ganha de qual) — **não** usar `Record`. **Não** ler com colchete (`mapa[chave]`). **Não** deixar a tabela no arquivo da strategy ou do use case. **Não** criar função solta. **Não** usar `MapperProtocol` só para lookup trivial.

A tabela mora numa **classe que estende `Map`**, arquivo próprio em `mappers/`. Quem usa guarda **uma** instância no topo e lê com **`.get(chave)`**.

**Preferir** uma **classe dedicada que estende `Map`** do JavaScript, na pasta `mappers/` do módulo, com pares `[enum, valor]` no `constructor` via `super([...])`.

```
src/modules/<Module>/mappers/
  <Concept>Map.ts       # ex.: ExportLayoutEncodingMap — extends Map<Enum, Valor>
  <Entity>Map.ts        # consome o map de conversão
  index.ts              # export { ExportLayoutEncodingMap } …
```

### Regras

1. **Nome do arquivo/classe:** `<Conceito>Map.ts` — ex.: `ExportLayoutEncodingMap`, `AccountingTypeDescriptionMap`.
2. **Genéricos:** `extends Map<EnumOrigem, ValorDestino>` — enum na chave, valor traduzido no valor.
3. **Constructor:** chamar `super([ [enum, valor], ... ])` com todos os pares declarados — **carimbar** os valores aos enums no construtor. Valores string da API/API externa vão em **`const` `UPPER_SNAKE_CASE` no topo do arquivo do map** (após imports) — **nunca** literal solto no array do `super`.
4. **`get` tipado:** sobrescrever `get(chave: EnumOrigem): ValorDestino` — se a entrada não existir, montar a mensagem com **`const message = ...`** e **`throw new Error(message)`** — ver **Mensagens de erro em `data/`** e exemplo abaixo. **Não** usar cast (`as string`) nem non-null assertion (`!`) só para satisfazer o TypeScript. Leitura reversa (valor → enum), quando o payload precisa: método `find` de instância, com a mesma mensagem. Nunca `from`.
5. **Consumo:** onde guardar a instância está em **Quem usa a peça** ([desenho.md](desenho.md)). O nome é o do conteúdo, no plural: `private readonly encodings = new ExportLayoutEncodingMap()`. Leia com `.get(enum)`, sem função wrapper.
6. **Barrel:** exportar a classe em `mappers/index.ts` quando outro arquivo do módulo precisar reutilizar.

| Abordagem | Quando usar |
|-----------|-------------|
| **`extends Map` + `.get()`** | Lookup enum → valor (ou valor → enum se o map for bidirecional com chaves distintas) |
| **`*Mapper` (peça de papel)** | Conversão com regra além do lookup: `MapperProtocol`, `map` de instância, em `private readonly` ([desenho.md](desenho.md)) |
| **`Record` ou `mapa[chave]`** | **Proibido** para tabela de enum. Use a classe `Map` e `.get()` |
| **Mediator** | **Nunca** para tradução simples de enum |

`*Map` é o mapper Prisma static ou a classe que estende `Map`. `*Mapper` é peça de papel. Não misture os sufixos.

**Evitar** — `Record` solto no mapper de entidade `ExportLayoutMap.ts`:

```typescript
const ENCODING_TO_API: Record<ExportLayoutEncoding, string> = {
  [ExportLayoutEncoding.utf8]: 'utf-8',
  [ExportLayoutEncoding.latin1]: 'latin-1',
}

static toListDTO(layout: ExportLayout): ListExportLayouts.DTO {
  return {
    encoding: ENCODING_TO_API[layout.encoding],
  }
}
```

**Evitar** — funções soltas de conversão:

```typescript
export const toApiEncoding = (encoding: ExportLayoutEncoding): string => { ... }
```

**Preferir** — classe `extends Map` dedicada + consumo com `.get()`. A mensagem fica em `data/messages.ts`:

```typescript
export const MISSING_ENCODING_MAP_ENTRY = (value: string) => (
  `Missing encoding map entry for ${value}`
)
```

A tabela fica em `mappers/ExportLayoutEncodingMap.ts`:

```typescript
import { ExportLayoutEncoding } from '@prisma/client'

import { MISSING_ENCODING_MAP_ENTRY } from '../data'

const UTF8_ENCODING = 'utf-8'
const LATIN1_ENCODING = 'latin-1'

export class ExportLayoutEncodingMap extends Map<ExportLayoutEncoding, string> {
  constructor() {
    super([
      [ExportLayoutEncoding.utf8, UTF8_ENCODING],
      [ExportLayoutEncoding.latin1, LATIN1_ENCODING],
    ])
  }

  get(value: ExportLayoutEncoding): string {
    const encoding = super.get(value)

    if (!encoding) {
      const message = MISSING_ENCODING_MAP_ENTRY(value)
      throw new Error(message)
    }

    return encoding
  }

  find(value: string): ExportLayoutEncoding {
    const keys = Object.values(ExportLayoutEncoding)
    const byValue = (key: ExportLayoutEncoding) => this.get(key) === value
    const encoding = keys.find(byValue)

    if (!encoding) {
      const message = MISSING_ENCODING_MAP_ENTRY(value)
      throw new Error(message)
    }

    return encoding
  }
}
```

O mapper Prisma `mappers/ExportLayoutMap.ts` é static, então guarda o map em `const` no topo:

```typescript
import { ExportLayoutEncodingMap } from './ExportLayoutEncodingMap'

const encodings = new ExportLayoutEncodingMap()

export class ExportLayoutMap {
  static toListDTO(layout: ExportLayout): ListExportLayouts.DTO {
    const encoding = encodings.get(layout.encoding)

    return { encoding }
  }
}
```

**Evitar** — `throw` com mensagem montada inline (sem `const message`):

```typescript
if (!encoding) {
  throw new Error(MISSING_ENCODING_MAP_ENTRY(value))
}
```

## Mensagens de erro em `data/`

Textos de erro e validação do módulo back-end ficam em `src/modules/<Module>/data/messages.ts` (barrel `data/index.ts`), **nunca** como string literal solta no corpo do mapper, use case ou repositório.

### Regras

1. **Nome:** `UPPER_SNAKE_CASE` — alinhado às demais constantes do arquivo (`EXPORT_LAYOUT_NOT_FOUND`, `MISSING_ENCODING_MAP_ENTRY`, …).
2. **Mensagem estática:** `export const NOME = 'Texto completo.'`
3. **Mensagem dinâmica** (interpola parâmetro): **arrow function** `export const NOME = (param: Tipo) => (\`Texto ${param}\`)` — **não** função nomeada solta fora de `data/`.
4. Todo `throw`, de qualquer erro (`Error`, `InvalidParamError`, `NotFoundError`): `const message = ...` antes, depois `throw new XError(message)`.

**Evitar:**

```typescript
if (!encoding) {
  throw new Error(`Missing encoding map entry for ${value}`)
}

if (!encoding) {
  throw new Error(MISSING_ENCODING_MAP_ENTRY(value))
}
```

**Preferir:**

```typescript
const message = MISSING_ENCODING_MAP_ENTRY(value)
throw new Error(message)
```

- Mensagens de `InvalidParamError`, `NotFoundError` etc. ficam no mesmo arquivo e seguem a regra 4.

## Métodos de mutação na entidade — verbos de ação

Métodos que alteram o estado da entidade usam **verbos de ação** que descrevem o que a operação **realmente faz** no domínio — **nunca** prefixos genéricos (`assign`, `set`, `update` solto) nem copiar cegamente o mesmo verbo para todos os campos.

Escolher o verbo conforme a **semântica da operação**:

| Intenção | Verbo | Quando usar |
|----------|-------|-------------|
| Renomear | `rename` | Campo de nome/título/display — ex.: `rename('Layout folha CLT')` |
| Substituir valor escalar | `change` + substantivo | Troca de enum/atributo existente — ex.: `changeType`, `changeEncoding`, `changeStatus` |
| Incluir em coleção | `add` + substantivo | Só quando **adiciona** item a lista/conjunto — ex.: `addTask`, `addDocument` |
| Remover de coleção | `remove` + substantivo | Retira item — ex.: `removeTask` |
| Voltar ao padrão | `reset` + substantivo | Restaura valor inicial/calculado — ex.: `resetSize` |
| Atualizar valor derivado | `update` + substantivo | Recalcula ou refresca dado computado — ex.: `updateSize` após gerar arquivo |
| Regra de negócio nomeada | verbo de domínio | Preferir método explícito com validação — ex.: `archive()`, `unarchive()` em vez de expor `changeStatus` no fluxo principal |
| Proteção / restrição de mutação | `lock` / `unlock` | Quando um booleano **bloqueia** delete, archive ou edição — nomear pelo **efeito** (protegido vs liberado), **não** pelo nome da prop (`default`, `protected`, `system`) — ex.: `lock()` / `unlock()` em `ExportLayout` |
| Transformar valor na exportação | `transform` | Quando `format` é **regra de saída** do valor (maiúsculo, só números, data, moeda) — **não** use `changeFormat`/`reformat` só porque a prop se chama `format` |

**Exemplo — mesmo nome de prop, verbo diferente.** Em `domain/ExportLayoutField/ExportLayoutField.ts`, `format` é a regra de transformação na exportação (uppercase, numbers_only, date_dd_mm_yyyy, currency). `changeFormat` seria genérico: aqui não é formato de arquivo. `transform` diz o que a operação faz: muda como o valor sai no arquivo.

```typescript
transform(format: ExportLayoutFieldFormat) {
  this.props.format = format
  return this
}
```

**Exemplo — booleano de proteção: nomear pelo efeito (`lock` / `unlock`), não pela prop**

Quando um flag impede delete, archive ou outras mutações (ex.: layout padrão do sistema), **não** exponha `changeDefault(false)`, `resetDefault()`, `setProtected()` nem adjetivos que parecem getter (`deletable()`). O método descreve o que muda na **capacidade de mutação** da entidade — protegida (`lock`) ou liberada (`unlock`).

Par **`lock` / `unlock`** — mesmo estilo de par oposto que `archive` / `unarchive`: sem parâmetro, encadeável, um lado liga a proteção e o outro desliga.

Em `domain/ExportLayout/ExportLayout.ts`, `default` marca o layout do sistema. `lock` impede delete e archive.

```typescript
lock() {
  this.props.default = true
  return this
}

unlock() {
  this.props.default = false
  return this
}
```

A cópia nunca herda a proteção do layout padrão. Em `useCases/replicateExportLayout/ReplicateExportLayoutUseCase.ts`:

```typescript
private replicateLayout(layout: ExportLayout, name: string): ExportLayout {
  return layout
    .replicate()
    .rename(name)
    .unlock()
}
```

A duplicata também não herda a trava. Em `useCases/duplicateExportLayout/DuplicateExportLayoutUseCase.ts`:

```typescript
return ExportLayout
  .create(schema)
  .unlock()
```

O seed é o único fluxo que trava. Em `scripts/exportLayouts/initializeDefaultExportLayout.ts`:

```typescript
return ExportLayout
  .create(schema)
  .lock()
```

**Evitar** — espelhar o nome da coluna/prop ou usar verbo mecânico:

```typescript
changeDefault(false)
resetDefault()
deletable()
stripDefault()
```

- `changeDefault(false)`: genérico, não diz o efeito.
- `resetDefault()`: parece "voltar a ser padrão", mas faz o contrário.
- `deletable()`: parece getter booleano e confunde com guards `*Deletable*`.
- `stripDefault()`: fala da prop, não da proteção.

**Preferir** — `lock()` no seed ou na regra que marca recurso do sistema; `unlock()` no replicate e no duplicate, que podem trazer `default: true`.

**Evitar** — prefixo mecânico ou verbo que não bate com a ação:

```typescript
assignName(value: string): void { ... }
addName(value: string): void { ... }
setStatus(value: Status): void { ... }
```

- `assignName`: genérico demais.
- `addName`: não é "adicionar", é renomear.
- `setStatus`: prefira `changeStatus` ou `archive`/`unarchive`.

**Preferir** — verbo alinhado ao domínio; builder espelha os mesmos nomes. Em `domain/ExportLayout/ExportLayout.ts`:

```typescript
export class ExportLayout extends Entity<ExportLayoutDomainType.Schema> {
  rename(value: string): void {
    this.props.name = value
  }

  changeType(value: ExportLayoutType): void {
    this.props.type = value
  }

  changeFormat(value: ExportLayoutFormat): void {
    this.props.format = value
  }

  changeEncoding(value: ExportLayoutEncoding): void {
    this.props.encoding = value
  }

  changeStatus(value: ExportLayoutStatus): void {
    this.props.status = value
  }

  archive(): void {
    this.changeStatus(ExportLayoutStatus.archived)
  }
}
```

Em `builders/ExportLayoutBuilder.ts`:

```typescript
export class ExportLayoutBuilder implements BuilderProtocol<void, ExportLayout> {
  constructor(private readonly layout: ExportLayout) {}

  rename(value: string): this {
    this.layout.rename(value)
    return this
  }

  changeFormat(value: ExportLayoutFormat): this {
    this.layout.changeFormat(value)
    return this
  }

  build(): ExportLayout {
    return this.layout
  }
}
```

Uso, com encadeamento em várias linhas:

```typescript
const { name, type, format } = input

return new ExportLayoutBuilder(layout)
  .rename(name)
  .changeType(type)
  .changeFormat(format)
  .build()
```

Builder é instância: `new ExportLayoutBuilder(layout)`. Sem `static from`.

- **Entidade limpa:** getters + métodos com verbo de ação + regras de domínio (`archive`, `unarchive`); **não** embutir montagem de API fluente (`createModifierApi`, `tap`) na classe.
- **Builder em `builders/` do módulo** (`<Entity>Builder.ts`): delega para os métodos da entidade; `build()` retorna a instância mutada. Implementa `BuilderProtocol<void, <Entity>>`: por isso o `build` pode ([desenho.md](desenho.md), **Verbo genérico**).
- **Mesmo verbo** na entidade e no builder — o builder não inventa nomes diferentes (`name()` vs `rename()`).
- Antes de nomear, perguntar: *é adicionar, trocar, renomear, resetar ou uma regra de negócio?* — e escolher o verbo correspondente.

## Testes unitários (performance e isolamento)

> **Escopo:** **hr-tech-backend** (Vitest). Objetivo: suite que **não trava o CI** — cada spec deve ser barato em CPU e memória.

### O que testar

| Testar | Não testar (salvo pedido explícito) |
|--------|-------------------------------------|
| Toda peça de papel nova (`*Filter`, `*Validator`, `*Formatter`, `*Mapper`, `*Comparer`, `*Strategy`): sempre, spec ao lado | |
| Use case com regra de negócio | `*Map` de Prisma (static) |
| Service `IExecutable` que orquestra ou decide | Classe que só estende `Map` |
| Guard, strategy, validator Zod | Logger só com mensagem fixa |
| Script fino **se** a regra não couber no service | Duplicar o mesmo fluxo no spec do script **e** do service |

### Isolamento — preferir mock a import pesado

1. **Repositório:** `InMemory*Repository` do módulo — **nunca** PostgreSQL/Mongo/Redis de verdade.
2. **Prisma / `$transaction`:** objeto fake com `vi.fn`.
3. **Injetor, logger, OpenTelemetry, Pub/Sub, GCS, e-mail:** `vi.mock('…')` no **topo** do arquivo (antes dos imports do SUT quando o Vitest exigir hoisting).
4. **Dependências do service:** `{ execute: vi.fn() } as unknown as Tipo` — **não** instanciar cadeia Prisma real só para “ficar mais real”.
5. **Evitar** `vi.importActual` de módulo grande só para reutilizar uma constante — copiar o mínimo ou importar só de `data/`.
6. **Evitar** `beforeAll` que carrega app Express, `getClient(tenantId)` ou bootstrap de script — quebra escopo e puxa Mongo.

### Performance no CI

- **Poucos casos, assertivos** — happy path + 1–2 falhas de regra; não matriz enorme de combinações no mesmo arquivo.
- **Dados mínimos** — seed só o que o `it` precisa; factory enxuta local no spec.
- **Sem I/O:** sem `fs`, rede, `setTimeout` longo, cron real; timers com `vi.useFakeTimers` só quando indispensável.
- **Sem import de barril gigante** (`index` do módulo inteiro) se import direto do arquivo alvo bastar.
- **Scripts:** mockar o **injector** e testar regra no **service** — spec do script só cobre wiring/early return.

### Formato do spec

- Co-locado com o SUT (`FooUseCase.spec.ts` ao lado de `FooUseCase.ts`).
- `describe('NomeDoUseCase')` ou `describe('[Scripts]: …')` para scripts.
- Classe com dependência: monte numa `const` dentro do `it`, com InMemory e `vi.fn`. Sem `let` + `beforeEach`. Peça de papel sem estado: `const peca = new Peca()` dentro do `describe`.
- Mensagens de erro: comparar com função de `data/messages.ts`, não string duplicada.
- Peça de papel: **Spec ao lado** ([desenho.md](desenho.md)).
- Caso novo em spec velha: o `it` novo não reatribui o `let` do `describe`. Precisa de outra montagem? `const` local, com outro nome, dentro do `it`. As linhas velhas (`let`, `try/catch`) ficam como estão.

**Errado** — o `it` novo reatribui o `let` velho:

```typescript
useCase = new CreatePayrollTemplateUseCase(payrollTemplateRepository, payrollEventRepository, systemFieldRepository)
```

**Certo** — `const` local, com outro nome:

```typescript
const creation = new CreatePayrollTemplateUseCase(
  payrollTemplateRepository,
  payrollEventRepository,
  systemFieldRepository,
)

const execution = creation.execute(request)

await expect(execution).rejects.toBeInstanceOf(InvalidParamError)
```

## Workflow do agente

Teste, lint e scan: SKILL.md, grupo **Escrita**.

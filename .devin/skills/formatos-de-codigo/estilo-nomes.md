> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Estilo de nomes

## Classe sem `Tools`, `Helper(s)` ou `Utils`

Nunca gaveta. A lista de pastas e classes proibidas e a tabela de papéis estão em [desenho.md](desenho.md).

## Nome do método e da propriedade da peça

Método, propriedade e resultado da peça, e o verbo genérico com as suas exceções, estão em [desenho.md](desenho.md): **A peça**, **Verbo genérico** e **Quem usa a peça**. O método novo de quem usa tem verbo de domínio: `formatPersonField`.

## Nomes de constantes e variáveis (`const`)

Ao definir variáveis e constantes, seguir sempre estes critérios:

- **Idioma:** nomes sempre em **inglês**.
- **Nunca abreviar:** **proibido** encurtar nomes com abreviações de uma ou duas letras ou formas coloquiais (`src`, `idx`, `doc`, `str`, `num`, `err`, `tmp`, etc.). Usar a **palavra completa** que comunica o significado (`source`, `index`, `document`, `text`, `count`, `error`, `temporary`, etc.).

**Certo:**

```typescript
const source = String()
```

**Errado:**

```typescript
const src = String()
```

- **Tamanho e clareza:** preferir nomes **sucintos** com **palavras inteiras** — de preferência **uma palavra completa** — fáceis de ler e de entender, sem repetir o contexto quando ele já está óbvio no escopo (arquivo, função ou serviço).

Use o contexto onde o símbolo vive para evitar redundância: se já está num serviço ou fluxo de documentos e busca registros no banco, **`documents`** é adequado; não é preciso **`personDocuments`**, **`personDocumentSign`**, etc. Da mesma forma, para assinaturas **`signature`** pode bastar em vez de **`personSignature`** — desde que não haja ambiguidade com outros tipos na mesma função ou bloco.

A regra é **nome mínimo que ainda comunica sentido no contexto**, sempre com **palavras completas**; uma palavra em inglês é o ideal quando não gerar confusão.

### Variáveis locais: preferir uma palavra, sem prefixos de estado

`const` locais usam **preferencialmente uma única palavra em inglês** — o escopo (parâmetro, método, arquivo) já comunica o resto.

**Proibido** compor o nome com prefixos que só repetem estado, tempo ou posição relativa: `existing*`, `current*`, `new*`, `old*`, `previous*`, `next*`, `original*`, `updated*`, `already*`, `other*`, etc. `other` não diz o que a coisa é, só que é a outra. O nome é o tipo dela: `attachment`, `text`. **Nunca** usar **`raw`** como nome de variável/parâmetro local — preferir **`value`**, **`input`** ou substantivo de domínio; exceção: alias de tipo **`Raw`** em mappers Prisma (`raw: Raw` em `toDomain`).

**Evitar:**

```typescript
const existingSystemFieldIds = new Set(dictionaryFields.map(toSystemFieldId))
const alreadyAdded = systemFieldIds.some(included)
const currentUser = await this.userRepository.read(tenantId, userId)
const newMappings = mappings.filter(byActive)

private rejectAlreadyAddedFields(...) { ... }
```

**Preferir:**

```typescript
const toSystemFieldId = (field: SystemDictionaryField) => field.systemFieldId
const fieldIds = dictionaryFields.map(toSystemFieldId)
const ids = new Set(fieldIds)

const byIncluded = (systemFieldId: string) => ids.has(systemFieldId)
const duplicate = systemFieldIds.some(byIncluded)
const message = SYSTEM_DICTIONARY_FIELD_ALREADY_ADDED

if (duplicate) { throw new InvalidParamError(message) }

const user = await this.userRepository.read(tenantId, userId)
const active = mappings.filter(byActive)

private assertUniqueDictionaryFields(...) { ... }
```

**Regras:**

1. **Uma palavra** quando o contexto elimina ambiguidade (`ids`, `user`, `context`, `duplicate`, `active`).
2. **Duas ou mais palavras** só quando **uma palavra geraria colisão ou confusão real** no mesmo bloco — ex.: `systemFieldContext` ao lado de `fieldContext`, ou nomes de domínio fixos do projeto (`dictionaryFields`, `systemFieldIds`).
3. Prefixos temporais/estado (`existing`, `current`, `new`, `already`, …) **nunca** — renomear parâmetro/método ou usar substantivo neutro (`dictionaryFields` em vez de `existingFields`; `assertUniqueDictionaryFields` em vez de `rejectAlreadyAddedFields`; `ids` em vez de `existingSystemFieldIds`).
4. Callback de predicado (`filter` / `find` / `some` / `every`) é `by*`: `byIncluded`, `byOwner`. Nunca `byExisting`, `byCurrent`, `byNew`, nem `match`.
5. Condição com chamada (`includes`, `some`, `has`) vira `const` booleana com nome de estado, uma palavra (`duplicate`, `attachment`). O `if` usa só o nome, em uma linha. Comparação simples (`===`, `!`) pode ficar no `if`.
6. Exceção: `prev` e `next` como parâmetros do comparador de `.sort()`.

### Map de lookup indexado: sufixo `Context`

Quando um `Map<Key, Entity>` é montado na hora, a partir de uma lista, para consulta indexada, nomear variável, tipo e propriedade com **`{entidade}Context`** — **nunca** sufixo `Catalog`, `catalog`, `ById`, `ByIdentifier`, `byId`, etc.

Tabela fixa de enum não é `Context`: ver **Maps de conversão** (arquitetura-back-dados.md).

**Errado:**

```typescript
const pairs = people.map(toPersonKeyValue)
const personByIdentifier = new Map<string, Person>(pairs)

const systemFieldCatalog = this.toSystemFieldCatalog(systemFields)

type Input = {
  fieldIds: Array<string>
  catalog: Map<string, ExportLayoutField>
}
```

**Certo:**

```typescript
const pairs = people.map(toPersonKeyValue)
const personContext = new Map<string, Person>(pairs)

const systemFieldContext = this.createSystemFieldContext(systemFields)

type Input = {
  fieldIds: Array<string>
  context: Map<string, ExportLayoutField>
}
```

- Mesmo padrão para outras entidades: `systemFieldContext`, `admissionCardContext`, `documentContext`.
- **Nunca** usar a palavra **`lookup`** em nomes de símbolos (classe, tipo, método, variável, callback) — ex.: evitar `LookupContext`, `toLookupKey`, `lookupByCity`; preferir **`Context`**, `toContextKey`, `create{Entidade}Context` (ex.: `DominioMunicipalityContext`, não `DominioMunicipalityLookupContext`).
- O callback do `map` que produz par `[chave, valor]` para o Map: `toKeyValue`, `toPersonKeyValue`, … — **nunca** sufixo `Entry` — ver **Nunca usar Entry / Entries** e **Nomenclatura de callbacks em coleções**.
- Em guards/use cases/services, extrair a montagem para método **`create{Entidade}Context`** — **nunca** prefixo `to` no método.
- Fix em arquivo legado: não crie método de Context no arquivo velho. A regra vai para a peça de papel nova ([desenho.md](desenho.md)). Para checar um id, `filter` + `map` + `includes` dentro da peça basta.

**Certo** (dois ou mais contextos irmãos):

```typescript
const systemFieldContext = this.createSystemFieldContext(systemFields)
const payrollEventContext = this.createPayrollEventContext(payrollEvents)
```

- **`create`** comunica montagem de estrutura indexada — alinhado a **Nunca usar prefixo `build`**; `to*` só em callback de `map` / `reduce` e na API do `*Map` (`toDomain`, `toDTO`…).
- Quando houver **dois ou mais** contextos irmãos no mesmo bloco, manter o par `{entidade}Context` + `create{Entidade}Context` — ver **Constantes irmãs: preferir objeto com chaves semânticas** se fizer sentido agrupar.
- **Propriedades de um tipo/objeto agregador** (não o Map em si): nome da entidade **sem** sufixo `Context` — o tipo já comunica (`dictionaryFields`, `mappings`; não `dictionaryFieldContext`). Quando a propriedade **é** o Map de lookup, usar **`context`** ou `{entidade}Context` conforme o bloco.

### Nunca usar `bundle`

**Proibido** `bundle`, `Bundle`, `bundles` em tipo, variável, função ou prop. Não diz o que o dado é. Só diz que várias coisas foram juntadas.

Nomear pelo que chegou: a leitura, o pedido, a resposta.

**Evitar:**

```typescript
type Bundle = { template: Template; catalog: Catalog }

const bundle = await request.execute(read)
```

**Preferir:**

```typescript
type Reading = { template: Template; catalog: Catalog }

const reading = await request.execute(read)
```

### Nunca usar Entry / Entries

**Proibido** usar **`Entry`**, **`Entries`**, **`entry`** ou **`entries`** em nomes de variáveis, constantes, callbacks, métodos, tipos, classes ou props — inclui compostos como `toCodeEntry`, `mapEntries`, `contextEntry`, `toPersonEntry`, `systemFieldContextEntry`.

Soa genérico (jargão de `Map`/JSON) e **não** comunica domínio. **Nunca** sugerir esses nomes em código novo — nem em revisões.

**Exceção:** API nativa **`Object.fromEntries(...)`** e **`map.entries()`** — usar o método assim; **não** nomear variável local `entries` para guardar o resultado (preferir `keyValues`, `pairs` ou montar o Map com `reduce` + `toContext`).

**Preferir:**

| Evitar | Preferir |
|--------|----------|
| `const entries = …` antes de `new Map(entries)` | `createPersonContext` com `reduce` + `toContext`; ou `const keyValues = …` |
| `toFieldEntry`, `toCodeEntry` | `toFieldKeyValue`, `toKeyValue` |
| `toSystemFieldContextEntry` | `toSystemFieldKeyValue` ou `createSystemFieldContext` |

**Evitar:**

```typescript
const toFieldEntry = (field: Field): [string, Field] => [field.id, field]

const entries = fields.map(toFieldEntry)

return new Map(entries)
```

**Preferir:**

```typescript
private createFieldContext(fields: Array<Field>): Map<string, Field> {
  const context = new Map<string, Field>()

  const toContext = (accumulator: Map<string, Field>, field: Field) => {
    accumulator.set(field.id, field)

    return accumulator
  }

  return fields.reduce(toContext, context)
}
```

### Constantes irmãs: preferir objeto com chaves semânticas

Quando várias constantes representam **partes relacionadas do mesmo conceito** (botões de footer, ações de um modal, slots de layout, etc.), **nunca** criar um par ou grupo com sufixo **posicional** ou **lateral** — `footerLeft`/`footerRight`, `actionLeft`/`actionRight`, `buttonLeft`/`buttonRight`, etc.

**Preferir** um **único objeto** cujo nome descreve o agrupamento (`footers`, `buttons`, `actions`, `slots`, …) e cujas **chaves são semânticas** — papel, tipo ou domínio de cada parte — não posição na tela.

As chaves variam por contexto: `primary`/`secondary` quando o par é tipo de botão; `cancel`/`confirm` quando são ações; `header`/`body` quando são regiões — o que importa é **significado**, não `Left`/`Right`/`Top`/`Bottom` no nome da constante.

**Evitar:**

```typescript
const footerLeft: Array<IButtonConfig> = [
  { type: ButtonTypeOptions.SECONDARY, text: translations.buttons.cancel, callback: cancel },
]

const footerRight: Array<IButtonConfig> = [
  { type: ButtonTypeOptions.PRIMARY, text: translations.buttons.advance, callback: advance },
]

const config = {
  footer: {
    left: footerLeft,
    right: footerRight,
  },
}
```

**Preferir:**

```typescript
const footers = {
  secondary: [
    { type: ButtonTypeOptions.SECONDARY, text: translations.buttons.cancel, callback: cancel },
  ],
  primary: [
    { type: ButtonTypeOptions.PRIMARY, text: translations.buttons.advance, callback: advance },
  ],
}

const config = {
  footer: {
    left: footers.secondary,
    right: footers.primary,
  },
}
```

**Evitar** — constantes irmãs com sufixo repetido no nome:

```typescript
const systemFieldIds = this.collectSystemFieldIds(fields)
const payrollEventIds = this.collectPayrollEventIds(fields)
```

**Preferir** — um único objeto com chaves semânticas de domínio:

```typescript
const ids = {
  systemField: this.collectSystemFieldIds(fields),
  payrollEvent: this.collectPayrollEventIds(fields),
}
```

- **A partir de duas** constantes do mesmo conceito, o objeto é obrigatório. Uma sozinha pode ficar solta (`const empty = list.length === EMPTY_NUMBER`). Instância de peça de papel fica fora desta regra: **Quem usa a peça** ([desenho.md](desenho.md)).
- Não arrastar o assunto para o nome de cada uma (`statesEmpty`, `citiesEmpty`). O nome do objeto carrega o conceito (`empty`); a chave diz qual parte (`state`, `city`).

```typescript
const empty = {
  state: states.length === EMPTY_NUMBER,
  city: municipalities.length === EMPTY_NUMBER,
}

if (address && empty.state) { return null }
if (city && empty.city) { return null }
```

- Mapear para props/API que exigem `left`/`right` (ou equivalente) **no objeto de destino** — a posição fica no contrato externo, não no nome das constantes locais.
- Se houver **três ou mais** partes do mesmo conceito, o mesmo objeto absorve todas (`buttons: { cancel, confirm, save }`) — não proliferar `footerLeft`, `footerCenter`, `footerRight`.
- Vale na spec. Ids de teste irmãos viram um objeto: `IDS.attachment`, `IDS.text`. Nunca `SYSTEM_FIELD_ID` junto com `OTHER_SYSTEM_FIELD_ID`.
- Vale para callback. `byFilledGroup` e `byFilledCategory` viram o objeto `byFilled`, e o `filter` usa a chave. `to*` que devolvem tipos diferentes (`toGroup`, `toCategory`) ficam soltos.

```typescript
const byFilled = {
  group: (group: IGroup) => group.fields.length > EMPTY_NUMBER,
  category: (category: ICategory) => category.groups.length > EMPTY_NUMBER,
}

const groups = category.groups.filter(byFilled.group)
```

> Parte da skill `formatos-de-codigo`. Leia **sempre**, junto com o SKILL.md e a persona, antes da primeira linha de código.

# Desenho

Esta é a forma que o dono aceita. Decida o desenho no **Portão de desenho** do SKILL.md. Com pergunta aberta, sem código. Sem pergunta aberta, escreva nesta forma. Vale no front e no back.

## Papel, pasta, protocolo e método

| A peça… | Classe | Pasta | Protocolo → método |
| --- | --- | --- | --- |
| tira ou esconde um valor | `*Filter` | `filters/` | `FilterProtocol` (front: `IFilter`) → `filter` |
| confere uma regra e acusa erro | `*Validator` | `validators/` | `ValidatorProtocol` (front: `IValidator`) → `validate` |
| converte uma forma em outra | `*Mapper` | `mappers/` | `MapperProtocol` (front: `IMapper`) → `map` |
| monta texto, ou troca caractere do texto que sai | `*Formatter` | `formatters/` | `FormatterProtocol` (front: `IFormatter`) → `format` |
| diz se é igual a um valor | `*Comparer` | `comparers/` | `ComparerProtocol` (front: `IComparer`) → `compare` |
| ordena uma lista | `*Sorter` | `sorters/` | `ISortable`, só no front → `sort` |
| cria entidade ou parâmetros | `*Factory` | `factories/` | `CreationalProtocol` (front: `IFactory`) → `create` |
| escolhe entre variantes | `*Strategy` + Context | `strategies/` | `StrategyProtocol` (front: `IExecute`) → `execute` |
| orquestra passos com dependência | `*Service` | `services/` | `IExecutable` (front: `IExecute`) → `execute` |

- Protocolo: back em `src/shared/protocols/`, um `<Papel>Protocol` por arquivo. Front em `src/protocols/`, import de `protocols`: já existem `IMapper`, `IFormatter`, `IFactory`, `IExecute` e `ISortable`, cada um num arquivo minúsculo (`IMapper` em `mapper.ts`). Não existe? Crie no formato dos irmãos do mesmo lado e exporte no `index.ts`. No front, `IFilter` em `filter.ts`. `IFilterable` é forma de dado, não protocolo. O back ainda não tem protocolo de ordenação. O `CleanerProtocol` (`sanitize`) do back só é chamado: o papel da peça nova vem desta tabela.
- Dois verbos ou duas regras na resposta? São duas classes. Regra que o pedido não trouxe, e o efeito que sobra dela: linha 2 do Portão, no SKILL.md.
- Nunca gaveta, front e back. Pasta: `tools/`, `helpers/`, `utils/`, `common/`, `misc/`, `lib/`. Classe: `*Tools`, `*Helper(s)`, `*Utils`, `*Manager`, `*Handler`, `*Processor`, `*Common`. Nome que não diz o papel é papel que ainda não foi decidido. Gaveta do projeto é legado: só importe, e ela não ganha irmão.
- `*Map` não é `*Mapper`. `*Map` é o mapper Prisma/DTO (static) ou a tabela que estende `Map`. `*Mapper` é peça de papel: instância e `map`.
- Pattern quando o problema pede: variantes → Strategy, criação → Factory, passos em fila → Chain of Responsibility, vários serviços atrás de uma porta → Facade. Sem variante: uma classe, um método.
- Passos em fila, no back: cada passo é um `*Stage` que implementa `PipelineStageProtocol` (`process`), em `pipelines/<fila>/stages/`. `Handler` e `AsyncHandler` do projeto são legado: não ganham irmão, e classe nova não se chama `*Handler`.

## A peça

- Um método público só: o do protocolo. Sem verbo genérico (**Verbo genérico**, abaixo).
- Uma regra só, a do pedido. O nome da classe diz a regra inteira.
- Sem `static`. Sem `constructor` que recebe dados. Sem `private constructor`. Sem `from`. A peça não guarda dado da chamada. O `*Service` recebe dependência no `constructor` (repositório, Prisma): isso pode.
- `type Input` e `type Output` no topo, sem `export`. Um parâmetro só: `input: Input`, desestruturado na primeira linha quando é objeto.
- `implements` ou `extends` cabe na linha da classe (100 colunas): mesma linha. Não cabe: na linha de baixo, sem recuo.
- Dentro da peça: sem campo `?`, sem `undefined`, sem `?.`, sem `??`. Quem chama entrega tudo pronto. Exceção única: a `*ParamsFactory` existe para pôr o default da entidade. O `Input` dela traz os campos opcionais. Cada default é uma `const` com `??` sobre `input.<campo>`, lido sem desestruturar, e o retorno espalha o `input` em shorthand (**ParamsFactory**, arquitetura-back.md). Outra `*Factory` segue a regra.
- Todo tipo entra com `import type`. Enum usado como valor fica em `import`.

O `FilterProtocol` já existe no back, em `src/shared/protocols/`. Protocolo que ainda não existe nasce neste formato, num arquivo próprio:

```typescript
export interface FilterProtocol<TInput, TOutput> {
  filter(input: TInput): TOutput
}
```

E ganha uma linha no `src/shared/protocols/index.ts`:

```typescript
export type { FilterProtocol } from './FilterProtocol'
```

Arquivo `src/modules/exportations/filters/AttachmentFieldFilter.ts`:

```typescript
import { EMPTY_STRING } from '../../../shared/constants'
import type { FilterProtocol } from '../../../shared/protocols'
import { TypeOptions } from '../../../shared/providers/systemField/SystemFieldsProvider'
import type { PersonField } from '../../persons/domain/PersonField'

type Input = {
  fields: Array<PersonField>
  systemFieldId: string
  value: string
}

type Output = string

export class AttachmentFieldFilter implements FilterProtocol<Input, Output> {
  filter(input: Input): Output {
    const { fields, systemFieldId, value } = input

    const byAttachment = (field: PersonField) => field.type === TypeOptions.ATTACHMENT
    const toSystemFieldId = (field: PersonField) => field.systemFieldId

    const attachments = fields
      .filter(byAttachment)
      .map(toSystemFieldId)

    const attachment = attachments.includes(systemFieldId)

    if (attachment) { return EMPTY_STRING }

    return value
  }
}
```

No front é a mesma forma: o protocolo vem de `protocols` (`IFilter`), o `EMPTY_STRING` de `helpers` (pasta legada: só importe).

## Static: só duas exceções

1. Classe `*Map` de Prisma/DTO: `toDomain`, `toDomainList`, `toDTO`, `toListDTO`, `toCreatePersistence`, `toUpdatePersistence` e os passos `private static create*` dela.
2. `static create` da entidade.

Fora isso, nunca `static`: nem `static from`, `static get`, `static format`, `static apply`, `static readonly`. Context de strategy e Builder também são instância. `static` que já existe no projeto é legado: chame como está e não copie.

## Verbo genérico

Nenhum nome novo leva verbo genérico: método, função, callback, chave de `actions`. Nem como prefixo (`getMissingFields`). A lista: `apply`, `run`, `process`, `handle`, `get`, `resolve`, `do`, `execute`, `build`.

Exceções, só estas:

1. O método do contrato que a classe cumpre: o protocolo que ela implementa, a API nativa que ela sobrescreve, ou o `execute` do use case, que o controller chama. Exemplos: `process` do `PipelineStageProtocol`, `execute` do `IExecutable`, do `IExecute`, do `StrategyProtocol` e do `GuardProtocol`, `build` do `*Builder` que implementa `BuilderProtocol`, `get` da classe que estende `Map`.
2. O `actions.get` do hook de labels (**`useLabels`**, arquitetura-front-hooks.md).

Getter de entidade (`get name()`) não é método `get`: pode. Nome que já existe no projeto é legado: chame como está.

## Quem usa a peça

- Classe: `private readonly filter = new AttachmentFieldFilter()`. A propriedade tem o nome do papel. Não mexa no `constructor` para isso.
- Vários do mesmo papel na mesma classe ou no mesmo hook: cada um leva o nome da origem ou da regra (`directory`, `attachment`), numa propriedade ou `const` própria, sem objeto agrupando.
- Hook, dono `static` (`*Map` de Prisma, `static create` da entidade) e arquivo Zod: `const filter = new AttachmentFieldFilter()` no topo do arquivo, depois dos tipos (no arquivo Zod, depois dos imports). Nunca `new` da peça dentro do hook ou do método.
- O resultado é o particípio: `filtered`, `formatted`, `mapped`. Se ele entra direto como chave do objeto montado logo depois, leva o nome da chave: `const systemFields = filter.filter(input)` e `return { ...template, systemFields }`.
- Peças em fila: a segunda recebe a saída da primeira direto, sem montar outro objeto. O `Input` dela é o `Output` da primeira (`type Input = Array<ICategory>`): `const filtered = filter.filter(categories)` e `const mapped = mapper.map(filtered)`.
- O método novo de quem usa monta o `input` pronto. O `?.` e o `??` ficam nele, e só se o tipo do campo é opcional. Confira o tipo no model, não no arquivo velho. Campo obrigatório entra direto: `const categories = template.systemFields`.
- O `?? new Array<PersonField>()` só fecha o tipo quando o código mostra que o dono sempre vem na lista, e com o campo que a peça procura. Confira os dois no repositório. Vem sempre: não pergunte. Pode faltar um dos dois: o bug continua nesse caso, e isso é a pergunta do Portão. No fix do provider, o dono vem (`includeDeleted: true`), mas o campo apagado depois que a folha fechou, da pessoa ou de sistema, não vem (`deleted: false`).

## Validator

A peça confere e devolve o resultado. Quem usa lança. A forma é a do Filter.

- A peça devolve `ValidationResult.ok(<entrada>)` ou `ValidationResult.failure(errors)`. É `static` legado: chame como está.
- A mensagem de `data/messages.ts` entra só na peça, em cada erro.
- O `assert*` de quem usa lança com a mensagem que a peça devolveu. Não importa a constante de novo.
- O `assert*` devolve `void`.
- Na spec, compare o resultado inteiro: `const expected = { success, errors }` e `expect(validated).toEqual(expected)`. No caso que passa, `{ success, data }`. O resultado é união: ler `validated.errors` ou `validated.data` direto não compila.

Arquivo `src/modules/payrollTemplates/validators/AttachmentSystemFieldValidator.ts`, na forma da `staging`:

```typescript
import { EMPTY_NUMBER } from '../../../shared/constants'
import type { ValidationResultProtocol, ValidatorProtocol } from '../../../shared/protocols'
import { TypeOptions } from '../../../shared/providers/systemField/SystemFieldsProvider'
import { ValidationResult } from '../../../shared/validators'
import type { SystemField } from '../../systemFields/domain/SystemField'
import { ATTACHMENT_SYSTEM_FIELDS_NOT_ALLOWED } from '../data'

type Input = {
  systemFields: Array<SystemField>
}

type Output = Array<SystemField>

export class AttachmentSystemFieldValidator implements ValidatorProtocol<Input, Output> {
  validate(input: Input): ValidationResultProtocol.Result<Output> {
    const { systemFields } = input

    const byAttachment = (systemField: SystemField) => systemField.type === TypeOptions.ATTACHMENT

    const toError = (systemField: SystemField) => {
      const field = systemField.keyName
      const message = ATTACHMENT_SYSTEM_FIELDS_NOT_ALLOWED

      return { field, message }
    }

    const errors = systemFields
      .filter(byAttachment)
      .map(toError)

    const valid = errors.length === EMPTY_NUMBER

    if (valid) { return ValidationResult.ok(systemFields) }

    return ValidationResult.failure(errors)
  }
}
```

A `main` ainda tem a forma velha: `ValidationResultProtocol<Output>`, `ValidationResult.failure<Output>(errors)` e `errors` opcional, lido com `validated.errors ?? new Array<ValidationErrorProtocol>()`. O zero também tem outro nome lá (**Emptiness**, estilo-visual.md). Escreva na forma do branch da tarefa (**Fonte da verdade**, SKILL.md).

O que entra no use case velho:

```typescript
private readonly validator = new AttachmentSystemFieldValidator()

private assertNoAttachments(systemFields: Array<SystemField>): void {
  const input = { systemFields }
  const validated = this.validator.validate(input)

  if (validated.success) { return }

  const [error] = validated.errors
  const { message } = error

  throw new InvalidParamError(message)
}
```

A linha que chama o `assertNoAttachments` está no fim de **Fix ou feature em código que já funciona**.

## Fix ou feature em código que já funciona

Feature que só soma (campo, JSX, ação nova, linha no barrel) não traz regra: soma as linhas e não reescreve as velhas. O resto desta seção vale quando a mudança traz regra.

A regra nova mora numa classe nova. No arquivo velho entram só três coisas:

1. a propriedade `private readonly`;
2. um método novo que monta o `input` e chama a peça;
3. a troca de **uma** linha: a que passa a chamar esse método. Numa validação, nada é trocado: entra uma linha nova (no fim desta seção).

Import não conta como linha velha. Nome que só serve a um `??` inútil não entra.

Sem trocar assinatura. O `execute` não ganha passo. A linha trocada pode morar nele: só a expressão muda, e a linha guarda a forma velha, com o `let` ou o `line +=` que ela tinha. Sem renomear, refatorar ou reformatar o vizinho. Precisa de mais que isso? É pergunta do Portão.

Depois que o dono responde `fica assim` à pergunta do exemplo (SKILL.md, Portão), o fix do provider é este. A linha velha:

```typescript
const fieldValue = formatFileText(field?.personFieldValue || '')
```

A mesma linha depois. É a única linha velha que muda. O resto do loop fica igual:

```typescript
const fieldValue = this.formatPersonField(person, fileColumn, field)
```

O que entra no arquivo velho:

```typescript
private readonly filter = new AttachmentFieldFilter()

private formatPersonField(
  person: PayrollPerson,
  column: FileColumnsData,
  field?: IPersonFieldHistory,
): string {
  const byOwner = (candidate: Person) => candidate.id === person.personId
  const owner = this.people.find(byOwner)

  const fields = owner?.fields ?? new Array<PersonField>()
  const systemFieldId = column.id
  const value = field?.personFieldValue || EMPTY_STRING

  const input = { fields, systemFieldId, value }
  const filtered = this.filter.filter(input)

  return formatFileText(filtered)
}
```

Validação (a peça confere, quem usa lança): nenhuma linha velha muda. Entra **uma** linha nova, logo antes da linha que usa o dado. O `assert*` devolve `void`. Nunca devolva o dado para encadear na linha velha.

**Errado** — o `assert*` devolve a lista e a linha velha encadeia nele:

```typescript
this.payrollTemplateSystemFields = this.assertNoAttachments(wantedSystemFields).map((field) =>
```

**Certo** — a linha nova fica acima. A linha velha de baixo fica igual, mesmo fora do padrão:

```typescript
this.assertNoAttachments(wantedSystemFields)

this.payrollTemplateSystemFields = wantedSystemFields.map((field) =>
```

## Spec ao lado

Toda peça de papel nova nasce com `<Peca>.spec.ts` ao lado dela. Escreva, não rode.

- Literais em `const` no topo. O título do `it` fica inline.
- Ids irmãos viram um objeto: `IDS.attachment`, `IDS.text`.
- Fixture também é `const` no topo, um nível por `const` (campo, grupo, categoria). Dentro do `it`, só shorthand e lista de `const`: `const categories = [personal]`. O esperado também é `const`: `const kept = [text]` e `expect(group.fields).toEqual(kept)`. Lista ou objeto não é escrito dentro do `expect`.
- Fixture parcial pode usar `as unknown as Tipo`, só na spec.
- Instância com `new`. Tipo entra com `import type`, como na peça.
- Um caso por regra: o que age, o que passa, a entrada vazia.
- O que passa traz no `input` o vizinho que a regra não pega (no filtro, o id pedido com outro tipo). Se a peça esquecer a regra, esse caso quebra.
- O que age traz a borda da regra, se ela tem: duas vezes seguidas, no começo, no fim. Se a regra mudar, um caso quebra.
- `*Map` de Prisma e tabela que estende `Map` não ganham spec.
- No front, a mesma spec roda no Jest: sem o import de `vitest`.

Arquivo `src/modules/exportations/filters/AttachmentFieldFilter.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'

import { EMPTY_STRING } from '../../../shared/constants'
import { TypeOptions } from '../../../shared/providers/systemField/SystemFieldsProvider'
import type { PersonField } from '../../persons/domain/PersonField'
import { AttachmentFieldFilter } from './AttachmentFieldFilter'

const IDS = {
  attachment: 'attachment-field',
  text: 'text-field',
}

const VALUE = 'document.pdf'

const attachment = {
  type: TypeOptions.ATTACHMENT,
  systemFieldId: IDS.attachment,
} as unknown as PersonField

const text = {
  type: TypeOptions.SHORT_TEXT,
  systemFieldId: IDS.text,
} as unknown as PersonField

describe('AttachmentFieldFilter', () => {
  const filter = new AttachmentFieldFilter()

  it('empties the value of an attachment field', () => {
    const fields = [attachment, text]
    const systemFieldId = IDS.attachment
    const value = VALUE

    const input = { fields, systemFieldId, value }
    const filtered = filter.filter(input)

    expect(filtered).toBe(EMPTY_STRING)
  })

  it('keeps the value of a field that is not an attachment', () => {
    const fields = [attachment, text]
    const systemFieldId = IDS.text
    const value = VALUE

    const input = { fields, systemFieldId, value }
    const filtered = filter.filter(input)

    expect(filtered).toBe(VALUE)
  })

  it('keeps the value when there are no fields', () => {
    const fields = new Array<PersonField>()
    const systemFieldId = IDS.attachment
    const value = VALUE

    const input = { fields, systemFieldId, value }
    const filtered = filter.filter(input)

    expect(filtered).toBe(VALUE)
  })
})
```

Use case, provider, service ou hook velho que mudou ganha um `it` novo na spec que já roda esse fluxo. O `it` segue a skill, mesmo que os vizinhos não sigam: literal e fixture em `const` no topo, ids irmãos em objeto, cada montagem numa `const`. No back, a forma é a de **Formato do spec** (arquitetura-back-dados.md). No front, a de **Hooks de view** (arquitetura-front-hooks.md). No fix do provider, o `it` vai no `ExportPayrollUseCase.spec.ts`: a folha tem a coluna do anexo, e o `people` traz o campo de anexo. O CSV sai com o nome da coluna e sem o id do documento.

## Formas recusadas

**Errado** — regra no arquivo velho: assinatura trocada, passo novo no `execute`, ternário na linha antiga, método privado com a regra:

```typescript
execute(): string {
  const attachments = this.collectAttachments()
  line += this.formatPersonFields(person, fileColumnsData, attachments)
}

const value = attachments.has(column.id) ? EMPTY_STRING : field?.personFieldValue || EMPTY_STRING
```

**Errado** — gaveta sem papel:

```typescript
export class AttachmentFieldTools {
  static readonly get = { context: (people: Array<Person>): Set<string> => { ... } }
}
```

**Errado** — truque de constructor, `from` e `apply`:

```typescript
export class AttachmentFieldFilter {
  private constructor(private readonly attachments: Set<string>) {}

  static from(people: Array<Person>): AttachmentFieldFilter { ... }

  apply(systemFieldId: string, value: string): string { ... }
}
```

**Errado** — `static`, opcional dentro da peça, sem protocolo:

```typescript
export class AttachmentFieldFilter {
  static apply(person: Person | undefined, systemFieldId: string, value: string): string {
    const attachment = person?.fields?.some(...) ?? false
  }
}
```

Antes de dizer que terminou, confira **Pronto é** no SKILL.md.

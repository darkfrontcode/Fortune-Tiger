> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Estilo de escrita

O desenho vem antes: papel, protocolo, peça nova e spec estão no [desenho.md](desenho.md). Este arquivo é o jeito de escrever cada linha.

## Sem comentário

Não comente o que o código já diz. Sem `//`. Sem bloco `/* */`. Sem JSDoc em cima de constante para explicar a regra.

Exceção rara: uma lib esquisita, ou um truque que a pessoa não entende só lendo o código. Fora isso, não comente.

## Nota global — strings e números literais

String e número soltos na lógica viram `const` no topo do arquivo. A regra, as exceções e o zero estão em [estilo-visual.md](estilo-visual.md): **Strings literais: nunca soltas no código**, **Literais numéricos: nunca soltos em comparações** e **Emptiness (`EMPTY_*`)**.

## Preferir `const` — evitar `let`

Em TypeScript/JavaScript, **sempre** declarar variáveis locais com **`const`**. **Evitar `let`** — quando o valor “muda”, preferir **novas `const`** (uma por etapa) ou **early return** em vez de reatribuir.

**Evitar** — `let` com reatribuição encadeada:

```typescript
let value = strategy.execute(input)

value = this.translate(context, value)

if (value.length === EMPTY_NUMBER) {
  value = field.value
}

return value
```

**Preferir** — uma `const` por passo; default via early return:

```typescript
const source = strategy.execute(input)
const translated = this.translate(context, source)
const empty = translated.length === EMPTY_NUMBER

if (empty) { return field.value }

return translated
```

### Regras

- **`const` por padrão** — toda variável local, parâmetro de destructuring imutável e resultado intermediário.
- Sem `let`. Nunca. Valor que muda vira nova `const` ou return cedo. Linha nova não reatribui um `let` que já existe, nem na spec velha (ver **Formato do spec**, arquitetura-back-dados.md). Linha velha trocada: **Fix ou feature em código que já funciona** ([desenho.md](desenho.md)).
- Transformações encadeadas → **`const` nomeada por etapa** (`source`, `mapped`, `filtered`, …) com nomes de domínio curtos — ver **Nomes de constantes e variáveis** (estilo-nomes.md).
- Escolher valor: `const` booleana com nome de estado + `if` de uma linha com return cedo. Ternário em `const` só escolhe entre dois valores prontos (`single ? SINGULAR : PLURAL`). Regra nova não entra num ternário da linha velha: vai para a peça nova.
- O mesmo predicado não roda duas vezes na mesma lista (`some` e depois `filter`). Filtre uma vez e confira o tamanho: `const valid = errors.length === EMPTY_NUMBER`.

## Chamada não entra dentro de outra chamada

O resultado de uma função **não** vai direto como argumento de outra. Primeiro vira `const`. A chamada de fora usa só o nome.

**Errado:**

```typescript
notification(translation(SAVE_ERROR_KEY), NotificationType.ERROR)
```

**Certo:**

```typescript
const message = translation(SAVE_ERROR_KEY)
notification(message, NotificationType.ERROR)
```

Objeto de entrada também: cada campo vira `const`, depois `const input = { ... }` só com shorthand. O exemplo e o lugar do `?.` e do `??` estão em **Quem usa a peça** ([desenho.md](desenho.md)). As exceções do shorthand estão em **Retorno de objetos: só shorthand** ([estilo-actions.md](estilo-actions.md)).

## `useState`: setter sempre `change`

No destructuring de `useState`, o segundo elemento é **`change`** — **nunca** o padrão do React `set*` (`setValues`, `setName`, `setState`, …).

**Evitar:**

```typescript
const [values, setValues] = useState(initialValues)

setValues(initialValues)
```

**Preferir:**

```typescript
const [values, change] = useState(initialValues)

change(initialValues)
```

**Um único `useState` no hook:** o par é **`value` e `change`** quando um nome de domínio não sai fácil — o estado é só “o que está guardado agora”. Não inventar verbo (`revise`, `pick`) só para parecer específico.

```typescript
const [value, change] = useState<string | null>(null)

change(id)
```

Se o nome for óbvio (`name`, `answers`, `file`), use esse nome e o setter `change`. O `value` / `change` genérico é para quando o papel do estado fica confuso.

**Dois ou mais `useState`:** aí cada estado ganha nome de domínio. Cada setter continua **`change`** só se não houver conflito no mesmo escopo; se houver, use **`change` + substantivo** (`changeName`, `changeValues`) — **nunca** prefixo `set`.

**Exceção — o hook já devolve um `change` de input:** o setter do `useState` **não** pode se chamar `change` nem `changeAnswers`. O estado fica com o nome do domínio (`answers`) e o setter ganha um **verbo do substantivo**, no mesmo espírito de `name` → `rename` — **nunca** `set` + nome.

`answers` (as respostas) → `reply` (responder).

```typescript
const [answers, reply] = useState(new Array<Answer>())

reply(replies)
```

O `change` do retorno continua sendo o `onChange` do input, irmão do estado — ver **`change` não entra em `actions`**.

## Preferir abstração de callbacks

Extrair o predicado ou transformação para uma função ou constante nomeada em vez de manter arrow functions anônimas dentro de `map`, `filter`, `reduce`, etc. — **exceto** quando o `map` só renderiza JSX trivial por item (lista de linhas/cards no componente); nesse caso, **não** extrair callback nomeado — manter inline no JSX.

**Evitar (lógica / transformação de dados):**

```typescript
const ORANGE = 'orange'
const STRAWBERRY = 'strawberry'

const fruits = [ORANGE, STRAWBERRY]
const oranges = fruits.filter(fruit => fruit === ORANGE)
```

**Preferir (lógica / transformação de dados):**

```typescript
const ORANGE = 'orange'
const STRAWBERRY = 'strawberry'

const fruits = [ORANGE, STRAWBERRY]

const byOrange = (fruit: string) => fruit === ORANGE
const oranges = fruits.filter(byOrange)
```

Predicado (`by*`): uma linha e uma condição. Mais que isso vira passos com nome: `filter(byAttachment)` → `map(toSystemFieldId)` → `includes(id)`. Sem predicado de várias linhas dentro de `some` / `find`.

Transformação (`to*`) pode ter uma `const` por passo, como `toLane` ([arquitetura-front.md](arquitetura-front.md)). Callback que monta objeto: o objeto sai só com shorthand. Campo calculado (`systemField.keyName`) vira `const` antes, num corpo em bloco. O parâmetro tem o nome do item (`systemField`), não o da chave que ele monta (`field`).

**Errado:**

```typescript
const toError = (field: SystemField) => ({ field: field.keyName, message })
```

**Certo:**

```typescript
const toError = (systemField: SystemField) => {
  const field = systemField.keyName
  const message = ATTACHMENT_SYSTEM_FIELDS_NOT_ALLOWED

  return { field, message }
}
```

**Preferir (renderização JSX trivial — não abstrair):**

```tsx
{mappings.map((mapping) => (
  <MappingItem key={mapping.id}>
    {mapping.label}
    {MAPPING_SEPARATOR}
    {mapping.code ?? NULL_CODE_FALLBACK}
  </MappingItem>
))}
```

**Evitar (callback nomeado só para montar JSX simples):**

```tsx
const toMappingPreview = (mapping: Mapping) => (
  <MappingItem key={mapping.id}>...</MappingItem>
)

{mappings.map(toMappingPreview)}
```

## JSX: não extrair blocos em `const` ou função

Em componentes React, **não** extrair trechos de JSX para `const meta = (...)` nem para função/componente interno (`renderMeta`, `toMeta`, etc.) só para reutilizar entre branches do mesmo componente.

Quando branches diferem **só** no wrapper ou em props pontuais (`upcoming`, `onClick`, `$upcoming`), manter **um único bloco** de markup no `return` e colocar a condição **onde ela muda** — seleção do componente wrapper e props extras — sem duplicar a árvore inteira.

**Evitar** — extrair JSX repetido em variável:

```tsx
const meta = (
  <Meta>
    <SourceBadge>...</SourceBadge>
    {fieldStatus.visible && <Status>{fieldStatus.label}</Status>}
  </Meta>
)

if (upcoming) {
  return (
    <StaticHeader>
      <Name $upcoming>{name}</Name>
      {meta}
    </StaticHeader>
  )
}

return (
  <Toogler onClick={actions?.toggle}>
    <Name>{name}</Name>
    {meta}
  </Toogler>
)
```

**Evitar** — duplicar o mesmo bloco inteiro em cada branch quando só wrapper/props mudam:

```tsx
if (upcoming) {
  return (
    <StaticHeader>
      <Name $upcoming>{name}</Name>
      <Meta>...</Meta>
    </StaticHeader>
  )
}

return (
  <Toogler type="button" onClick={actions?.toggle}>
    <Name>{name}</Name>
    <Meta>...</Meta>
  </Toogler>
)
```

**Preferir** — `if` no wrapper que muda e markup inline; sem variável de componente, `ElementType` ou spread de props:

```tsx
if (upcoming) {
  return (
    <StaticHeader>
      <Name $upcoming>{name}</Name>
      <Meta>...</Meta>
    </StaticHeader>
  )
}

return (
  <Toogler type={BUTTON_TYPE} onClick={actions?.toggle}>
    <Name>{name}</Name>
    <Meta>...</Meta>
  </Toogler>
)
```

- Repetir markup curto entre branches é ok quando só wrapper/props mudam — **não** compensar com `const Header`, `ElementType`, `togglerProps` ou spread condicional.
- Extrair JSX continua válido quando vira **componente filho de domínio** reutilizável entre arquivos (`MappingItem`, `StatusBadge`, etc.) — não como `const` ou helper local no mesmo arquivo.

## JSX: usar `Fragment` em vez de `<>`

Ao agrupar múltiplos nós irmãos sem wrapper semântico, **sempre** usar `<Fragment>` importado de `react` — **nunca** a sintaxe curta `<>...</>`.

**Evitar:**

```tsx
return (
  <>
    <Navigation />
    <Footer close={close} />
  </>
)
```

**Preferir:**

```tsx
import { Fragment } from 'react'

return (
  <Fragment>
    <Navigation />
    <Footer close={close} />
  </Fragment>
)
```

- Importar `Fragment` no mesmo import de `react` que já existir no arquivo (`import { Fragment, useEffect } from 'react'`).
- Usar `Fragment` com `key` quando necessário em listas (`<Fragment key={id}>`); a sintaxe curta não aceita `key`.

## `Promise.all` só quando os pedidos são independentes

Junta com `Promise.all` **só** pedidos que **não precisam** do resultado um do outro. Exemplo: ler vários modelos e, ao mesmo tempo, a lista de layouts. Um não espera o outro.

Se o segundo pedido **precisa** do que o primeiro devolveu, espera em sequência. `Promise.all` aí não faz sentido.

Cada promise vira `const` **antes** do `await`. Não coloca `Promise.all(...)` dentro de outro `Promise.all(...)`.

**Errado** — um espera o outro sem precisar, ou chamada dentro de chamada:

```typescript
const templates = await Promise.all(ids.map(readTemplate))
const layouts = await listExportLayoutsRequest()

const [templates, layouts] = await Promise.all([
  Promise.all(ids.map(readTemplate)),
  listExportLayoutsRequest(),
])
```

**Certo** — os dois começam juntos, cada um numa `const`:

```typescript
const reads = ids.map(readTemplate)
const templatesRead = Promise.all(reads)
const layoutsRead = listExportLayoutsRequest()

const [templates, layouts] = await Promise.all([
  templatesRead,
  layoutsRead,
])
```

## Nunca usar `for`

**Proibido** `for`, `for...of` e `for...in`. Lista se percorre com `map`, `filter`, `reduce` ou `find`.

Quando um passo precisa **esperar** o anterior (mandar um grupo, e só então o próximo), o `reduce` carrega a espera. Para no primeiro que falhar.

**Errado:**

```typescript
for (const group of groups) {
  const sent = await send(group)

  if (!sent) { return }
}
```

**Certo:**

```typescript
const toSent = async (chain: Promise<boolean>, group: Group) => {
  const sent = await chain

  if (!sent) { return false }

  return send(group)
}

const started = Promise.resolve(true)
const sent = await groups.reduce(toSent, started)

if (!sent) { return }
```

## Nomenclatura de callbacks em coleções

**Escopo:** prefixos `to*` e `by*` valem **somente** para callbacks passados a `map`, `filter`, `find`, `some`, `every`, `sort`, `reduce` ou ao `transform` do Zod. **Não** usar em métodos de classe nem em função solta (`const`) chamada diretamente — ver **Métodos de classe vs callbacks funcionais**.

Ao nomear funções passadas para métodos de array, usar estes prefixos conceituais:

| Método   | Padrão de nome (placeholder `Something` = domínio) | Exemplo |
|----------|-----------------------------------------------------|---------|
| `map`    | `toSomething` — transforma elemento em outro tipo/formato | `toUpperLabel`, `toDto` |
| `filter` | `bySomething` — critério de inclusão (predicado)    | `byOrange`, `byActiveUser` |
| `find` / `some` / `every` | `bySomething` — predicado | `byOwner`, `byAttachment` |
| `sort`   | `bySomething` — critério de ordenação (comparador)  | `byUpdatedAt`, `byName`, `byOrder` |
| `reduce` | `toSomething` — acumula ou reduz a um resultado final | `toTotal`, `toGroupedById` |

Ajuste `Something` ao significado real (substantivo ou frase curta em inglês ou no idioma já usado no arquivo, mantendo consistência com o projeto).

Quando o callback de `map` tiver corpo com mais de uma instrução ou montar objeto literal, **declarar `const` nomeada antes** do `.map()` (no mesmo escopo do método) e passar a referência — **nunca** arrow anônima inline.

**Evitar:**

```typescript
createOrderedOptions(options: Array<UnorderedOption>): Array<Option> {
  return options.map((option, index) => {
    const order = index

    return { ...option, order }
  })
}
```

**Preferir:**

```typescript
createOrderedOptions(options: Array<UnorderedOption>): Array<Option> {
  const toOrdering = (option: UnorderedOption, index: number): Option => {
    const order = index

    return { ...option, order }
  }

  return options.map(toOrdering)
}
```

- Nome do callback alinhado ao papel: transformação em `map` → `toSomething` (`toOrdering`, `toDto`, …).
- Dentro do callback, props do objeto retornado em `const` antes do `return` com shorthand — ver **Retorno de objetos: só shorthand**.

## Métodos de classe vs callbacks funcionais

Métodos de classe (`private`, `public`, `static`) **não** usam prefixos `to*` nem `by*` quando **não** são passadas a `map`, `filter`, `sort` ou `reduce` — esses prefixos são **exclusivos** de callbacks funcionais (ver **Nomenclatura de callbacks em coleções**).

**Evitar** — método de classe ou função solta chamada diretamente com prefixo de callback:

```typescript
private static toMappings(...): MappingDTO[] { ... }
private static toField(...): FieldDTO { ... }
private static byOrder(prev, next): number { ... }
```

**Preferir** — num `*Map` de Prisma/DTO, verbo de domínio no passo privado; `to*`/`by*` só no callback passado ao array:

```typescript
private static createMappings(options: Array<DictionaryOption>): Array<MappingDTO> {
  const toMappings = (accumulator: Array<MappingDTO>, option: DictionaryOption) => { ... }
  const mappings = new Array<MappingDTO>()

  return options.reduce(toMappings, mappings)
}

static toDTO(mappings: Array<LayoutFieldMapping>): DTO {
  const byOrder = (prev: LayoutFieldMapping, next: LayoutFieldMapping): number => { ... }
  const toFieldDTO = (field: LayoutFieldMapping) => this.createFieldDTO(field)

  const fields = mappings
    .slice()
    .sort(byOrder)
    .map(toFieldDTO)

  return { fields }
}

private static createFieldDTO(field: LayoutFieldMapping): FieldDTO { ... }
```

| Onde | Padrão | Exemplos |
|------|--------|----------|
| Peça de papel | método do protocolo ([desenho.md](desenho.md), **Verbo genérico**) | `filter`, `format`, `map` |
| Método de classe | verbo de domínio | `create`, `notify`, `collect`, `find` |
| Callback de `map` | `toSomething` | `toDto`, `toOrdering` |
| Callback de `filter` / `sort` | `bySomething` | `byActive`, `byOrder` |
| Callback de `reduce` | `toSomething` | `toTotal`, `toGroupedById` |

Passo privado do `*Map` usa verbo de domínio (`createFieldDTO`), nunca `toField` / `byOrder` como método. Onde `static` pode: **Static: só duas exceções** ([desenho.md](desenho.md)).

## Arrays: `Array<T>()` e `Array<T>`

**Tipagem:** sempre **`Array<T>`** — **nunca** `T[]` em parâmetros, retorno, props, tipos locais ou aliases.

**Inicialização vazia:** sempre **`new Array<T>()`** — **nunca** `: T[]` com literal `[]`.

**Errado:**

```typescript
const ids: string[] = []

private collectSystemFieldIds(fields: ExportLayoutFieldSchema[]): string[] {
```

**Certo:**

```typescript
const ids = new Array<string>()

private collectSystemFieldIds(fields: Array<ExportLayoutFieldSchema>): Array<string> {
```

- Mesmo padrão para qualquer elemento: `Array<ExportLayoutFieldSchema>`, `Promise<Array<SystemField>>`, etc.
- `return []` em guard clause continua permitido quando o retorno já está tipado na assinatura.

## If de uma linha (inline)

Quando o `if` tem **corpo de uma única instrução pequena** (guard clause, early return com valor, `throw`, atribuição simples, etc.), escrever **tudo na mesma linha** — **não** abrir bloco multiline.

**Errado:**

```typescript
if (fields.length === EMPTY_NUMBER) {
  return
}

if (!layout) {
  return false
}
```

**Certo:**

```typescript
if (fields.length === EMPTY_NUMBER) { return }

if (!layout) { return false }
```

**Regras:**

1. Vale para qualquer corpo com **uma** instrução que caiba legível em uma linha: `return`, `return false`, `return null`, `return []`, `throw`, atribuição simples, chamada única.
2. Vários `if` seguidos no mesmo método → **um `if` por linha**, cada um inline.
3. Se o `if` tiver **mais de uma instrução** no corpo, **ou** lógica que não caiba legível em uma linha → usar bloco multiline normal `{ ... }`.
4. Não converter `if/else` com ramificações reais em one-liner — a regra é só para corpo **único e pequeno**.
5. Linha nova segue a skill (inline), mesmo que o arquivo use `if` em várias linhas.
6. Linha velha que você não precisa mudar fica como está: não reformata, não quebra, não junta.

## Comparadores de `.sort()` com datas opcionais

Quando o comparador de `.sort()` usa campo de data **opcional** (`Date | undefined`), **não** encadear optional chaining e fallback numa única expressão de subtração — fica ilegível e difícil de depurar.

**Regras:**

1. Callback nomeado `by<Campo>` (`byUpdatedAt`, `byCreatedAt`, …) — alinhado à tabela de **Nomenclatura de callbacks em coleções**.
2. Parâmetros do comparador: `prev` e `next` (ordem nativa do `.sort()`) (exceção à regra de prefixo de estado, só aqui).
3. Extrair timestamp de cada lado em **`const` nomeadas** dentro do callback:
   - `backward` → valor de `prev`
   - `forward` → valor de `next`
4. `return forward - backward` para ordem **decrescente** (mais recente primeiro); `return backward - forward` para ascendente.
5. Optional chaining + `?? EMPTY_NUMBER` em **cada** linha de timestamp — **não** inline na subtração.

Isto vale para repositório in-memory, `*Map` de Prisma e use case. Dentro de peça de papel não há `?.`: quem chama entrega pronto.

**Evitar:**

```typescript
const byUpdatedAt = (prev: ExportLayout, next: ExportLayout) =>
  (next.updatedAt?.getTime() ?? EMPTY_NUMBER) - (prev.updatedAt?.getTime() ?? EMPTY_NUMBER)
```

**Preferir:**

```typescript
const byUpdatedAt = (prev: ExportLayout, next: ExportLayout) => {
  const backward = prev.updatedAt?.getTime() ?? EMPTY_NUMBER
  const forward = next.updatedAt?.getTime() ?? EMPTY_NUMBER

  return forward - backward
}
```

- O comparador fica **dentro** do método que chama `.sort()`. Ordenação que se repete em vários arquivos vira `*Sorter` ([desenho.md](desenho.md)).

## Prettier, lint e teste

A regra mora no SKILL.md, grupo **Escrita**. Escreva no formato certo. Não reformate o arquivo inteiro no fim.

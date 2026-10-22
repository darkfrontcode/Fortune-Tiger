> Parte da skill `formatos-de-codigo`. Leia este arquivo só quando o índice mandar.

# Estilo visual e literais

## Nunca usar `className` no JSX novo

Componente novo **não** usa `className` para pegar o CSS de um pai (`.cardInput`, `.input`, …). Cada bloco vira um styled component no `styles.ts` da pasta, com **nome do papel** (`Group`, `Line`, `Label`, `Control`).

O visual do arquivo vizinho **não** autoriza `className`. A skill manda no styled.

**Evitar:**

```tsx
<div className="cardInput">
  <h3>{label}</h3>
</div>
```

**Preferir:**

```tsx
<Line>
  <Label>{label}</Label>
</Line>
```

## Classe utilitária (Tailwind, `clsx`): composição fora da tag

Projeto que monta o visual com classe utilitária (design system com Tailwind) em vez de styled: a tag recebe **um nome**, nunca a conta. O `clsx(...)` sai da tag e vira `const` com o nome do papel, antes do `return`. A mesma condição repetida (`!bleed && A, !bleed && B`) vira **uma** `const` booleana com nome de estado, e as classes que sempre andam juntas viram **uma** constante no `data/`.

**Evitar:**

```tsx
return (
  <div className={clsx(ROOT, !bleed && SHELL, !bleed && SHELL_COLORS, className)} {...rest}>
```

**Preferir:**

```tsx
const framed = !bleed
const shell = clsx(ROOT, framed && SHELL, className)

return (
  <div className={shell} {...rest}>
```

Com `SHELL` já trazendo as cores (`data/layout.ts`), a condição aparece uma vez só.

## Styled components: nome pelo papel

No `styles.ts`, o `export` do styled é o **papel naquela tela** — de preferência **uma palavra**. A pasta e o arquivo já dizem o contexto. **Não** colar domínio, categoria ou nome do pai na frente.

**Errado:**

```typescript
export const CategoryTabs = styled(SimpleTabMenu)`
  width: 100%;
`
```

**Certo:**

```typescript
export const Tabs = styled(SimpleTabMenu)`
  width: 100%;
`
```

## Variação em styled-components: orientada ao estado

Quando um styled component muda aparência conforme um **estado visual** (ex.: texto apagado, desabilitado, ativo), a variação é **sempre orientada ao estado** — nunca ao domínio de negócio nem ao output CSS.

**Regras:**

1. **Prop transitória (`$`)** nomeada pelo **estado visual** — ex.: `$muted`, não `$upcoming`.
2. **Objeto do estado** no topo do `styles.ts` (`const muted = { is }`). Não é `namespace` do TypeScript.
3. **No template do styled**, usar `${estado.is}` — **não** ternário inline no template, **não** getters de cor (`getNameColor`, `getMutedColor`), **não** mapas genéricos `byState`/`state.regular` desconectados do estado.
4. **Dentro de `estado.is`**, ternário é permitido (e preferido quando couber) para resolver o valor/CSS do estado.
5. Tipo da prop transitória no topo do arquivo com o **mesmo nome do estado** em PascalCase (`Muted`, etc.) — **não** sufixo `Input`/`Props`.

**Evitar** — domínio na prop ou cor no nome; ternário inline no template:

```typescript
export const Name = styled.span<{ $upcoming?: boolean }>`
  color: ${({ $upcoming }) => ($upcoming ? NeutralColors.cloudy : NeutralColors.dark)};
`

const getMutedColor = ({ $muted }: Muted) => {
  if ($muted) return NeutralColors.cloudy
  return NeutralColors.dark
}

export const Name = styled.span<Muted>`
  color: ${getMutedColor};
`
```

**Preferir** — objeto do estado + `.is`:

```typescript
type Muted = {
  $muted?: boolean
}

const muted = {
  is: ({ $muted }: Muted) => (
    $muted ? NeutralColors.cloudy : NeutralColors.dark
  ),
}

export const Name = styled.span<Muted>`
  font-size: ${FontSize.body.medium};
  font-weight: ${FontWeight.semiBold};
  color: ${muted.is};
`
```

- O objeto (`muted`) descreve o **estado visual**; `.is` resolve o valor/CSS conforme a prop transitória — ternário fica **dentro** de `.is`, nunca no template do styled.
- Se o estado passar a afetar mais de uma propriedade, expandir o retorno de `muted.is` (ex.: bloco `css`) — sem renomear para getter de cor ou de componente.

## Variação em styled-components: múltiplos estados (`theme.ts`)

Quando um styled component muda aparência conforme **combinação de estados visuais** (ex.: default, inactive, selected) e cada estado altera **várias propriedades CSS de uma vez** (cursor, opacity, background, border, ícone, etc.), extrair a lógica para **`theme.ts` na pasta do componente** — extensão do `styles.ts`, **não** criar pastas `mediators/`, `data/`, `enums/` nem arquivos compartilhados só por isso.

**Estrutura:**

```text
Componente/
  Componente.tsx
  styles.ts   ← layout fixo + styled components; consome ${theme}
  theme.ts    ← ThemeProps, blocos css por estado, export theme
```

**Regras:**

1. **Um arquivo só** — `theme.ts` colado ao componente (`Blank/theme.ts`, `Template/theme.ts`). Só extrair compartilhado se os temas forem **literalmente idênticos** entre componentes irmãos.
2. **Constantes de tema** em `UPPER_SNAKE_CASE` — `DEFAULT_THEME`, `INACTIVE_THEME`, `SELECTED_THEME` — cada uma é um bloco `css` com **todo** o CSS daquele estado (incluindo filhos referenciados, ex.: `${Icon} svg path { fill: ... }`).
3. **Props transitórias** — tipo `ThemeProps` com `$selected`, `$inactive`, etc. **Nunca** prefixo `Card` nem nomes de domínio de negócio na prop visual.
4. **Função exportada `theme`** — recebe `ThemeProps`, decide o estado (`inactive` → `INACTIVE_THEME`, `selected` → `SELECTED_THEME`, senão `DEFAULT_THEME`) e **retorna o bloco `css`**. **Não** usar `themeState`, `cardState`, `themeMediator`, `resolveTheme` nem classe `IExecute`. É exceção de 'sem função solta'.
5. **`styles.ts`** — layout estrutural fixo no styled; **apenas** `${theme}` (ou equivalente único) para variar aparência. **Não** repetir `if ($inactive)` por propriedade nem bloco solto de ícone fora do tema quando o ícone depende do mesmo estado.

**Evitar** — validações por propriedade espalhadas no `styles.ts`; arquitetura de mediator/enums/mapas separados; nomes `card*`:

```typescript
const validations = {
  is: {
    cursor: ({ $inactive }) => ($inactive ? 'not-allowed' : 'pointer'),
    background: ({ $selected, $inactive }) => { ... },
  },
}

export const Container = styled.button`
  cursor: ${validations.is.cursor};
  background-color: ${validations.is.background};
  ${Icon} svg path { fill: ${validations.is.icon}; }
`
```

**Preferir** — `theme.ts` + `${theme}`:

Arquivo `theme.ts`:

```typescript
import styled, { css } from 'styled-components'

export type ThemeProps = {
  $selected?: boolean
  $inactive?: boolean
}

export const Icon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const DEFAULT_THEME = css`
  cursor: pointer;
  opacity: 1;
  background-color: ${BackgroundColors.silver};
  border-width: ${BorderWidth.extraSmall};
  border-color: ${NeutralColors.lighter};

  ${Icon} svg path {
    fill: ${NeutralColors.cloudy};
  }
`

const INACTIVE_THEME = css`...`
const SELECTED_THEME = css`...`

export const theme = ({ $selected, $inactive }: ThemeProps) => {
  if ($inactive) { return INACTIVE_THEME }

  if ($selected) { return SELECTED_THEME }

  return DEFAULT_THEME
}
```

Arquivo `styles.ts`:

```typescript
import { Icon, ThemeProps, theme } from './theme'

export { Icon }

export const Container = styled.button.attrs({ type: BUTTON_TYPE })<ThemeProps>`
  display: flex;
  ...
  ${theme}
`
```

- Prioridade de estado: **`$inactive` antes de `$selected`**, depois default — quando ambos puderem coexistir, inactive ganha.
- Para **uma única prop visual** que muda **uma** propriedade CSS, manter o padrão `{ estado: { is } }` na seção anterior — **não** criar `theme.ts`.

## Refatoração: não renomear o que já existe

Fix ou feature em código que funciona não é refatoração: **Fix ou feature em código que já funciona** ([desenho.md](desenho.md)). Esta seção vale só quando o dono pede refatoração.

Ao **refatorar**, o escopo é **só o método** (ou função) que está sendo alterado — **não** mexer em outros métodos do mesmo arquivo só para “alinhar” nomes.

Dentro desse método, se já existem nomes estáveis (variáveis locais, parâmetros, callbacks), **manter**. Pode extrair funções, reorganizar fluxo, simplificar lógica — **sem** renomear o que já estava lá só por estética ou porque o modelo prefere outra palavra.

- **Evitar** trocar `records` → `validRecords`, `context` → `result`, etc., quando a variável **já existia** no método.
- **Renomear** apenas quando for **realmente necessário** (ambiguidade grave, conflito de escopo no mesmo método).
- **Símbolos novos** criados na refatoração (ex.: tipo auxiliar, callback extraído) podem receber nome novo.

Para **código novo** (símbolos que você está **criando** agora), aplicam-se normalmente as regras desta skill (callbacks nomeados, `const` em inglês com palavras completas sem abreviar, etc.).

## Strings literais: nunca soltas no código

**Regra absoluta (TypeScript/JavaScript):** não deixar **string literal solta** no corpo do arquivo — funções, métodos, classes, blocos de lógica. **Não importa o motivo** (encoding, MIME, chave de mensagem, status, formato, sufixo de arquivo, etc.): o valor vai em **`const` no topo do arquivo**, antes das exportações.

- Nome da constante em **inglês**, **palavra(s) completa(s)**, sem abreviar — alinhado à seção **Nomes de constantes e variáveis**.
- Uma constante por valor distinto; reutilizar a mesma `const` em todo o arquivo.
- Colocar as constantes **juntas no início do arquivo** (após imports), na ordem que fizer sentido para leitura.

**Evitar:**

```typescript
const content = report.data.toString('base64')
```

**Preferir:**

```typescript
const ENCODING = 'base64'

const content = report.data.toString(ENCODING)
```

Vale também na spec: valores de teste em `const` no topo.

Isso vale para **qualquer** literal de string usada na implementação de **lógica**, não só encoding ou tradução. Exceções, só estas:

- string que faz parte de **tipo** ou de **assinatura de API externa** imutável no mesmo trecho; se repetir ou tiver significado de domínio, vira `const` no topo;
- CSS e styled-components: ver **CSS e styled-components: literais inline**;
- namespace e chave dentro do `useTranslations` (**`useTranslations`**, arquitetura-front-hooks.md);
- path da `const url` no arquivo `*Request` (**Requests de API**, arquitetura-front.md);
- título do `describe` e do `it` na spec;
- caminho do módulo no `vi.mock` e no `jest.mock`: o mock sobe para o topo do arquivo e não enxerga `const`.

## CSS e styled-components: literais inline

Em arquivos `styles.ts`, `styles.tsx` e templates de styled-components, **não** extrair para `const` no topo:

- Valores de dimensão (`28px`, `120px`, `100%`, …)
- Seletores aninhados (`.ant-input-affix-wrapper`, `& > :nth-child(3)`, …)
- Outras strings puramente visuais sem significado de domínio ou reutilização cross-file

**Preferir** — inline no template; tokens do design system quando houver:

```typescript
export const Field = styled.div`
  width: 120px;
  flex-shrink: 0;

  .ant-input-affix-wrapper {
    height: 28px;
    padding: ${SpacingLevels.nano} ${SpacingLevels.small};
    border-radius: ${BorderRadius.small};
    border-color: ${NeutralColors.lighter};
  }
`
```

**Evitar** — constantes só para valores de CSS local:

```typescript
const OVERRIDE_CODE_FIELD_WIDTH = '120px'
const OVERRIDE_INPUT_HEIGHT = '28px'
const ANT_INPUT_AFFIX_WRAPPER_CLASS = '.ant-input-affix-wrapper'

export const Field = styled.div`
  width: ${OVERRIDE_CODE_FIELD_WIDTH};

  ${ANT_INPUT_AFFIX_WRAPPER_CLASS} {
    height: ${OVERRIDE_INPUT_HEIGHT};
  }
`
```

- **Tokens** (`SpacingLevels`, `FontSize`, `BorderRadius`, `NeutralColors`, …) continuam sendo a forma preferida quando o valor já existe no design system — a exceção é para literais CSS que **não** têm token equivalente, não para “pular” tokens existentes.
- Extrair `const` de estilo **só** quando o **mesmo valor** se repete **várias vezes no mesmo arquivo** ou é compartilhado entre styled components do arquivo — e mesmo assim, preferir token do design system antes de inventar constante local.

## Nunca usar `calc()` no CSS

**Regra absoluta:** em CSS, styled-components, `styles.ts` e `styles.tsx`, **nunca** usar `calc()`. Nem com `px`, nem com `%`, nem com token do design system, nem misturado com variável.

**Preferir** — valor fixo, token, ou flex/grid que já resolve o tamanho:

```typescript
export const Panel = styled.div`
  width: 100%;
  height: 48px;
  padding: ${SpacingLevels.small};
`
```

**Evitar:**

```typescript
export const Panel = styled.div`
  width: calc(100% - 32px);
  height: calc(${SpacingLevels.medium} + 8px);
`
```

## CSS Grid: sempre com `grid-template-areas`

Sempre que usar **CSS Grid** em `styles.ts` / styled-components, o layout deve ser **explícito no template** — não depender só da ordem do DOM (auto-placement) nem de atalhos como `grid-column: 1 / -1` para largura total.

### Regras

1. **Container** — definir `display: grid`, `grid-template-columns` e **`grid-template-areas`** com o mapa completo do layout.
2. **Células** — agrupar os wrappers em um objeto **`Areas`** exportado (PascalCase); cada chave = componente da célula (`Format`, `Encoding`, …) — **sem** sufixo `Area` no identificador; o valor de `grid-area` no CSS continua igual ao nome no `grid-template-areas`.
3. **Nomes das áreas** — substantivos de **domínio** ou papel semântico (`format`, `encoding`, `fileName`), alinhados à regra **Nunca usar Row / Col** — **nunca** `row1`, `colLeft`, `fullWidth`, etc.
4. **Largura total** — repetir o mesmo nome de área na linha (`"fileName fileName"`), em vez de `grid-column: 1 / -1`.
5. **JSX** — envolver cada bloco filho em `<Areas.Format>`, `<Areas.Encoding>`, etc.; a ordem no JSX **não** precisa coincidir com a posição visual (quem manda é o template).

### Mapa visual (documentar assim ao explicar ou revisar)

```
grid-template-columns: 1fr | 1fr
grid-template-areas:
  "format     encoding"
  "headerLine extension"
  "fileName   fileName"
```

| | col 1 | col 2 |
|---|---|---|
| linha 1 | `format` | `encoding` |
| linha 2 | `headerLine` | `extension` |
| linha 3 | `fileName` (span) | `fileName` |

### Preferir

```typescript
export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "format encoding"
    "headerLine extension"
    "fileName fileName";
  gap: ${SpacingLevels.medium};
  width: 100%;
`

export const Areas = {
  Format: styled.div`
    grid-area: format;
  `,
  Encoding: styled.div`
    grid-area: encoding;
  `,
  HeaderLine: styled.div`
    grid-area: headerLine;
  `,
  Extension: styled.div`
    grid-area: extension;
  `,
  FileName: styled.div`
    grid-area: fileName;
  `,
}
```

```tsx
<Grid>
  <Areas.Format>...</Areas.Format>
  <Areas.Encoding>...</Areas.Encoding>
  <Areas.HeaderLine>...</Areas.HeaderLine>
  <Areas.Extension>...</Areas.Extension>
  <Areas.FileName>...</Areas.FileName>
</Grid>
```

### Evitar

```typescript
export const FormatArea = styled.div`
  grid-area: format;
`

export const EncodingArea = styled.div`
  grid-area: encoding;
`
```

```typescript
export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${SpacingLevels.medium};
`

export const FullWidth = styled.div`
  grid-column: 1 / -1;
`
```

A ordem do DOM define a posição: frágil.

```tsx
<Grid>
  <Format />
  <Encoding />
  ...
  <FullWidth><FileName /></FullWidth>
</Grid>
```

- **Exceção:** grid de **uma única linha ou coluna** trivial (`grid-template-columns: 1fr` sem áreas nomeadas) pode omitir `grid-template-areas` — assim que houver **2+ células com papéis distintos** ou **span de largura total**, usar o padrão acima.

## Literais numéricos: nunca soltos em comparações

**Regra absoluta (lógica TypeScript/JavaScript):** não deixar **literal numérico solto** em comparações (`===`, `!==`, `>`, `<`, `>=`, `<=`), nem em JSX condicional, ternários ou predicados — funções, hooks, métodos, classes, blocos de lógica.

- Para **zero** (lista vazia, contagem zerada, comprimento zero, `> 0` / `=== 0`): usar **`EMPTY_NUMBER`** — **nunca** criar `const EMPTY_LENGTH = 0`, `const ZERO = 0` nem equivalente local no arquivo. De onde importar e o nome por branch: **Emptiness (`EMPTY_*`)**.
- Para **outros valores** com significado de domínio: extrair `const` no **topo do arquivo**, imediatamente após os imports (`FIRST_INDEX`, `MAX_RETRIES`, …).
- Nome da constante local em **inglês**, **palavra(s) completa(s)**, sem abreviar — descreve o **significado do número** no contexto, não o valor em si (`one`, `zero`).
- Uma constante por valor distinto; reutilizar a mesma `const` ou `EMPTY_NUMBER` em todo o arquivo.
- A comparação referencia a constante importada ou local, nunca o literal inline.

**Evitar:**

```typescript
{layouts.length === 0 ? (
  <EmptyState />
) : (
  <Table layouts={layouts} />
)}
```

**Evitar** — constante local para zero:

```typescript
const EMPTY_LENGTH = 0

const empty = list.length === EMPTY_LENGTH
```

**Preferir** — `EMPTY_NUMBER` de `helpers`:

```typescript
import { EMPTY_NUMBER } from 'helpers'

const empty = list.length === EMPTY_NUMBER

{empty ? (
  <EmptyState />
) : (
  <Table layouts={layouts} />
)}
```

Quando a comparação alimenta uma constante de validação booleana, combinar com a seção **Constantes de validação (booleanas)** — nome `empty`, `disabled`, etc. (sem prefixo `is`/`has`/`can`/`should`).

**Exceções:**

- Índice dentro de callback de `map` / `reduce` (`index + 1`), desde que não seja operando de comparação.
- Valores que fazem parte de **tipo**, **enum** ou **contrato de API externa** imutável — preferir extrair para `const` no topo quando o valor se repetir ou tiver significado de domínio.
- **Valores numéricos em propriedades CSS** (`height: 28px`, `z-index: 10`, …) em styled-components — inline no template; ver **CSS e styled-components: literais inline**.

## Emptiness (`EMPTY_*`)

Valores vazios padronizados. Front: `helpers/Emptiness.ts` (pasta legada: só importe, nunca crie arquivo lá). Back: `shared/constants`. Nunca redeclare no arquivo.

| Export | Uso |
|--------|-----|
| `EMPTY_NUMBER` | Zero em comparações: `length === EMPTY_NUMBER`, `count > EMPTY_NUMBER`, validação de string vazia via `value.length > EMPTY_NUMBER` |
| `EMPTY_STRING` | String vazia |
| `EMPTY_ARRAY` | Array vazio (estado inicial tipado, defaults de request) |
| `EMPTY_OBJECT` | Objeto vazio |
| `EMPTY_FUNCTION` | No-op |
| `EMPTY_DELEGATOR` | Promise void resolvida |

**Regras:**

1. **Zero em lógica** → `EMPTY_NUMBER`, não `0`, não `const EMPTY_LENGTH = 0`, não alias local `const EMPTY = 0`.
2. **Import único:** front `from 'helpers'`, back de `shared/constants`. No back, a `main` ainda tem o nome velho `EMPTY_NUNBER`: use o nome do branch da tarefa (**Fonte da verdade**, SKILL.md). Não crie outro zero e não fuja da comparação.
3. **Comparação de tamanho/contagem:** `list.length === EMPTY_NUMBER`, `items.length > EMPTY_NUMBER`.
4. **Booleana derivada:** `const empty = listing.length === EMPTY_NUMBER` — nome sem prefixo `is`/`has`; ver **Constantes de validação (booleanas)**.
5. **Não** criar sinônimos locais (`ZERO`, `EMPTY`, `EMPTY_LENGTH`) só para evitar import — usar o export de `helpers` diretamente.

## Strings: não usar `.trim()` por hábito

- **Não** encadear `.trim()` no final de strings “por padrão” — nem em comparações (`===`, `includes`, `localeCompare`, etc.), nem ao modelar/normalizar dados, nem em qualquer pipeline só porque “pode ter espaço”.
- Usar `trim()` **somente** quando o requisito, o contrato (API/DTO) ou o ticket deixarem explícito que bordas em branco devem ser descartadas ou normalizadas.
- Em dúvida, **preservar** o valor como veio; não “higienizar” strings que o domínio não pediu.
- Espaço que a mudança do pedido deixa no começo ou no fim do texto não se decide aqui, nem com `.trim()`: é pergunta do Portão (SKILL.md).

## Encadeamento estilo builder (fluent API)

Quando houver **várias chamadas encadeadas** no mesmo expressão — por exemplo `math.chain(...).add(...).done()`, builders de query, ORMs fluent, `Promise`-chains longas, etc. — **nunca** deixar o encadeamento inteiro em **uma linha só**.

**Regra:** duas ou mais chamadas encadeadas: uma por linha, com dois espaços de recuo. Acesso a propriedade não quebra (`fields.selection.selectables.value`).

**Evitar:**

```typescript
const total = math.chain(listing.length).add(documents.length).done()
```

**Preferir:**

```typescript
const total = math
  .chain(listing.length)
  .add(documents.length)
  .done()
```

O mesmo vale para cadeias mais longas (`.divide`, `.multiply`, `.round`, etc.): **uma chamada por linha**, não inline.

**Zod:** a mesma regra, sem condição agrupada inline. O exemplo está em **Não agrupar condições do Zod** ([arquitetura-back-dados.md](arquitetura-back-dados.md)).

## Constructor: uma linha com parâmetro único

Em classes TypeScript (services, injectors, factories, use cases, etc.), quando o `constructor` declara **apenas um parâmetro** de injeção (`private readonly`), escrever **tudo em uma linha** — assinatura, `)` e corpo `{}`.

**Evitar** — quebrar parâmetro único em várias linhas:

```typescript
constructor(
  private readonly repositories: ReadSystemDictionaryRepositories,
) {}
```

**Preferir** — constructor compacto em uma linha:

```typescript
constructor(private readonly repositories: ReadSystemDictionaryRepositories) {}
```

Peça de papel não recebe dados no `constructor`: [desenho.md](desenho.md), **A peça**.

Com **dois ou mais parâmetros**, manter **um parâmetro por linha** (sempre):

```typescript
constructor(
  private readonly createProfileStageService: CreateProfileStageService,
  private readonly personRepository: IPersonRepository,
) {}
```

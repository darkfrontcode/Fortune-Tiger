---
name: comentario-explicativo
description: >-
  Insere comentários multiline em inglês para outros devs, com título, linha de
  tracinhos e descrição, sempre acima do trecho indicado. Use quando o usuário
  pedir comentário explicativo, adiciona um comentário explicativo, coloca um
  comentário explicativo na linha X, ou mencionar explicar para outros devs no
  código (placeholder, WIP, escopo do PR, finalização em PR futuro).
---

# Comentário Explicativo

Comentários **para outros devs**: contexto de PR, placeholder intencional, escopo parcial, débito consciente — não documentação de API nem JSDoc de parâmetros.

## Quando aplicar

Ativar quando o usuário pedir **comentário explicativo** (ou variações) e indicar **onde** colocar (linha, função, componente, bloco).

## Onde colocar

- **Sempre imediatamente acima** do trecho apontado (componente, função, constante, bloco JSX, etc.).
- Se o alvo for a **primeira linha** de um arquivo (import ou export), o comentário fica **no topo do arquivo**, antes de qualquer código.
- **Não** substituir comentários existentes salvo se o usuário pedir; **não** duplicar se já houver um comentário explicativo equivalente.

## Formato obrigatório

Sempre **multiline**, sempre **em inglês**, nesta estrutura:

1. **Título** — frase curta que resume o assunto (Title Case ou sentence case, consistente no arquivo).
2. **Linha de tracinhos** — mesma quantidade de caracteres `-` que o título (como no projeto).
3. **Descrição** — 2–5 linhas explicando o *porquê* para quem revisa o PR ou mantém o código.

### Preferência de sintaxe

| Contexto | Sintaxe |
|----------|---------|
| Arquivo `.ts` / `.tsx` (fora de JSX) | Bloco `/** ... */` |
| Dentro de JSX ou onde bloco não couber | Várias linhas `//` com a mesma estrutura visual |

### Template (bloco)

```typescript
/**
 * [Title in English]
 * ------------------
 * [Line 2: what this is and why it exists now.]
 * [Line 3: what is intentionally missing or deferred.]
 * [Optional line 4: where/when it will be completed.]
 */
```

### Template (linhas `//`)

```typescript
// [Title in English]
// ------------------
// [Description line 2.]
// [Description line 3.]
```

A linha de tracinhos deve ter **o mesmo comprimento** que a linha do título (contando apenas o texto do título, sem `*` ou `//`).

## Tom e conteúdo

- Escrever como dev para dev: direto, sem marketing, sem pedir desculpas.
- Explicar **intenção** e **escopo do PR**, não repetir o que o código já deixa óbvio.
- Mencionar quando algo é **placeholder**, **WIP**, **stub** ou será **finalizado em PR(s) futuro(s)** — se o contexto ou o usuário indicar.
- **Não** incluir `@param`, `@returns`, `@example` — isso é JSDoc técnico, não comentário explicativo.
- **Não** referenciar números de ticket ou issue salvo se o usuário citar explicitamente.

## Fluxo

1. Ler o trecho alvo e o contexto (PR, feature, arquivo).
2. Redigir título + tracinhos + descrição **em inglês**.
3. Inserir **acima** do trecho indicado.
4. Manter o restante do arquivo intacto (estilo, imports, formatação).

## Exemplos

### Placeholder de componente (PR parcial)

**Pedido:** “Coloca um comentário explicativo no componente Layouts — só tem H1 por enquanto.”

```tsx
/**
 * Export layouts list shell (placeholder)
 * ---------------------------------------
 * This component is intentionally minimal in this PR: only an H1 marks the
 * screen slot. Full table, filters, and actions will land in follow-up PRs.
 * Do not treat the missing UI as an oversight during review.
 */
export const Layouts = () => {
  return <h1>Layouts</h1>
}
```

### Constante / config temporária

```typescript
/**
 * Disabled admission card stages
 * ------------------------------
 * Stages in this set are inactive: omitted from computed progress and from
 * pipeline-based summaries. Task toggles for those stages are rejected while they
 * stay listed here.
 */
export const DISABLED_STAGES = new Set<StageName>()
```

### Função com comportamento não óbvio (contexto de PR)

```typescript
// State change vs empty-state fill
// --------------------------------
// Only clear the coupled city when an existing state changes to a different one.
// Filling a previously empty state must not wipe an already entered city.
export function shouldClearCoupledCityOnStateChange(...) {
```

## Anti-padrões

- Comentário em português.
- Uma única linha `//` sem título e tracinhos.
- Título sem linha de tracinhos ou tracinhos com comprimento errado.
- Comentário **abaixo** do código alvo.
- Descrever *como* o código funciona linha a linha em vez de *por que* está assim neste PR.

## Referência no repositório

Padrão canônico: `src/models/AdmissionCards/data/stagePipeline.ts` (blocos `/** Title\n * ----\n * ... */`).

---
name: layout-review
description: >-
  Compara dois prints de UI (referência vs sistema) usando círculos vermelhos como
  guia, identifica diferenças de layout/estilo e corrige o código. Use quando o
  usuário escrever "layout:review" e anexar duas imagens de tela.
---

# layout:review

Workflow para **alinhar a UI ao design de referência** sem o usuário precisar descrever verbalmente o que está errado. O usuário manda **dois prints** e circula em **vermelho** exatamente o que importa.

## Gatilho

Ativar esta skill quando a mensagem do usuário for (ou contiver):

- `layout:review`

**Pré-requisito:** a mensagem deve trazer **duas imagens**. Se faltar imagem, pedir as duas antes de alterar código.

## Convenção das imagens

| Ordem | Papel | O que o círculo vermelho indica |
|-------|-------|----------------------------------|
| **1ª imagem** (esquerda / primeiro anexo) | **Referência** — como deve ficar | O trecho do layout **desejado** |
| **2ª imagem** (direita / segundo anexo) | **Sistema atual** — como está hoje | O trecho do layout **errado** que precisa ser corrigido |

**Regra:** cada par de círculos (referência ↔ sistema) descreve **um** ajuste. Se houver vários círculos, tratar **cada um** como item separado na análise e na correção.

Se a ordem não estiver clara (só uma imagem, ordem invertida pelo usuário, etc.), **perguntar em uma frase** antes de editar.

## Fluxo (ordem obrigatória)

### 1. Ler as imagens

Para **cada** imagem:

1. Localizar **todos** os círculos/destaques vermelhos.
2. Descrever **brevemente** o que está dentro de cada círculo (elemento, texto, ícone, espaçamento, cor, alinhamento, tamanho, borda, etc.).
3. Na 1ª imagem, registrar o **estado alvo**.
4. Na 2ª imagem, registrar o **estado atual incorreto** do mesmo trecho.

Montar uma tabela mental ou escrita antes de codar:

| # | Referência (1ª) | Sistema (2ª) | Delta provável |
|---|-----------------|--------------|----------------|
| 1 | … | … | … |

### 2. Localizar no código

Prioridade para achar o componente certo:

1. Arquivos abertos / recentes na conversa (ex.: `Heading.tsx`, `styles.ts` do módulo em edição).
2. Busca por texto visível, `data-testid`, classes ou tokens citados na tela.
3. Árvore do módulo em `src/views/` ou `src/designSystem/` conforme o contexto.

Alterar **só** arquivos ligados aos trechos circulados. Não refatorar áreas fora do escopo dos círculos.

### 3. Implementar

- Preferir **`styles.ts`** (styled-components) para layout, spacing, tipografia, cores e bordas.
- Preferir **componente/hook** só quando a diferença for estrutura (ordem de nós, condicional de render, ícone errado).
- Seguir a skill **formatos-de-codigo** (styled com namespace `{ estado: { is } }`, constantes no topo, sem Row/Col genéricos, etc.).
- Reutilizar tokens/cores do design system do projeto; não inventar hex solto se já existir token equivalente.
- Escopo mínimo: a menor mudança que faz o trecho circulado bater com a referência.

### 4. Validar

Antes de declarar concluído:

- [ ] Cada círculo da referência foi endereçado na implementação.
- [ ] Nenhuma alteração extra fora dos trechos circulados (salvo dependência inevitável).
- [ ] Linter limpo nos arquivos editados (`ReadLints`).
- [ ] Se o dev server estiver rodando ou for rápido subir, mencionar que o usuário pode recarregar a tela para conferir.

## Resposta ao usuário

Estrutura sugerida (concisa, em português):

```markdown
## layout:review

**Itens identificados:** N

| # | Referência | Sistema (antes) | Correção |
|---|------------|-----------------|----------|
| 1 | … | … | … |

**Arquivos alterados:** `path/a`, `path/b`
```

Não pedir ao usuário para re-descrever o que já está nos círculos. Só perguntar se algum círculo for ambíguo ou se faltar a 2ª imagem.

## O que NÃO fazer

- Não ignorar os círculos vermelhos — eles delimitam o escopo.
- Não trocar a ordem referência/sistema (1ª = alvo, 2ª = errado).
- Não reescrever o módulo inteiro por um ajuste de padding ou cor.
- Não commitar nem abrir PR salvo pedido explícito do usuário.

## Skills relacionadas

- **formatos-de-codigo** — padrão de styled components, hooks e nomenclatura ao editar o front-end.
- **comentario-explicativo** — só se o usuário pedir comentário no código depois do ajuste.

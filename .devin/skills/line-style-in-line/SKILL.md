---
name: line-style-in-line
description: >-
  Formata construtores com um único parâmetro de injeção em uma linha
  (`constructor(private readonly x: X) {}`). Use quando o usuário escrever
  "line?style=in-line" ou pedir construtor inline / constructor em uma linha.
---

# line?style=in-line

Construtor com **um único parâmetro de injeção** → sempre **uma linha**.

## Regra

Errado:

```typescript
constructor(
  private readonly strategyFactory: ExportLineValueStrategyFactory,
) {}
```

Certo:

```typescript
constructor(private readonly strategyFactory: ExportLineValueStrategyFactory) {}
```

## Quando aplicar

- `constructor` com **exatamente um** parâmetro (injeção de dependência).
- Corpo vazio `{}` ou corpo curto que caiba na mesma linha.

## Quando NÃO quebrar para inline

- Dois ou mais parâmetros → pode ficar multi-linha.
- Corpo do construtor com lógica → corpo em linhas separadas; só a assinatura segue a regra se couber.

## Fluxo

1. Localizar construtores no escopo pedido (arquivo, seleção ou diff).
2. Converter assinaturas de parâmetro único para o formato inline.
3. Não alterar nomes, tipos nem visibilidade — só o layout.

---
name: explicar-com-exemplos
description: >-
  Ao explicar conceitos (código, libs, padrões, APIs, TypeScript, Zod, etc.),
  sempre incluir exemplos concretos. Use quando o usuário pedir explicação,
  perguntar "o que é", "como funciona", "me explica", ou qualquer dúvida
  conceitual — mesmo que a resposta seja curta.
---

# Explicar com exemplos

## Regra

Ao explicar qualquer conceito, **nunca** ficar só na teoria. Sempre incluir exemplos concretos.

## Formato

1. **1–2 frases** — o que é / como funciona
2. **Exemplos** — pelo menos um válido; incluir inválido quando ajudar a clarificar

Exemplos devem ser **do contexto atual** (arquivo aberto, lib do projeto, código citado) quando possível; senão, genéricos mas realistas.

## Tipos de exemplo por contexto

| Contexto | Exemplo mínimo |
|----------|----------------|
| Schema / validação | payload válido + inválido com erro |
| TypeScript / tipos | tipo + uso correto vs erro de compilação |
| Padrão / arquitetura | fluxo antes → depois ou caso concreto |
| API / endpoint | request/response de exemplo |
| Função / método | entrada → saída |

## Tamanho

Respeitar preferência de resposta curta do usuário (2–4 linhas na explicação), mas **exemplos não contam como textão** — podem ir em bloco de código separado.

Se o usuário pedir **"com exemplos"** ou **"detalha"**, expandir com mais casos (válido, inválido, edge case).

## Anti-padrões

- Explicar só com definição abstrata
- "É como um switch" sem mostrar o switch
- Exemplo fictício demais, desconectado do código em discussão

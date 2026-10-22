# Template — Descrição do card Testes (PT-BR, Triar)

Linguagem de produto/QA. Sem código, sem endpoint.

```markdown
## Objetivo do teste
<O que validar, 1–3 frases simples.>

## Contexto / Origem
- Issue de entrada: <KTS-XXX>
- Card de produto (KP): <KP-XXX>
- Cards relacionados: <se houver>

## Escopo
- Onde testar: <nome da tela no produto — ex.: Configurações → Layouts de exportação>
- O que cobrir: <lista de fluxos happy path>

## Fora de escopo
- Corner cases e fluxos não descritos pelo dev
- <outros itens explicitamente excluídos>

## Premissas do roteiro
- Só happy path
- Passos em linguagem simples para quem testa manualmente (Triar)
- Cada subtask = um fluxo completo observável

## Pré-condições gerais
* <perfil de acesso>
* <dados mínimos no ambiente>
* <estado inicial comum a vários cenários>

## Ambiente
<alpha / staging + como acessar — sem jargão>

## Cenários (por suite)
### <Suite 1 — contexto>
1. <ID> — <resumo uma linha>
2. <ID> — <resumo>

### <Suite 2 — contexto>
...
```

Cada item da lista vira uma subtask na Fase Jira.

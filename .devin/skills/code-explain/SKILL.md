---
name: code-explain
description: >-
  Explica trechos de código de forma simples, em português, com snippets
  encurtados e comentários inline (estilo "para criança"). Use quando o usuário
  escrever "code:explain", "code explain" ou "code:explain?" — com ou sem trecho
  colado abaixo, arquivo aberto ou seleção no cursor.
---

# code:explain

Explica **no chat** o que o código faz — **não** altera arquivos do projeto.

Diferente de `comentario-explicativo` (que insere comentários no código para outros devs), aqui a explicação é **só para o usuário entender agora**.

## Gatilho

Ativar quando a mensagem contiver:

- `code:explain`
- `code:explain?`
- `code explain`

## O que explicar

Prioridade do alvo:

1. Trecho colado **logo abaixo** do gatilho na mesma mensagem
2. Seleção / cursor no editor (se o usuário indicar)
3. Arquivo aberto ou caminho citado na mensagem
4. Se nada disso existir, pedir **uma linha** qual trecho explicar — sem textão

## Tom e idioma

- Responder em **português do Brasil**
- Linguagem simples — como se explicasse para alguém que nunca viu o arquivo
- **Pouco texto** fora dos snippets; a explicação vive nos comentários do código
- Evitar jargão; se usar termo técnico, traduzir em uma frase curta
- **Não** editar o repositório, **não** sugerir refactor, **não** abrir PR

## Formato da resposta

### 1. Visão geral (máx. 2 frases)

O que esse trecho faz no sistema, em linguagem de produto/domínio.

### 2. Passo a passo com snippets

Para **cada método, função ou bloco importante** (do mais externo ao mais interno):

1. **Título** — nome do pedaço (`getOptions`, `loadCompanyOptions`, etc.)
2. **Snippet encurtado** — só as linhas que importam; omitir imports, tipos longos e repetição com `// ...`
3. **Comentários inline** — curtos, ao lado ou acima da linha; quando ajudar, mini-exemplo no comentário

Regras dos snippets:

- Usar bloco de código com linguagem correta (`typescript`, `tsx`, etc.)
- Comentários **em português**, curtos (`// busca empresas do tenant`)
- Encurtar corpo repetitivo: um `loadXOptions` basta; os outros citar em uma linha ("igual ao de company, mas com department")
- Não colar o arquivo inteiro se tiver 100+ linhas — fatiar por método

### 3. Fluxo (opcional, só se ajudar)

Se houver encadeamento (A chama B chama C), uma linha tipo:

`getOptions → getEntityFieldOptions → loadCompanyOptions → banco`

Ou lista numerada de 3–5 passos — **sem** diagrama pesado.

### 4. Fechamento (1 frase)

Resumo do "pra que serve" no dia a dia.

## Template de snippet

```typescript
// getOptions — porta de entrada
async getOptions(tenantId, field) {
  if (field.type === 'LIST_SINGLE_VALUE') {
    return this.getSelectFieldOptions(field) // opções fixas (enum no cadastro)
  }
  if (field.type === 'ENTITY') {
    return this.getEntityFieldOptions(tenantId, field.keyName) // busca no banco
  }
  return [] // tipo que não tem opção
}
```

## Exemplo completo (referência de qualidade)

**Pedido:** `code:explain` + `SystemFieldOptionsProvider.ts`

**Resposta esperada (estrutura):**

---

Esse provider monta as opções de um campo de sistema — seja lista fixa, seja empresas/departamentos/etc. do tenant.

**`getOptions`** — decide de onde vêm as opções:

```typescript
async getOptions(tenantId, field) {
  if (field.type === LIST_SINGLE_VALUE) return this.getSelectFieldOptions(field)
  // ↑ campo com opções já cadastradas (ex.: "Sim" / "Não")

  if (field.type === ENTITY) return this.getEntityFieldOptions(tenantId, field.keyName)
  // ↑ campo que aponta pra entidade (empresa, departamento...)

  return []
}
```

**`getEntityFieldOptions`** — qual entidade buscar:

```typescript
switch (keyName) {
  case COMPANY:        return this.loadCompanyOptions(tenantId)
  case DEPARTMENT:     return this.loadDepartmentOptions(tenantId)
  // ... outros cases iguais, cada um chama seu loader
  default:             return []
}
```

**`loadCompanyOptions`** — padrão de todos os loaders:

```typescript
async loadCompanyOptions(tenantId) {
  const companies = await this.companies.list(tenantId) // 1. busca no repo

  return toOrderedOptions(
    companies
      .map(toCompanyOption)  // 2. vira { key: id, label: nome }
      .sort(byLabel),        // 3. ordena A→Z em pt-BR
  )
  // toOrderedOptions adiciona order: 0, 1, 2...
}
```

`loadDepartmentOptions`, `loadCostCenterOptions`, etc. repetem o mesmo fluxo — só mudam o repositório e o mapper.

**Helpers no topo** — transformação pura, sem async:

```typescript
const toCompanyOption = (company) => ({
  key: company.id,
  label: company.tradeName || company.legalName || '',
})
// label = o que aparece no select; key = valor salvo
```

Em resumo: recebe tenant + campo → descobre o tipo → busca dados ou usa lista fixa → devolve `{ key, label, order }[]` pro front montar o select.

---

## Anti-padrões

- Parágrafo longo sem snippet
- Snippet com 80 linhas sem cortar
- Comentários em inglês (a explicação ao usuário é PT-BR)
- JSDoc, `@param`, documentação de API
- Alterar arquivos do projeto
- Explicar linha por linha de código óbvio (`import`, `export`, getter trivial)

## Escopo estreito

Só explicar. Se o usuário pedir **corrigir**, **refatorar** ou **comentário no código**, usar outra skill ou fluxo normal — não misturar com `code:explain`.

---
name: back-end-search
description: >-
  Consulta o repositório hr-tech-backend fora do workspace do front para
  entender rotas, serviços, DTOs e regras de negócio. Ativar quando o usuário
  escrever back-end:search, back-end:search?module=..., "olha no back",
  "como é feito no backend", "verifica no back-end" ou pedir para buscar algo
  no hr-tech-backend enquanto trabalha no front.
---

# back-end:search

Consulta o **hr-tech-backend** no PC do dev enquanto o agente está no **hr-tech-frontend**.

## Caminho fixo do back-end

```
C:/Users/darkf/OneDrive/Documentos/Super Player/hr-tech-backend
```

**Sempre** usar esse caminho. Não pedir ao usuário onde fica o back.

## Gatilhos

| Formato | Exemplo |
|---------|---------|
| Comando | `back-end:search` |
| Com módulo | `back-end:search?module=exportLayouts` |
| Frases naturais | "olha no back", "como é feito no backend", "verifica no back-end", "busca no hr-tech-backend" |

## Parâmetro `module`

Formato: `back-end:search?module=<nome>`

- Nome = pasta em `src/modules/` (camelCase): `exportLayouts`, `systemDictionaries`, `payrolls`, etc.
- Sem `module`: inferir pelo contexto do front (arquivo aberto, service, hook, rota da página).
- Se ambíguo, listar candidatos e perguntar em **uma linha** qual módulo usar.

### Descobrir módulos disponíveis

```bash
ls "C:/Users/darkf/OneDrive/Documentos/Super Player/hr-tech-backend/src/modules"
```

## Mapa front → back (inferência)

| No front | Onde olhar no back |
|----------|-------------------|
| `src/services/<feature>/` | `src/modules/<feature>/` |
| Página em `src/pages/<area>/` | módulo com nome parecido |
| Hook que chama API | controller + service do módulo |
| Tipo/DTO do front | `dtos/`, `types/`, `domain/` do módulo |
| Campo do formulário | validator + DTO + prisma schema |

## Estrutura típica de um módulo

```
src/modules/<module>/
├── controllers/    ← rotas HTTP (começo da busca por endpoint)
├── services/       ← regra de negócio
├── useCases/       ← fluxos específicos
├── repositories/   ← acesso ao banco
├── dtos/           ← contratos de entrada/saída
├── mappers/        ← transformação de dados
├── validators/     ← validação
└── index.ts        ← registro de rotas do módulo
```

Schema do banco: `prisma/schema.prisma` (raiz do back).

## Fluxo (ordem obrigatória)

### 1. Definir alvo

- Extrair `module` do comando, **ou**
- Inferir pelo contexto do front, **ou**
- Perguntar qual módulo (1 linha).

### 2. Buscar no back

Usar **Shell + rg** ou **Read** com caminho absoluto. O back está **fora** do workspace — Grep/Read do projeto front **não** alcançam.

**Por endpoint ou ação:**

```bash
rg -l "CreateExportLayout" "C:/Users/darkf/OneDrive/Documentos/Super Player/hr-tech-backend/src/modules/exportLayouts"
```

**Por termo no módulo:**

```bash
rg -n "layoutType" "C:/Users/darkf/OneDrive/Documentos/Super Player/hr-tech-backend/src/modules/exportLayouts"
```

**Rotas do módulo:**

```bash
rg -n "router\." "C:/Users/darkf/OneDrive/Documentos/Super Player/hr-tech-backend/src/modules/<module>"
```

**Schema Prisma:**

```bash
rg -n "ExportLayout" "C:/Users/darkf/OneDrive/Documentos/Super Player/hr-tech-backend/prisma/schema.prisma"
```

### 3. Ler o essencial

Ordem de leitura quando a dúvida for "como funciona":

1. **Controller** — rota, método HTTP, DTO de entrada
2. **Service / UseCase** — regra de negócio
3. **DTO / Validator** — campos, tipos, obrigatoriedade
4. **Repository** — query no banco (se necessário)
5. **Prisma** — modelo da tabela (se necessário)

### 4. Responder ao usuário

- **Curto:** 2–4 linhas no máximo (regra do dev).
- Linguagem **simples**, sem jargão.
- Citar caminhos do back com link clicável quando útil.
- Se pediu comparação front/back, dizer o que bate e o que difere.

## Exemplos

**Usuário:** `back-end:search?module=exportLayouts` (com `LayoutConfigModal.tsx` aberto)

1. Entrar em `src/modules/exportLayouts/`
2. Buscar controller/service relacionado a config/settings
3. Resumir: rota, payload, campos obrigatórios

**Usuário:** "Olha no back como salva o layout"

1. Inferir módulo `exportLayouts`
2. Achar `CreateExportLayoutController` ou `UpdateExportLayoutController`
3. Responder em 2–4 linhas o fluxo de save

## O que não fazer

- Não pedir o caminho do back — já está definido acima.
- Não editar arquivos do back salvo pedido explícito do usuário.
- Não rodar servidor, migrations ou docker do back.
- Não usar Grep/Read só do workspace front para achar código do back.
- Não responder longo — resumo primeiro; detalhe só se o dev pedir.

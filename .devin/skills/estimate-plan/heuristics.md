# Heurísticas de estimativa (referência)

Usar **depois** de ler o plano e a skill **formatos-de-codigo** inteira. Não usar o repositório aberto como referência de velocidade.

## Perfil do desenvolvedor (fixo)

- Sênior, ~20 anos; hoje foco **back-end**; ainda faz front e integração quando o plano pede.
- **Builder + sweeper na hora**: monta certo desde o início (SOLID, patterns, métodos pequenos) — não entrega “IA crua”.
- **IA (Cursor / Composer)**: acelera digitação e exploração; **decisão e desenho são humanos**. Não assumir “feature pronta em um prompt”.
- Ordem habitual de feature: **front (mocks)** → **back (APIs internas, alinhado ao front)** → **integração**.

## O que encarece (retrabalho típico pós-IA)

Cada item abaixo soma tempo de **revisão, refatoração e encaixe arquitetural** — ver skill formatos-de-codigo:

| Sinal no plano | O que costuma aparecer no código |
|----------------|----------------------------------|
| Novo módulo / domínio | Pastas, DTOs em namespace, enums, requests, mappers, tools/strategies |
| Use case / rota back | IRequest explícito, guards `assert*`, validators Zod, repositório, mensagens em `data/` |
| Entidade rica | Builder fluente, mutações com verbos de domínio, maps enum extends `Map` |
| Transação | `*PrismaService` + `$transaction` |
| Hook + tela front | `actions` inline, i18n local, styled com namespace de estado; 3+ estados → `theme.ts` |
| Grid / layout complexo | `grid-template-areas` + objeto `Areas` |
| Lista / tabela / formulário grande | Vários subcomponentes, hooks de request, estados de loading/erro |
| Integração | Trocar mock, tipos alinhados, fluxos de erro, regressão visual leve |
| Testes no back | InMemory / `vi.mock`, spec por use case com regra — não só mapper |

## Contagem a partir do plano + código

1. Contar **bullets** / to-dos e **(N)** changes quando existir.
2. **CodeGraph (obrigatório):** por bullet, marcar **estender | novo | já pronto** com 1–3 paths.
3. **Changes totais** ≈ soma dos (N); se não tiver (N), usar tamanho do diff mental (estender ≈ 2–4, novo ≈ 5–8 por use case completo).
4. Classificar a **feature** S/M/L — bullets só informam, não somam dias linearmente.

### Checklist codegraph (confiança alta)

- [ ] Entidade/schema Prisma vizinho copiável (ex.: `PayrollTemplateSystemField`)
- [ ] Use cases create/update/read/list do mesmo módulo
- [ ] Fluxo async (QMR/cron) se o plano citar envio em massa
- [ ] Persistência de person fields reutilizável
- [ ] Testes/spec de referência no mesmo padrão (InMemory)

## Faixas base por fase (1 dev sênior + Composer, código no padrão formatos-de-codigo)

Valores em **dias úteis** (≈ 6–7 h produtivas/dia). Ajustar min ↓ e max ↑ com incerteza.

### Front-end

| Classe | Changes (ordem de grandeza) | Mín (dias) | Máx (dias) |
|--------|----------------------------|------------|------------|
| S | 1–4 | 0,5 | 1 |
| M | 5–12 | 1 | 2,5 |
| L | 13+ ou módulo novo | 2,5 | 5 |

### Back-end

| Classe | Changes (ordem de grandeza) | Mín (dias) | Máx (dias) |
|--------|----------------------------|------------|------------|
| S | 1–4 (ajuste, endpoint pequeno) | 0,5 | 1,5 |
| M | 5–15 (use case + repo + validator) | 1,5 | 4 |
| L | 16+ ou domínio novo / fila / cron | 3 | 8 |

### Integração

| Classe | Escopo | Mín (dias) | Máx (dias) |
|--------|--------|------------|------------|
| S | Poucas telas, API estável | 0,5 | 1 |
| M | Vários fluxos, estados de erro | 1 | 2,5 |
| L | Feature grande, E2E manual pesado | 2 | 4 |

## Agregação (feature inteira — obrigatório)

1. Somar **changes** (ou `(N)` dos bullets) → total aproximado.
2. Classificar a **entrega** uma vez: **S / M / L** (não classificar cada bullet e somar dias).
3. Escolher **um** par min/max na tabela da fase (ou interpolar entre linhas se o total de changes cair no meio).
4. Ajuste fino **±0,5 dia** no min ou max por: plano com arquivos/nomes fechados (↓ min), ou 3+ módulos tocados (↑ max **leve**, dentro do teto 1,5×).
5. Bullets no **mesmo módulo** não viram dias extras lineares — entram no mesmo bloco M/L.

## Proporção min/max (obrigatório)

| Ratio max ÷ min | Veredito |
|-----------------|----------|
| ≤ 1,4 | Ideal |
| 1,4 – 1,5 | Aceitável |
| > 1,5 | **Erro de método** — refazer agregação |

Exemplos ruins: 6 vs 12 dias (2×), 4 vs 10 (2,5×). Exemplo bom: 8 vs 11 (~1,4×).

## Buffer obrigatório

Aplicar **no par já agregado**, **no máximo um** dos itens abaixo (não acumular todos):

- **+0,5 dia no máximo** se o plano for vago ou área desconhecida.
- **+0,5 dia no máximo** se fila/cron/async/multi-tenant não estiver detalhado no plano.
- **−0,5 dia no mínimo** se checklist com paths e entidades explícitos.

Depois do buffer, **revalidar** ratio max ÷ min ≤ 1,5.

## Anti-padrões de estimativa

- Não prometer prazo de “só IA” nem de júnior copiando tutorial.
- Não usar velocidade do repo atual como baseline.
- Não dar min = max.
- **Não** somar colunas “Mín” e “Máx” de cada bullet — gera faixa falsa (mín baixo, máx altíssimo).
- **Não** tratar máximo como “pior caso dobrado” — só margem de atrito real.
- Não ignorar testes/back quando o plano citar spec ou CI.

# Exploração com Playwright (read-only)

## Regra dura
**Apenas navegação read-only.** Nunca submeter formulários, salvar, excluir, enviar, fechar folha, ou qualquer ação que altere dados. Em botões/ações que mutam estado: inspecionar (abrir o modal, ler labels/validações) **sem confirmar**.

**Objetivo:** confirmar o happy path que o dev já descreveu (nomes de botões, ordem das telas) — **não** inventar cenários novos nem caçar edge cases.

## Reuso de sessão (login persistente)

Há duas camadas distintas — não confundir:

### Configuração do servidor MCP (uma vez, por quem configura o `.mcp.json`)
O agente **não** controla isso em runtime; são flags de inicialização do `@playwright/mcp` (v0.0.75):
- **Recomendado:** `--user-data-dir=C:\\Users\\darkf\\.cursor\\skills\\create-test-card\\.auth\\profile` — perfil persistente em disco; o login sobrevive entre execuções. (`.auth/.gitignore` já ignora o conteúdo.)
- **Alternativa (sessão isolada):** `--storage-state=C:\\Users\\darkf\\.cursor\\skills\\create-test-card\\.auth\\storageState.json`.
- **Não usar `--isolated`** — mantém o perfil só em memória e descarta o login ao fechar.

### Em runtime (o que o agente faz)
O agente apenas navega com as tools expostas; **não consegue mudar as flags do servidor no meio da execução**.
- **Se cair na tela de login** (primeira vez ou sessão expirada): **pausar e pedir ao dev para logar manualmente** no navegador aberto; depois seguir a exploração. Com perfil persistente configurado, o login fica salvo para as próximas vezes.
- Se o servidor estiver em modo `--isolated` (sem persistência), o login será pedido a cada execução — avisar o dev e seguir mesmo assim.
- Nenhuma senha é salva no repositório — apenas cookies/sessão no perfil (coberto pelo `.auth/.gitignore`).

## Tools do Playwright MCP (nomes canônicos)
`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_take_screenshot`, `browser_wait_for`, `browser_hover`, `browser_select_option`, `browser_press_key`.
> Confirmar os nomes exatos disponíveis na sessão via ToolSearch (keyword `playwright` ou `browser`) antes do primeiro uso — variam pouco entre versões.

## Passos de exploração
1. Navegar até a URL informada (`browser_navigate`).
2. Se tela de login → fluxo de login manual acima.
3. Capturar a estrutura da página (`browser_snapshot`) e screenshot (`browser_take_screenshot`) como evidência.
4. Mapear, para a(s) funcionalidade(s) alvo:
   - Campos de entrada, validações visíveis, formatos.
   - Filtros, busca, ordenação, paginação (page sizes, navegação entre páginas).
   - Ações/botões e os modais que abrem (sem confirmar).
   - Estados: vazio, carregando (skeleton/spinner), erro, sucesso.
   - Permissões/elementos condicionais visíveis.
   - Layout/responsividade relevante (ex.: coluna/linha fixa no scroll).
5. Cruzar o observado com o **plano colaborativo** e a doc (entrada + KP) → ajustar resumos existentes se necessário.

## Saída
Notas de confirmação para o plano (labels reais, passos visíveis). Novo ID de cenário **só** se o dev validar. Não listar edge cases “por precaução”.

# Plano colaborativo (antes do Jira)

Fase obrigatória quando o dev quer mapear cenários **com calma**, antes de criar card no Jira.

## Objetivo

Montar um **plano vivo** (.plan.md ou equivalente) com o dev: ele fala os fluxos em linguagem natural; o agente registra **resumos curtos** com ID. Só depois de tudo mapeado + OK explícito → expandir em roteiro completo → criar no Jira.

## Premissas (sempre)

1. **Só happy path.** Cenários vêm do que o dev descreveu + o que dá pra ver no fluxo real. Sem corner case, sem “e se acontecer X”. Se não está no fluxo, não entra.
2. **Linguagem humana, zero técnica.** Quem lê e executa é **Triar** / negócio / QA — pode cair de paraquedas. Baby steps curtos. Sem endpoint, sem nome de arquivo, sem jargão de dev.
3. **Organizar por contexto.** Agrupar em **suites** (ex.: aba Ativos, wizard, integração com outra tela). Cada suite = um bloco de uso real.

## Como registrar no plano (fase de resumos)

Para cada fluxo que o dev descrever:

1. Criar ou usar uma **suite** (nome = onde a pessoa está na tela / qual fluxo).
2. Atribuir **ID** curto e estável (ex.: `L-A01`, `AD-I03`).
3. Escrever **uma linha** de resumo — o que a pessoa faz e o que espera ver. Sem passo a passo ainda.
4. Marcar status `registrado` / `pendente input do dev`.

Investigação no código ou Playwright **só para confirmar** o que o dev disse (ex.: botão desabilitado sem seleção). Referência técnica fica num bloco **“referência interna (dev)”** no plano — **nunca** no texto que vai pro Jira.

## Quando o dev manda mais fluxos

- **Iterar o plano**, não criar card no Jira.
- Não inventar cenários extras “por precaução”.
- Se faltar info, perguntar — não chutar.

## Quando expandir (fase final)

Só após:

- Todas as suites que o dev quer cobrir estão mapeadas; **ou**
- Dev pede explicitamente para expandir / criar no Jira.

Para cada ID:

1. Abrir skill **roteiros-de-teste** e seguir o formato (`Descrição:`, `Pré-condição:`, `Procedimento:`, `Resultado Esperado:`).
2. **Procedimento:** passos numerados ou bullets — **um passo = uma ação** na tela.
3. Nomes de botões/menus iguais aos da interface, em **negrito**.
4. Apresentar rascunho ao dev → **OK explícito** → aí sim Fase Jira.

## Estrutura sugerida do plano

```markdown
# Roteiro QA — <feature>

## Premissas
(happy path + linguagem Triar)

## Suite N — <contexto>
### Pré-condições da suite (linguagem simples)
| ID | Resumo | Status |
|----|--------|--------|

### Referência interna (dev — não vai pro Jira)
(bullets técnicos opcionais)

## Fluxo de trabalho
1. Dev passa cenários → registrar resumo + ID
2. Suites completas → expandir cada ID
3. OK explícito → card Testes + subtasks no Jira
```

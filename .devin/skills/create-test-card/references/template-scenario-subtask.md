# Template — Subtask de cenário (PT-BR, Triar)

**Título:** `[Cenário] <o que a pessoa faz — frase curta>`

**Descrição** (seguir skill **roteiros-de-teste** — zero técnica, baby steps):

```markdown
Descrição:
<1–3 linhas: o que este teste verifica, em linguagem de produto>

Pré-condição:
* <quem pode testar — ex.: Administrador>
* <estado inicial — ex.: existe layout ativo>
* <dado necessário — sem URL, sem nome de arquivo>

Procedimento:
* <passo 1 — uma ação só>
* <passo 2>
* <passo 3 — confirmar com botão em bullet próprio quando for ação final>

Resultado Esperado:
<1–3 linhas: o que a pessoa vê ou conclui ao terminar — comportamento visível, não string literal da UI>
```

## Regras

- **Happy path only** — um cenário = um fluxo que o dev confirmou.
- **Um bullet = uma ação** na tela (abrir modal, marcar checkbox, clicar **Continuar**).
- Nomes de menu/botão/aba iguais à interface, em **negrito**.
- Sem endpoint, API, hook, locale, payload, nome de componente.
- Não incluir seção “Observações” com edge cases — se não entrou no plano, não entra aqui.

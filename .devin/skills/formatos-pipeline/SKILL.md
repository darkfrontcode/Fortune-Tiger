---
name: formatos-pipeline
description: >-
  Pipeline em fases da skill formatos-de-codigo. Depois de escrever código,
  rode o scan nos arquivos criados e nas linhas que você escreveu nos
  arquivos velhos, antes de dizer que terminou. Quando o gancho devolver uma
  fase (nomes, mapas, escrita, actions, tipos), corrigir só as linhas
  listadas que você escreveu e só o capítulo indicado. Usar quando o
  follow-up falar em Fase, ou quando o usuário pedir o pipeline de formatos.
---

# Pipeline de formatos

A skill `formatos-de-codigo` manda. Olhe ela antes do projeto. O projeto só diz o que existe (o model, o protocolo, a linha velha). A forma vem da skill. O projeto nunca ganha da skill.

O gancho procura erro de texto. Cada parada é uma fase. Não leia o livro inteiro.

Os capítulos ficam em `~/.claude/skills/formatos-de-codigo/`. O scan fica em `~/.claude/skills/formatos-pipeline/scan/` (`scan.js` e `phases/`). Nada disso depende da pasta `~/.cursor`: a cópia que existe lá é velha. Não leia nem rode.

## Depois de escrever

Rodar o scan faz parte de escrever. Não espera o gancho de parada. A lista dele pode estar vazia e ele sai sem olhar.

**Errado** — leu a skill, escreveu, disse que terminou:

```text
li os capítulos, alterei os arquivos, pronto
```

**Certo** — rode o scan no que você escreveu. Use o Bash (no Windows, o Git Bash) e `node -e`. Nada é salvo: o script e o código vão no comando. Não salve script dentro do repositório.

| O que você escreveu | Como rodar |
| --- | --- |
| Arquivo novo, já salvo (peça, spec, protocolo) | Script 1, com o caminho do arquivo |
| Linhas novas num arquivo velho (propriedade, método novo, linha trocada, `it` novo, linha do `index.ts`) | Script 2, só com as suas linhas |
| Código que só está na resposta, sem arquivo | Script 2, com o código inteiro |

O scan para na primeira fase que acha algo. No arquivo velho, a linha velha acusada esconde as suas linhas das fases seguintes. Por isso o arquivo velho passa pelo script 2, só com o que você escreveu.

O script 1 pula caminho que não existe e diz `limpo` sem olhar nada. Confira o caminho.

No Windows, comando com mais de uns 7 mil caracteres quebra com `unexpected EOF while looking for matching`. Código grande vai em partes, uma chamada por parte.

Script 1, arquivos salvos. Um caminho absoluto por argumento:

```bash
node -e '
const os = require("os")
const path = require("path")

const HOOK = ".claude/skills/formatos-pipeline/scan/scan"
const CLEAN = "limpo"
const FIRST = 1
const NEXT = 1

const home = os.homedir()
const scan = path.join(home, HOOK)
const { firstPhase, message, phases } = require(scan)

const files = process.argv.slice(FIRST)
const report = firstPhase(files)
const found = Boolean(report.phase)

if (!found) { console.log(CLEAN) }

if (found) {
  const byPhase = (phase) => phase.id === report.phase.id
  const position = phases.findIndex(byPhase)
  const order = position + NEXT
  const text = message(report.phase, report.findings, order)

  console.log(text)
}
' "C:/caminho/absoluto/da/Peca.ts" "C:/caminho/absoluto/da/Peca.spec.ts"
```

Script 2, código pelo stdin. Entre as duas linhas `CODE` vão só as linhas que você escreveu. O argumento é o caminho final do arquivo, mesmo que ele ainda não exista: algumas fases olham a pasta (`mappers/`). A linha acusada é contada no trecho que você mandou.

```bash
node -e '
const fs = require("fs")
const os = require("os")
const path = require("path")

const HOOK = ".claude/skills/formatos-pipeline/scan/scan"
const CLEAN = "limpo"
const BREAK = "\n"
const STDIN = 0
const FILE = 1
const NEXT = 1

const home = os.homedir()
const scan = path.join(home, HOOK)
const { message, phases } = require(scan)

const file = process.argv[FILE]
const code = fs.readFileSync(STDIN, "utf8")
const lines = code.split(BREAK)

const toReport = (phase) => {
  const toFindings = (content, index) => {
    const line = index + NEXT
    const toHint = (check) => check(content, file)
    const byHint = (hint) => Boolean(hint)
    const toFinding = (hint) => ({ file, line, hint })

    return phase.checks
      .map(toHint)
      .filter(byHint)
      .map(toFinding)
  }

  const findings = lines.flatMap(toFindings)

  return { phase, findings }
}

const byFound = (report) => Boolean(report.findings.length)

const reports = phases.map(toReport)
const report = reports.find(byFound)

if (!report) { console.log(CLEAN) }

if (report) {
  const position = reports.indexOf(report)
  const order = position + NEXT
  const text = message(report.phase, report.findings, order)

  console.log(text)
}
' "C:/caminho/absoluto/do/CreatePayrollTemplateUseCase.ts" <<'CODE'
private readonly validator = new AttachmentSystemFieldValidator()
this.assertNoAttachments(wantedSystemFields)
CODE
```

Voltou fase? Corrija só as linhas que você escreveu, só dessa fase, e rode de novo.

Não rodou o scan? A primeira linha da resposta diz: Não terminei, falta o scan. Resposta que para na pergunta do Portão não tem código: não leva essa frase.

## Scan limpo não é pronto

O gancho não enxerga forma. Ele não vê `static`, protocolo, spec faltando, opcional dentro da peça nem assinatura trocada. Antes de dizer que terminou, confira a lista **Pronto é** do SKILL.md da `formatos-de-codigo`. Faltou um item? Não terminou.

## Quando o gancho falar

1. Abra o capítulo que a mensagem cita. Ele fica em `~/.claude/skills/formatos-de-codigo/`.
2. Corrija só as linhas listadas que você escreveu. A mensagem diz "Corrija só estas linhas", mas linha velha fica como está: não renomeie o vizinho. Todas são velhas? Diga isso numa linha e pare.
3. Não reescreva o arquivo.
4. Não arrume regra de outra fase.
5. Pare. O gancho chama a próxima fase.

Ordem: nomes, mapas, escrita, actions, tipos.

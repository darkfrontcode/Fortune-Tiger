---
name: branch-bugfix
description: >-
  Só cria o par de branches de correção de bug no padrão do time: <CHAVE>/fix/<slug> a partir de
  staging (valida na alfa) e <CHAVE>/hotfix/<slug> a partir de main (vai para produção), e deixa o
  repositório na fix. Não commita, não faz push, não abre PR. Use quando o usuário escrever
  "branch:bugfix", "branch:bugfix?repo=front|back|ambos" ou pedir para criar as branches de
  fix/hotfix de um card (CSBUG, KTS, KPQA...).
---

# branch:bugfix

Prepara as branches antes de começar o fix. Só isso: o código, o commit e os PRs vêm depois, fora
desta skill.

Fluxo do time: corrige na `fix` (base staging) e valida na alfa; depois as mesmas correções vão
para a `hotfix` (base main) e seguem para produção.

## Entrada

- **Chave do card**: do card da conversa (`task:analyze`) ou do usuário, ex.: `CSBUG-75`. Sem chave,
  pergunte.
- **repo**: `front` (`hr-tech-frontend`), `back` (`hr-tech-backend`) ou `ambos`. Sem parâmetro, use o
  repositório onde o fix vai acontecer pelo contexto da conversa; se não der para saber, pergunte.
- **slug**: 2 a 6 palavras em inglês, kebab-case, dizendo o que o fix faz (ex.:
  `payroll-export-attachment-fields`). Derive do card/da análise.

Repositórios: `C:\Users\darkf\OneDrive\Documentos\Super Player\hr-tech-frontend` e
`C:\Users\darkf\OneDrive\Documentos\Super Player\hr-tech-backend`.

## Branches

| Branch | Base | Para quê |
| --- | --- | --- |
| `<CHAVE>/fix/<slug>` | `origin/staging` | o fix é feito aqui e validado na alfa |
| `<CHAVE>/hotfix/<slug>` | `origin/main` | recebe as mesmas correções para produção |

## Passos (por repositório)

1. `git status --porcelain`. Se houver alteração pendente, **pare** e avise (sem stash, sem descartar).
2. `git fetch origin --prune`.
3. Se alguma das duas branches já existir (local ou remota), **pare** e avise; não sobrescreva.
4. `git branch --no-track <CHAVE>/hotfix/<slug> origin/main` (só cria, sem trocar para ela).
5. `git checkout --no-track -b <CHAVE>/fix/<slug> origin/staging` (o repositório fica nela).

O `--no-track` impede que a branch nova fique rastreando `staging`/`main`; o upstream certo nasce
no primeiro push, pelo `commit:up`.

## Proibido

- Commit, push, PR, `reset --hard`, `--force` ou apagar branch.
- Criar a `fix` a partir de main ou a `hotfix` a partir de staging.

## Resposta

Uma linha por repositório: as duas branches criadas e que o repositório está na `fix`.

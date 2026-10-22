---
name: clean-work-environment
description: >-
  Deixa o ambiente de trabalho limpo: no hr-tech-frontend e no hr-tech-backend, troca para a
  branch staging e sincroniza com o remoto (origin/staging). Use quando o usuário escrever
  "env:clean", "clean environment", "clean work environment", "limpa o ambiente" ou pedir para
  jogar front e back para staging e sincronizar antes de começar um trabalho novo.
---

# env:clean

Prepara os dois repositórios para começar uma tarefa nova, parados em `staging` e iguais ao remoto.

## Repositórios

- `C:\Users\darkf\OneDrive\Documentos\Super Player\hr-tech-frontend`
- `C:\Users\darkf\OneDrive\Documentos\Super Player\hr-tech-backend`

## Passos (para cada repositório)

1. `git status --porcelain`. Se houver qualquer alteração (modificada, staged ou arquivo novo não
   ignorado), **pare esse repositório**: não faça stash, não descarte nada. Liste os arquivos e
   avise o usuário.
2. `git fetch origin --prune`
3. `git checkout staging`
4. `git pull --ff-only origin staging`. Se falhar porque a `staging` local tem commits que não estão
   no remoto (divergiu), **pare** e avise. Nunca use `reset --hard`, `push` ou `--force`.
5. Confira com `git status -sb` que está em `staging...origin/staging` sem ahead/behind.

Um repositório parado não impede o outro: rode os dois e reporte cada um.

## Proibido

- Descartar alterações (`reset --hard`, `checkout -- .`, `clean -fd`) ou fazer stash por conta própria.
- Fazer push, apagar branches ou mexer em qualquer branch que não seja `staging`.

## Resposta

Curta, uma linha por repositório: `front: staging ok (último commit <hash curto> <assunto>)` ou o
motivo de ter parado e os arquivos pendentes.

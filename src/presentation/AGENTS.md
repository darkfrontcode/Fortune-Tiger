# Presentation

Controllers, input validation, and HTTP status. It does not debit a balance.

There is no `shared` folder and no `protocols` folder here. A plug-in contract lives in `application/protocols`. The balance rule does not move into this layer.

Each folder has an English `spec.md`. The code follows that spec. A thin controller. The file is `{name}.controller.ts`. The balance rule does not enter here. Small files. `index.ts` reexports the folder with `export *` when the code lands.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `http` — wallet and wager routes, status, auth. Subfolders: `bodies/`, `controllers/`, `data/`, `filters/`, `guards/`, `mappers/`, `maps/`, `providers/`, `queries/`, `statuses/`, and `tests/`.
- `health` — liveness and readiness, open

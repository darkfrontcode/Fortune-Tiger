# Observability data

`metric-names.data.ts` holds `metricNames`, the stable name of every metric this application records.

A caller imports the folder and uses a key, never a loose literal. A name is written once here and read by the use case, the consumer, the writer, and the adapter. A counter ends with `_total`; an observation of milliseconds ends with `milliseconds`. The help text of each name lives in `../maps/metric-description.map.ts`.

`index.ts` reexports the file with `export *`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.

# Observability maps

A map is a class that extends `Map`, one file per table, reexported by `index.ts`.

`MetricDescriptionMap` keeps the help text a Prometheus scrape shows for each name. The key is a name from `../data`, so the table and the call sites read the same `const`. The Prometheus adapter holds one instance and answers the help of a name; a name without a row answers the name itself.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.

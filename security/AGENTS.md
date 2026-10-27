# AGENTS

The security folder is test support, not an application layer. It holds the DAST plans, the red-team script documentation, and the `security/spec.md` that binds this deliverable. It carries no business rule and no production behavior.

`zap.yaml` is the passive plan and the pipeline default. `zap-active.yaml` is the local-only active plan. `reports/` holds the generated HTML, ignored by git. `spec.md` is the deliverable spec: what is in and out, the scenarios, and the acceptance criteria.

The workflow `.github/workflows/security.yml` is the only consumer of the passive plan; `bun run security:zap` runs the same plan locally. Both target the app that is running on the host, reached by ZAP through `host.docker.internal`.

All project text is English, including this file. Every command an operator needs is in `security/README.md`.

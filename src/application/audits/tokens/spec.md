# Audit tokens

`audit.store.token.ts` holds one `Symbol`, `AUDIT_STORE`, the injection token of `AuditStoreProtocol`.

The owning capability is `application/audits`, because the use case and the audit consumer both consume the port. `AuditStoreModule` binds the token to `AuditEventRepository` with `useExisting`, and the consumer injects only the token.

`tokens/index.ts` reexports the token with `export *`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.

# Audit protocols

`audit.store.protocol.ts` holds `AuditStoreProtocol`, the port the application uses for the audit store. It carries no runtime value.

```ts
interface AuditStoreProtocol {
  record(event: AuditType.Event): Promise<AuditOutcome>
  timeline(query: AuditType.Query): Promise<Array<AuditType.Event>>
}
```

`record` writes one event and answers `PERSISTED` or `DUPLICATE`. A duplicate `eventId` is a successful duplicate delivery. Any other error leaves the method as an error, so the consumer retries.

`timeline` reads the events that match `Query`, ordered by `occurredAt` and then by `eventId`, limited by `query.limit`. The adapter owns the MongoDB filter and the indexes.

`AUDIT_STORE` is the token, declared in `tokens/`. The adapter binds it with `useExisting`, so one instance answers to both names.

`protocols/index.ts` reexports the protocol with `export *`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.

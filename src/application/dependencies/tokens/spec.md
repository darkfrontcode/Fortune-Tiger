# Dependency Tokens

`CLOCK`, `LOGGER`, and `METRIC` are application-wide injection tokens for cross-cutting protocols. Each is a separate `Symbol` declared in its own file.

`index.ts` reexports the tokens with `export *`.

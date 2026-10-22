# Dependencies

This folder owns application-wide injection tokens for contracts shared across contexts, including the clock, logger, and metric.

Each token has its own file in `tokens/`. The token barrel reexports them with `export *`. Context-specific tokens stay in the `tokens/` folder of their owning context.

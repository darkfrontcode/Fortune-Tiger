# Protocols

A plug-in contract. The folder is `protocols`, inside `infrastructure`. The file role is `protocol`. The type name ends with `Protocol`.

`TheoryProtocol` carries the parameters of a case and the expected boolean. The test reads `params`, produces the actual boolean, and compares it with `expected`. A case may also carry a `title` and a `description`. The description uses `WHEN` and `SHOULD`.

This is not a wager rule, so it does not sit in `domain`. It is not HTTP, so it does not sit in `presentation`. A folder named `shared` or `utils` does not hold it.

All project text is English, including the root `README.md`.

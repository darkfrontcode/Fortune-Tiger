# Enums

`journey-stage.enum.ts` holds `JourneyStage`: `ROUTE`, `USE_CASE`, `DATABASE`, and `QUEUE`. The value is the name, so a stored step reads the same as the source.

`journey-outcome.enum.ts` holds `JourneyOutcome`: `SUCCEEDED`, `FAILED`, and `ROLLBACK`. There is no `STARTED`: a step is written when its stage settles, so the outcome is always known.

`index.ts` reexports both with `export *`.

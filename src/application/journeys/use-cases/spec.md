# Use cases

`find-journey.use-case.ts` holds `FindJourneyUseCase`. `execute` receives `JourneyType.TimelineInput` and returns `JourneyType.Timeline` with `{ items }`.

The provider scope always arrives from the caller. The presentation derives it from the authenticated provider, so a provider never reads another provider's journey.

`flowId` reads one aggregate, `playerId` reads one caller across many requests, and the two may be combined. `stage` and `outcome` narrow the story, and `from`/`to` bound `occurredAt`.

`limit` defaults to 50, a value below 1 becomes 1, and a value above 100 becomes 100.

An empty result is valid: a wager that never left PostgreSQL has no journey in MongoDB yet.

The use case does not build a document, does not know Mongoose, and does not join the timeline with PostgreSQL. It reads the steps the recorder wrote.

`index.ts` reexports the class with `export *`.

# Interceptors

`interceptors/journey.interceptor.ts` holds `JourneyInterceptor`, the HTTP cross-cutting recorder that writes one `ROUTE` step per request into the journey store.

The interceptor reads `request.flowId` when a controller route sets it (the wager submit route uses the `Idempotency-Key`, the wallet open route uses `opening:{walletId}`). A route that does not set it receives `read:{uuidv7}` as the `flowId`, so a read and a write never share a flow by accident.

For each request it records a `ROUTE` step with `SUCCEEDED` after the handler resolves and `FAILED` when the handler throws. The recording is fire-and-forget through `JourneyService.record`, which never throws, so a route is not delayed or rolled back by the journey store.

The interceptor is `@Injectable()` and receives `JourneyService` by class and `CLOCK` by token. The `HttpModule` provides it, and both controllers use it with `@UseInterceptors(JourneyInterceptor)`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.

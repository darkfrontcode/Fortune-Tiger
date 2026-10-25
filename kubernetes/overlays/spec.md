# Overlays

Two overlays sit on top of `base/`.

`local/` is the delivery: it patches the `api` Service into a `NodePort` on `30080` and nothing else. It is what `bun run cluster:up` applies.

`observability/` builds on `local/` and adds Prometheus and Grafana on `30090` and `30030`, the DNS discovery over `api-headless`, and the ConfigMaps generated from `docker/grafana`. It is applied by `bun run cluster:observability`, after `cluster:up`.

An overlay carries no business rule and no second copy of a manifest. A change to the application shape belongs to `base/`; a change to where it is reachable belongs to an overlay. The whole picture is in [`../spec.md`](../spec.md).

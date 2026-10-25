# Overlays

Two overlays sit on top of `base/`.

`local/` is the delivery: it patches the `api` Service into a `NodePort` on `30080` and nothing else. It is what `bun run cluster:up` applies.

`observability/` builds on `local/` and adds Prometheus, Grafana, and Alertmanager on `30090`, `30030`, and `30093`, the DNS discovery over `api-headless`, and the ConfigMaps generated from `docker/alerting` and `docker/grafana`. It is applied by `bun run cluster:observability`, after `cluster:up`.

`observability/` also carries the alert set: `alertmanager/` runs `alertmanager`, the `prometheus-rules` ConfigMap carries the alert rules, and the `alertmanager-config` ConfigMap routes them to the `email` receiver addressed to `darkfrontcode@gmail.com`. The SMTP password mounts from the `alertmanager-smtp` Secret, which the operator fills before relying on email delivery.

An overlay carries no business rule and no second copy of a manifest. A change to the application shape belongs to `base/`; a change to where it is reachable belongs to an overlay. The whole picture is in [`../spec.md`](../spec.md).

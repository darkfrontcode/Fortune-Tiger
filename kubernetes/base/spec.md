# Base

`base/` holds what every overlay shares: the namespace, the demo secret, the API and PostgreSQL ConfigMaps, the primary and standby statefulsets with their headless services, LocalStack, Mongo, Redis, the migration Job, the API Deployment, its services, and its PodDisruptionBudget.

`kustomization.yaml` lists the resources and sets the namespace, so an object does not repeat `fortune-tiger` in its own metadata. It also generates the LocalStack ready ConfigMap from `docker/localstack/01-queues.sh`, which keeps one queue bootstrap for compose and for the cluster.

The base is never applied alone. The API image tag is `fortune-tiger:local`, the same tag `cluster:up` builds and loads, and the node port belongs to the `local` overlay.

What each workload does is in [`../spec.md`](../spec.md).

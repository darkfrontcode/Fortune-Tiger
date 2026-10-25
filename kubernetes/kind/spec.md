# Cluster

`cluster.yaml` is the whole cluster description: one control plane and two workers on `kindest/node:v1.32.0`. The image is pinned, so a run does not drift to a newer Kubernetes, and it boots on a host with cgroup v1 or v2.

The control plane keeps its `node-role.kubernetes.io/control-plane:NoSchedule` taint, so no application pod lands on it. The two workers carry every workload, which is what lets the API replicas and the database pair split across machines.

The control plane publishes three host ports, and only those: `30080` for the API, `30090` for Prometheus, and `30030` for Grafana. `scripts/cluster.ts` reads the cluster name `fortune-tiger` from here in practice, because it is the same constant.

The topology is in [`../spec.md`](../spec.md). This file only decides what a node is.

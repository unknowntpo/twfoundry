# M5 Batch Stack Runbook

This runbook is for a non-sandboxed human. Codex must not run these cluster,
Docker, GHCR, R2, Cloudflare, or network commands from the sandbox.

## Facts

- Cluster kubeconfig: `~/.kube/config-morefine`
- Namespace: `twfoundry-data`
- Batch image: `ghcr.io/unknowntpo/twfoundry/bus-batch-job:latest`
- R2 bucket binding: `BUS_PROJECTION_BUCKET`
- R2 object prefix: `analytics/bus/`
- Lake source: PVC `bus-lake`, mounted by `bus-track-b` at `/lake`; files are `/lake/YYYY-MM-DD.jsonl`.

## Build Image

ENV-BLOCKED: run by human

```bash
gh workflow run build-batch-job-image.yml --ref main
gh run list --workflow build-batch-job-image.yml --limit 5
gh run watch <run-id>
```

Verify the pushed image is `linux/amd64`:

ENV-BLOCKED: run by human

```bash
docker buildx imagetools inspect ghcr.io/unknowntpo/twfoundry/bus-batch-job:latest
```

## Deploy ClickHouse

ENV-BLOCKED: run by human

```bash
export KUBECONFIG=~/.kube/config-morefine
kubectl get pods -n twfoundry-data
kubectl top node
kubectl apply -f k8s/clickhouse.yaml
kubectl rollout status statefulset/clickhouse -n twfoundry-data --timeout=5m
kubectl wait --for=condition=complete job/clickhouse-apply-schema -n twfoundry-data --timeout=5m
kubectl logs job/clickhouse-apply-schema -n twfoundry-data
kubectl exec -n twfoundry-data statefulset/clickhouse -- clickhouse-client --query "SELECT 1"
```

## Backfill Recent Lake Days

ENV-BLOCKED: run by human

```bash
export KUBECONFIG=~/.kube/config-morefine
kubectl apply -f k8s/bus-batch-backfill-job.yaml
kubectl wait --for=condition=complete job/bus-batch-backfill -n twfoundry-data --timeout=20m
kubectl logs job/bus-batch-backfill -n twfoundry-data
```

Verify R2 output:

ENV-BLOCKED: run by human

```bash
cd frontend
bunx wrangler r2 object get twfoundry-poc-archive/analytics/bus/manifest.json --remote --file /tmp/bus-analytics-manifest.json
jq '{serviceDate,source,publishedAt,lookbackDays}' /tmp/bus-analytics-manifest.json
```

## Enable Daily Cron

ENV-BLOCKED: run by human

```bash
export KUBECONFIG=~/.kube/config-morefine
kubectl apply -f k8s/bus-batch-cronjob.yaml
kubectl get cronjob bus-batch-daily -n twfoundry-data
kubectl create job --from=cronjob/bus-batch-daily bus-batch-daily-smoke -n twfoundry-data
kubectl wait --for=condition=complete job/bus-batch-daily-smoke -n twfoundry-data --timeout=20m
kubectl logs job/bus-batch-daily-smoke -n twfoundry-data
```

Check the speed layer was not disturbed:

ENV-BLOCKED: run by human

```bash
kubectl get pod -n twfoundry-data -l app.kubernetes.io/name=bus-track-b
curl -s 'https://twfoundry-poc.pages.dev/api/online/bus-route-signals?limit=1' | jq '.status'
```

## Pages Function Cutover

Do not commit `VITE_TWFOUNDRY_ANALYTICS_BASE` into config. Set it only for the
manual build.

ENV-BLOCKED: run by human

```bash
cd frontend
VITE_TWFOUNDRY_ANALYTICS_BASE=/api/analytics/bus bun run build
bunx wrangler pages deploy --commit-dirty=true
curl -s https://twfoundry-poc.pages.dev/api/analytics/bus/manifest.json | jq '{serviceDate,source,publishedAt}'
```

Expected manifest: recent `serviceDate`, `source: "clickhouse-rolling"`, non-null
`publishedAt`.

## Rollback

Stop batch publishing:

ENV-BLOCKED: run by human

```bash
export KUBECONFIG=~/.kube/config-morefine
kubectl delete cronjob bus-batch-daily -n twfoundry-data --ignore-not-found
kubectl delete job bus-batch-backfill bus-batch-daily-smoke -n twfoundry-data --ignore-not-found
```

Return the dashboard to the committed static fallback:

ENV-BLOCKED: run by human

```bash
cd frontend
bun run build
bunx wrangler pages deploy --commit-dirty=true
```

Remove ClickHouse only if the batch stack is being fully backed out:

ENV-BLOCKED: run by human

```bash
export KUBECONFIG=~/.kube/config-morefine
kubectl delete -f k8s/clickhouse.yaml
# Optional destructive cleanup after review:
# kubectl delete pvc clickhouse-data-clickhouse-0 -n twfoundry-data
```

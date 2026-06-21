# Track B → homelab k0s Deployment Plan (Option 2)

**Status:** PLAN ONLY — nothing applied. Drafted 2026-06-21 after read-only survey of `~/repo/unknowntpo/infra`.
**Predecessor:** Option 1 (docker-compose) shipped in `infra/homelab/docker-compose.yml` (commit `d1099d5`).

## 1. Ground truth (what actually exists)

| Claim in old notes | Reality found in infra repo |
|---|---|
| `20-saas-k0s` cluster exists | README says **"scaffolded but not implemented yet"** — no Terraform runtime |
| k0s + ArgoCD running | **YES** — `30-saas-platform` + `40-edge-cloudflare` have applied `terraform.tfstate`; cluster was bootstrapped on `morefine` (Ubuntu host) outside the `20-` layer |
| — | ArgoCD UI exposed at `argocd-homelab.unknowntpo.com` via Cloudflare Tunnel |

### 1b. Live cluster verification (2026-06-21, via SSH `morefinepublic`)

Connected read-only and found the plan's prerequisites are partly **false** — correct before implementing:

| Check | Result |
|---|---|
| Cluster | ✅ healthy — single node `morefine-m9`, k0s **v1.34.3**, up 159d, `Ready` |
| Storage | ✅ `local-path-storage` present (RWO provisioner) → use RWO PVC, co-locate archiver+scheduler (decision D1) |
| kubeconfig IP | ⚠️ **STALE** — `~/.kube/config-morefine` points to `192.168.1.115`, but morefine's real IP is now `192.168.1.114` (DHCP). API reachable via `127.0.0.1:6443` *on morefine*; the `.115` address times out even locally |
| **ArgoCD** | ❌ **NOT installed** — no `argocd` namespace. The infra `30-saas-platform` tfstate is stale/aspirational; the GitOps stack is not actually running |
| guessme | ❌ not deployed (no `guessme` ns) |
| Workstation access | ❌ currently off-LAN — cannot reach `.114:6443`; needs SSH tunnel (`ssh -L 6443:127.0.0.1:6443 morefinepublic`) or VPN/LAN |

**Implication:** Section 1's "ArgoCD already installed" assumption is wrong. Two paths:
- **Path P1 (KISS, recommended first):** skip ArgoCD; deploy Track B with `kubectl apply -k k8s/` directly (via SSH tunnel or by running on morefine). Add GitOps later.
- **Path P2:** install ArgoCD first, then the GitOps flow as originally planned.

**Proven deployment pattern (from `guessme`, ASPIRATIONAL — not currently live):** GitOps. App repo holds a `k8s/` dir (kustomize: Namespace + Deployment + Service); an ArgoCD `Application` CRD points `repoURL`→app repo, `path: k8s`, with `automated` + `prune` + `selfHeal` + `CreateNamespace=true`. Registered via Terraform `modules/argocd-app` (`kubernetes_manifest`). Secrets are **raw k8s Secrets created by Terraform** (e.g. `cloudflared-credentials` via `secret_key_ref`) — no sealed-secrets. Images live in **GHCR**: `ghcr.io/unknowntpo/<repo>/<svc>:latest`.

## 2. compose → k8s mapping

| Option 1 (compose) | k0s target |
|---|---|
| `kafka` (KRaft, in-net) | **StatefulSet** `kafka` (1 replica) + headless Service `kafka:9092` + PVC |
| `bus-ingestion` | **Deployment** + ClusterIP Service `bus-ingestion:8081` |
| `bus-lake-archiver` | co-located with scheduler (shares lake) — see decision D1 |
| `bus-track-b-scheduler` (while-loop) | **Deployment** running `track-b-daemon.sh`, OR **CronJob** every 5 min — see decision D2 |
| bind-mounted repo | baked into images (GHCR) — no bind mount on k8s |
| `bus-lake` volume | PVC (RWO if co-located, RWX if split) |
| TDX / R2 env | k8s Secret `twfoundry-track-b-secrets` (Terraform-managed) |

Track B needs **no Cloudflare Tunnel ingress** — it has no public in-cluster endpoint. The public map is served by CF Pages/R2; the scheduler's R2 upload is outbound only. So **no `40-edge-cloudflare` change required.**

## 3. New artifacts to create

### A. In this repo (`twfoundry`)

1. `k8s/namespace.yaml` — `twfoundry-data`.
2. `k8s/kafka.yaml` — StatefulSet (KRaft single node, valid `CLUSTER_ID`) + headless Service + volumeClaimTemplate.
3. `k8s/bus-ingestion.yaml` — Deployment (image `ghcr.io/unknowntpo/twfoundry/bus-ingestion`) + Service `:8081`; env from Secret (TDX_*) + `KAFKA_BROKERS=kafka:9092`.
4. `k8s/bus-track-b.yaml` — single Deployment, **two containers** (`archiver` + `scheduler`) sharing an `emptyDir`/PVC lake volume (decision D1); scheduler env `TRACK_B_INGEST_URL=http://bus-ingestion:8081`, R2 creds from Secret.
5. `k8s/kustomization.yaml` — lists the above.
6. `.github/workflows/build-track-b-images.yml` — build + push the 3 images to GHCR on push to `main` (mirror guessme CI). **Biggest new piece vs Option 1** — k8s cannot use local `docker build`.

### B. In infra repo (`~/repo/unknowntpo/infra/master`)

7. `homelab/modules/argocd-app/twfoundry-app.yaml` — ArgoCD Application (copy of `guessme-app.yaml`): repoURL `…/twfoundry.git`, `path: k8s`, namespace `twfoundry-data`.
8. Extend `homelab/30-saas-platform/envs/prod/main.tf` — add `namespaces` module instance for `twfoundry-data`, an `argocd-app` instance for twfoundry, and a `kubernetes_secret` `twfoundry-track-b-secrets` (TDX_CLIENT_ID/SECRET, CLOUDFLARE_API_TOKEN/ACCOUNT_ID) sourced from TF vars (kept out of git).

## 4. Decisions needed before implementing

- **D1 — Lake sharing:** archiver writes, scheduler's publisher reads. Recommend **co-locate both in one pod** with a shared volume (RWO PVC or emptyDir) → avoids RWX storage (k0s default local-path is RWO). Trade-off: archiver + scheduler scale together (fine, both singletons).
- **D2 — Scheduler form:** **Deployment running the while-loop daemon** (reuse `track-b-daemon.sh` as-is, matches Option 1) vs **CronJob** (k8s-native, but harder to share the live lake with the archiver). Recommend **Deployment+daemon** for parity now; revisit CronJob later.
- **D3 — Kafka:** single-node KRaft StatefulSet (KISS) vs Strimzi operator. Recommend **StatefulSet** for Phase 1; Strimzi only if we need multi-broker.
- **D4 — Image tags:** `latest` (like guessme, simple, ArgoCD auto-sync) vs git-sha (safer rollbacks). Recommend `latest` now.
- **D5 — Lake durability:** lake PVC is on ephemeral homelab storage; R2 remains source of truth (matches existing "homelab is ephemeral" note). No backup needed.

## 5. Deploy sequence (local → CI → staging → prod gates)

1. **Local:** finalize `k8s/` manifests; `kustomize build k8s/ | kubectl --dry-run=client apply -f -` to validate; (Option 1 compose already proves the containers run).
2. **CI:** add + run the GHCR build workflow; confirm 3 images publish.
3. **Cluster prereq check:** confirm k0s reachable (`kubectl get nodes` via morefine kubeconfig) and ArgoCD healthy.
4. **Secrets:** apply the Terraform `kubernetes_secret` (TDX + R2) into `twfoundry-data`.
5. **Register:** apply the ArgoCD Application; watch ArgoCD sync `k8s/`.
6. **Verify (prod):** pods Running; `kubectl logs` scheduler shows 5-min cycles; Track B Pages API `latestSlotKey` advances and **hugs Track A**.
7. **Cutover (→ #2):** once homelab Track B is fresh 48h, stop the Mac daemon, then switch the public map / retire Track A.

## 6. Risks / open questions

- **kubeconfig access — RESOLVED (with caveats):** access is via SSH to `morefinepublic` then the k0s API on `127.0.0.1:6443` (the `~/.kube/config-morefine` `.115` address is stale → `.114`). Off-LAN deploy needs `ssh -L 6443:127.0.0.1:6443 morefinepublic` + a kubeconfig with `server: https://localhost:6443` + `insecure-skip-tls-verify` (cert SAN won't match localhost). Fixing the stale IP / cert SAN is a separate infra chore.
- **ArgoCD not installed — DECISION NEEDED:** Path P1 (plain `kubectl -k`, KISS) vs P2 (install ArgoCD first). See §1b.
- **GHCR auth** — k0s needs an imagePullSecret for GHCR if images are private. Confirm twfoundry image visibility.
- **`20-saas-k0s` is unimplemented** — the cluster exists out-of-band (bootstrapped manually on morefine-m9). If ever re-provisioned from Terraform, that layer must be built first.
- **archiver cold-start crash** — see open follow-up: add internal Kafka retry so the pod doesn't rely on restart policy.

## 7. Effort estimate

- twfoundry `k8s/` manifests + kustomize: ~half day.
- GHCR CI workflow: ~1–2h (copy guessme).
- infra repo wiring (ArgoCD app + secret + namespace): ~2h.
- First end-to-end sync + verify: ~half day (mostly waiting on access/creds).

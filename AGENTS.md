# TWFoundry Agent Instructions

## Project Communication Rules

- In this project, always reply to the user in Chinese.
- Keep responses concise, precise, and engineer-facing.
- Prefer direct technical conclusions over long explanations.
- Capture project knowledge in a way that can later be organized into blog posts.

## Project Implementation Judge

- After every implementation that touches frontend data, ontology objects, overlays, map/geospatial projection, voxel render modules, backend payload contracts, or user-visible copy derived from data, apply the `twfoundry-extensibility-judge` skill.
- Treat hardcoded domain truth as a design defect. UI/rendering code must render generic contracts; source-specific facts must enter through adapters, normalized payloads, or clearly marked fallback fixtures.
- Final implementation reports should include the judge result: `PASS / WARN / FAIL`, score, findings, and required fixes.

## Contract Governance

- `SPEC.md` is the highest-level product/system contract. `Design.md`, design docs under `docs/specs` and `docs/changes`, frontend demos, backend endpoints, and design proposals must conform to it.
- If a user request conflicts with `SPEC.md`, do not silently implement around the contract. State the conflict, then propose one of: extend the contract, amend the contract, or explicitly mark the work as a throwaway experiment.
- Data must flow through the contract boundary: source adapter → normalized observation → ontology/projection → overlay feature/detail payload → renderer. Renderer code must not invent product truth such as simulated citizens, demand, risk, or relationships unless those are explicitly marked fixture/prototype data.
- Map overlays are product projections, not renderer-specific demos. Kepler.gl, deck.gl, MapLibre, or any future renderer may be used only as rendering/exploration surfaces over contract-shaped data.
- Before adding a new source, ontology object, overlay, projection, or renderer module, check whether the existing contract covers it. If it does not, propose the smallest contract extension first.

## Architecture Awareness Loop

The human owner must retain a working mental model of the system. Agents protect this — they do not erode it — by surfacing design *before* code and architecture *deltas* after.

- **Design-first for non-trivial change.** Before writing code for anything beyond a localized fix, produce a short design note (boundaries, data flow, contracts touched, alternatives) and get the owner's review. The point is not ceremony: reviewing the design is where the owner keeps their architectural grasp. Trivial/localized edits skip this.
- **Architecture delta notes are mandatory when architecture moves.** If a change adds/removes a component, alters a data flow, changes a contract, or shifts a deployment boundary, append a dated entry to `docs/architecture/technical-decisions-log.md` (what changed, why, what it replaces). No silent architecture drift.
- **Prefer vertical slices.** Keep a feature's API + logic + data access in one comprehensible slice so both the agent and the owner can reason about it in a single context. Flag horizontal spread across layers as a review risk.
- **Teach-back on request.** When asked, re-derive and diagram the current architecture (e.g. via the `ascii` skill) rather than asserting from memory. Verify against current code first.

## Deployment Visibility

The owner must always be able to answer "what is running in prod, and when did it get there." Agents keep this legible.

- **No silent prod changes.** Any action that mutates a shared/production system (cluster apply, scheduler restart, image rollout, Pages deploy, R2 prefix overwrite) requires explicit per-action owner approval in chat. Approval for one action does not generalize to the next. (The harness auto-mode classifier enforces this; treat a denial as a real gate, not an obstacle to route around.)
- **Update the deploy ledger.** After any deploy, record it in `docs/deployments.md` (what, where, image/commit, when, how to roll back). The ledger is the owner's single glance at prod state until GitOps (ArgoCD) makes git the source of truth.
- **Local → CI → staging → prod, with proof.** Verify locally first, then CI, then staging, then prod; never skip a layer silently. After a deploy, show evidence it worked (curl/logs/screenshot) instead of asserting success.
- **Pin what you ship.** Avoid relying on `:latest` for anything you need to audit or roll back; prefer git-SHA-tagged images. (Tracked: UNK-50.)

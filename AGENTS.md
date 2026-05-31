<!-- SPECTRA:START v1.0.1 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `$spectra-*` skills when:

- A discussion needs structure before coding → `$spectra-discuss`
- User wants to plan, propose, or design a change → `$spectra-propose`
- Tasks are ready to implement → `$spectra-apply`
- There's an in-progress change to continue → `$spectra-ingest`
- User asks about specs or how something works → `$spectra-ask`
- Implementation is done → `$spectra-archive`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? `ingest` → resume `apply`

## Project Communication Rules

- In this project, always reply to the user in Chinese.
- Keep responses concise, precise, and engineer-facing.
- Prefer direct technical conclusions over long explanations.
- Capture project knowledge in a way that can later be organized into blog posts.

## Project Implementation Judge

- After every implementation that touches frontend data, ontology objects, overlays, map/geospatial projection, voxel render modules, backend payload contracts, or user-visible copy derived from data, apply `$twfoundry-extensibility-judge`.
- Treat hardcoded domain truth as a design defect. UI/rendering code must render generic contracts; source-specific facts must enter through adapters, normalized payloads, or clearly marked fallback fixtures.
- Final implementation reports should include the judge result: `PASS / WARN / FAIL`, score, findings, and required fixes.

## Contract Governance

- `SPEC.md` is the highest-level product/system contract. `Design.md`, OpenSpec changes, frontend demos, backend endpoints, and Claude/Codex design proposals must conform to it.
- If a user request conflicts with `SPEC.md`, do not silently implement around the contract. State the conflict, then propose one of: extend the contract, amend the contract, or explicitly mark the work as a throwaway experiment.
- Data must flow through the contract boundary: source adapter → normalized observation → ontology/projection → overlay feature/detail payload → renderer. Renderer code must not invent product truth such as simulated citizens, demand, risk, or relationships unless those are explicitly marked fixture/prototype data.
- Map overlays are product projections, not renderer-specific demos. Kepler.gl, deck.gl, MapLibre, or any future renderer may be used only as rendering/exploration surfaces over contract-shaped data.
- Before adding a new source, ontology object, overlay, projection, or renderer module, check whether the existing contract covers it. If it does not, propose the smallest contract extension first.

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `$spectra-apply` and `$spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

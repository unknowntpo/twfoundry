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

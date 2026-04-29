# TWFoundry Diorama Restart V1

## Experiment goal

Build a fresh, isolated Vue + Three.js / Vite experiment for TWFoundry's core visual direction: a palm-sized voxel Taipei world on a visible tabletop diorama base, using March sakura as a seasonal highlight rather than the dominant palette.

## Builder assumptions

- This is a builder artifact, not a judge report. No formal score is included.
- Mock data is sufficient for this slice as long as ontology relationships are visible in interaction.
- The first screen should be the actual world, not a landing page or dashboard.
- Taipei MRT truth can be represented with a simplified Tamsui-Xinyi route projection rather than precise GIS coordinates.
- Sakura is used on a few tree crowns and station roofs only; sky, water, leaf, and sunny colors carry the main visual weight.

## Design reasoning

- The scene uses a thick plinth plus a round tabletop shadow surface so the world reads as a physical desktop diorama.
- The camera is fixed in a three-quarter/isometric position to keep the voxel base, edges, rail, and buildings legible.
- MRT route, stations, and train are projected as raised voxel entities. The train position is derived from `worldTime`, so the Timeline and Live HUD visibly affect the world.
- River blocks, rainfall volume, AQMS haze, and incident marker keep public-data semantics in the 3D world instead of moving meaning into charts.
- Hovering or clicking interactive objects updates the RPG-style object HUD with ontology type, live state, freshness, and relationships.
- The UI avoids dense dashboard metrics and uses compact HUD panels, chips, and a timeline control.

## How to run

```bash
cd experiments/codex-diorama-restart-v1
bun install
bun run dev
```

Then open the local Vite URL printed by the dev server.

## Files changed

- `README.md`
- `bun.lock`
- `package.json`
- `vite.config.js`
- `index.html`
- `dist/index.html`
- `dist/assets/*`
- `src/main.js`
- `src/App.vue`
- `src/DioramaScene.vue`
- `src/mockData.js`
- `src/styles.css`

## Known gaps

- Route geometry is approximate and intentionally not GIS-accurate.
- The scene uses primitive voxel geometry only; there are no custom sprites, postprocessing, or asset pipeline.
- Hover labels are represented through the object HUD, not in-world labels.
- Layer toggles are not implemented; rainfall, AQMS, incident, rail, and city layers are always visible.
- Mobile layout is functional but not yet tuned as a primary interaction target.
- No screenshot is checked in for this restart version.

## Suggested next experiment

Create a focused interaction slice for layer toggles and local avatar context: selecting an avatar tile should reveal nearby stations, trains, rainfall, PM2.5 exposure, and incident relationships without turning the interface into a dashboard.

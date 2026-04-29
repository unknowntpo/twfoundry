# Define Voxel Design System Render Modules

## Summary

Create a Vue-based TWFoundry Design System page that documents and previews the Sakura Voxel visual language, reusable UI primitives, and data-driven overlay render modules.

## Motivation

TWFoundry is moving from a flat operations map toward a palm-sized, Sakura-season voxel world. The frontend needs a reusable design system page that shows the actual Three.js voxel components, while the platform needs a contract that lets new backend overlays appear without hardcoding each overlay as a bespoke frontend component.

## Scope

- Add a frontend-only Vue Design System page for Sakura Voxel visual language.
- Show live Three.js previews for each current render module class.
- Define the relationship between overlay definitions, data points, ontology objects, voxel entities, and renderer modules.
- Use a shadcn-like local component architecture: owned wrappers, stable variants, semantic props, and project tokens.
- Keep panels readable and mostly solid; reserve transparent/crystal effects for voxel-world entities and operational emphasis.

## Non-goals

- No backend ingestion or API changes in this change.
- No production MapLibre integration for the voxel world yet.
- No replacement of the main MRT dashboard route in this change.


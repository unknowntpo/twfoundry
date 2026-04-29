<script setup lang="ts">
import { computed, ref } from "vue";
import {
  paletteTokens,
  registryRules,
  type VoxelModuleKey,
  voxelModules,
} from "@/features/design-system/voxel/modules";
import VoxelPreview from "@/features/design-system/voxel/VoxelPreview.vue";
import BaseBadge from "@/shared/components/BaseBadge.vue";
import BaseButton from "@/shared/components/BaseButton.vue";
import BaseCard from "@/shared/components/BaseCard.vue";
import BasePanel from "@/shared/components/BasePanel.vue";
import BaseSectionLabel from "@/shared/components/BaseSectionLabel.vue";

const selectedModule = ref<VoxelModuleKey>("moving-object");

const selectedModuleDetail = computed(
  () => voxelModules.find((module) => module.key === selectedModule.value) ?? voxelModules[0],
);

const componentLayers = [
  ["Primitive", "BaseButton, BaseBadge, BaseCard, BasePanel", "local shadcn-style wrappers"],
  ["Domain", "OverlayToggle, TimelineControl, OntologyInspector", "semantic app components"],
  ["Renderer", "MovingObjectRenderer, FieldVolumeRenderer", "Three.js scene modules"],
  ["Projection", "OverlayDefinition -> VoxelEntityRef", "data-driven rendering contract"],
];

const objectRelationshipRows = [
  ["Overlay", "Taipei Metro", "Controls visibility and interaction boundary."],
  ["Ontology object", "Train T1005", "Stable operational object across live and historical time."],
  [
    "Data points",
    "position, speed, headway, next stop",
    "Many observations can describe one object.",
  ],
  [
    "Voxel entities",
    "train mesh, hover hit area, focus ring",
    "One object may project into multiple visible entities.",
  ],
];
</script>

<template>
  <main class="design-system-page">
    <header class="hero">
      <nav class="hero-nav" aria-label="Design system navigation">
        <RouterLink class="back-link" to="/">Back to cockpit</RouterLink>
        <BaseBadge tone="red">Sakura Voxel</BaseBadge>
        <BaseBadge tone="blue">Vue + Three.js</BaseBadge>
      </nav>

      <BaseSectionLabel>TWFoundry Design System</BaseSectionLabel>
      <h1>Sakura Voxel Operations UI</h1>
      <p>
        Design System for the current TWFoundry direction: a bright, gentle, palm-sized Taipei
        voxel world. Panels stay readable and solid; glass/crystal effects belong to selected
        voxel entities, rainfall volumes, and incident tension states.
      </p>

      <div class="hero-actions">
        <BaseButton variant="primary">Renderer registry first</BaseButton>
        <BaseButton>Local Vue primitives</BaseButton>
      </div>
    </header>

    <section class="overview-grid" aria-label="Design principles">
      <BaseCard>
        <BaseSectionLabel>Visual Direction</BaseSectionLabel>
        <h2>明亮、溫柔、櫻花紛飛</h2>
        <p>
          Use Japanese nature-inspired colors: sakura, sora, mizu, wakatake, yamabuki, and fuji.
          The city should read as a cute solid voxel RPG diorama, not a flat dashboard skin.
        </p>
      </BaseCard>
      <BaseCard>
        <BaseSectionLabel>Interaction Direction</BaseSectionLabel>
        <h2>Operational, not decorative</h2>
        <p>
          Every voxel entity is traceable to an overlay, ontology object, or observation stream.
          Hover, selection, timeline replay, and overlay toggles must share the same object model.
        </p>
      </BaseCard>
      <BaseCard>
        <BaseSectionLabel>Component Direction</BaseSectionLabel>
        <h2>shadcn-like local components</h2>
        <p>
          Use owned Vue wrappers with semantic variants. The public API is token and role based,
          not raw hex values or one-off CSS classes.
        </p>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="palette-title">
      <div>
        <BaseSectionLabel>Semantic Tokens</BaseSectionLabel>
        <h2 id="palette-title">Sakura Voxel palette</h2>
        <p>
          These colors are the current system direction. They are exposed as semantic families so
          renderer modules can request meaning, not hardcoded hex values.
        </p>
      </div>
      <div class="token-grid">
        <BasePanel v-for="[name, token, hex, usage] in paletteTokens" :key="token" class="token-card">
          <span class="swatch" :style="{ backgroundColor: hex }" aria-hidden="true" />
          <div>
            <h3>{{ name }}</h3>
            <code>{{ token }}</code>
            <p>{{ usage }}</p>
          </div>
        </BasePanel>
      </div>
    </section>

    <section class="section-grid render-lab" aria-labelledby="render-title">
      <div>
        <BaseSectionLabel>Render Modules</BaseSectionLabel>
        <h2 id="render-title">Three.js voxel previews</h2>
        <p>
          Each module is a reusable renderer class target. New backend overlays should match
          geometry, visual role, object type, style token, and time mode into this registry.
        </p>

        <div class="module-list" role="tablist" aria-label="Voxel renderer modules">
          <button
            v-for="module in voxelModules"
            :key="module.key"
            type="button"
            :class="{ active: selectedModule === module.key }"
            @click="selectedModule = module.key"
          >
            <span>{{ module.renderer }}</span>
            <small>{{ module.input }}</small>
          </button>
        </div>
      </div>

      <BaseCard class="preview-card">
        <VoxelPreview :module-key="selectedModule" />
        <div class="preview-meta">
          <div>
            <BaseSectionLabel>{{ selectedModuleDetail.visualRole }} renderer</BaseSectionLabel>
            <h3>{{ selectedModuleDetail.title }}</h3>
            <p>{{ selectedModuleDetail.description }}</p>
          </div>
          <div class="badge-row">
            <BaseBadge tone="blue">{{ selectedModuleDetail.geometryType }}</BaseBadge>
            <BaseBadge tone="green">{{ selectedModuleDetail.timeMode }}</BaseBadge>
            <BaseBadge tone="warm">{{ selectedModuleDetail.styleToken }}</BaseBadge>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="registry-title">
      <div>
        <BaseSectionLabel>Overlay Registry</BaseSectionLabel>
        <h2 id="registry-title">Avoid hardcoded overlay rendering</h2>
        <p>
          Backend can keep creating overlays. The frontend maps metadata into a compatible
          renderer, then binds hover, focus, timeline, and ontology interactions through
          `VoxelEntityRef`.
        </p>
      </div>

      <BaseCard>
        <div class="registry-table">
          <div class="registry-row header">
            <span>Match key</span>
            <span>Renderer</span>
            <span>Examples</span>
          </div>
          <div v-for="[match, renderer, examples] in registryRules" :key="match" class="registry-row">
            <code>{{ match }}</code>
            <strong>{{ renderer }}</strong>
            <span>{{ examples }}</span>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="object-title">
      <div>
        <BaseSectionLabel>Ontology Binding</BaseSectionLabel>
        <h2 id="object-title">Data point to object relationship</h2>
        <p>
          Multiple observations can describe one ontology object. One object can generate several
          voxel entities, but the overlay owns their visibility boundary.
        </p>
      </div>
      <BaseCard>
        <div class="relationship-grid">
          <BasePanel v-for="[type, example, rule] in objectRelationshipRows" :key="type">
            <BaseSectionLabel>{{ type }}</BaseSectionLabel>
            <h3>{{ example }}</h3>
            <p>{{ rule }}</p>
          </BasePanel>
        </div>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="architecture-title">
      <div>
        <BaseSectionLabel>Component Architecture</BaseSectionLabel>
        <h2 id="architecture-title">Reusable layers</h2>
        <p>
          The page uses a shadcn-like pattern without importing a heavy UI kit: local primitives,
          domain components, renderer modules, and a projection contract.
        </p>
      </div>
      <div class="layer-stack">
        <BasePanel v-for="[layer, examples, responsibility] in componentLayers" :key="layer">
          <h3>{{ layer }}</h3>
          <code>{{ examples }}</code>
          <p>{{ responsibility }}</p>
        </BasePanel>
      </div>
    </section>
  </main>
</template>

<style scoped>
.design-system-page {
  min-height: 100vh;
  padding: 32px clamp(18px, 4vw, 56px) 64px;
  background:
    radial-gradient(circle at 78% 8%, rgba(255, 249, 243, 0.84), transparent 28%),
    linear-gradient(135deg, var(--twf-color-canvas) 0%, #e7f5ff 100%);
  color: var(--twf-color-text);
}

.hero,
.overview-grid,
.section-grid {
  max-width: 1240px;
  margin: 0 auto;
}

.hero {
  border: 1px solid rgba(240, 191, 208, 0.88);
  border-radius: 24px;
  padding: clamp(24px, 4vw, 44px);
  background: rgba(255, 249, 243, 0.92);
  box-shadow: var(--twf-shadow-panel);
}

.hero-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 26px;
}

.back-link {
  color: var(--twf-color-text-muted);
  font-size: 0.84rem;
  font-weight: 800;
  text-decoration: none;
}

.back-link:hover {
  color: var(--twf-color-text);
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  max-width: 920px;
  margin-top: 8px;
  color: #8b3f59;
  font-size: clamp(2.8rem, 8vw, 6.8rem);
  line-height: 0.92;
}

h2 {
  margin-top: 8px;
  color: #8b3f59;
  font-size: clamp(1.7rem, 3vw, 2.6rem);
  line-height: 1.05;
}

h3 {
  color: #8b3f59;
  font-size: 1.04rem;
}

p {
  color: var(--twf-color-text-muted);
  font-size: 1rem;
  line-height: 1.68;
}

.hero > p {
  max-width: 780px;
  margin-top: 20px;
  font-size: 1.12rem;
}

.hero-actions,
.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.overview-grid :deep(.base-card),
.section-grid :deep(.base-card),
.layer-stack :deep(.base-panel),
.relationship-grid :deep(.base-panel),
.token-card {
  background: rgba(255, 249, 243, 0.9);
  border-color: rgba(240, 191, 208, 0.9);
}

.section-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.38fr) minmax(0, 1fr);
  gap: 28px;
  margin-top: 42px;
  align-items: start;
}

.section-grid > div:first-child {
  position: sticky;
  top: 24px;
}

.section-grid > div:first-child > p {
  margin-top: 14px;
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.token-card {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 16px;
  align-items: center;
}

.swatch {
  display: block;
  width: 72px;
  height: 72px;
  border: 1px solid rgba(139, 63, 89, 0.2);
  border-radius: 16px;
  box-shadow: inset 0 -18px 0 rgba(255, 255, 255, 0.28);
}

code {
  color: var(--twf-color-text-muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.78rem;
}

.module-list {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}

.module-list button {
  width: 100%;
  border: 1px solid rgba(240, 191, 208, 0.85);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 249, 243, 0.78);
  color: #94506a;
  cursor: pointer;
  text-align: left;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.module-list button:hover,
.module-list button.active {
  border-color: #dc7898;
  background: #ffe7ef;
  transform: translateY(-1px);
}

.module-list span,
.module-list small {
  display: block;
}

.module-list span {
  font-weight: 900;
}

.module-list small {
  margin-top: 4px;
  color: var(--twf-color-text-faint);
  font-size: 0.76rem;
}

.preview-card {
  padding: 14px;
}

.preview-meta {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 18px 4px 4px;
}

.preview-meta p {
  margin-top: 8px;
}

.registry-table {
  display: grid;
  gap: 2px;
}

.registry-row {
  display: grid;
  grid-template-columns: 0.9fr 1fr 1.35fr;
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid rgba(240, 191, 208, 0.62);
  padding: 13px 0;
}

.registry-row.header {
  color: var(--twf-color-text-faint);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.registry-row:last-child {
  border-bottom: 0;
}

.relationship-grid,
.layer-stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.relationship-grid p,
.layer-stack p {
  margin-top: 8px;
}

.layer-stack code {
  display: block;
  margin-top: 10px;
}

@media (max-width: 920px) {
  .overview-grid,
  .section-grid,
  .preview-meta,
  .relationship-grid,
  .layer-stack,
  .token-grid,
  .registry-row {
    grid-template-columns: 1fr;
  }

  .section-grid > div:first-child {
    position: static;
  }

  h1 {
    font-size: clamp(2.4rem, 12vw, 4rem);
  }
}
</style>

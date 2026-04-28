<script setup lang="ts">
import type { OntologyType } from "../data";

defineProps<{
  types: OntologyType[];
  activeTypeId: string;
}>();

const emit = defineEmits<{
  selectType: [id: string];
  openMap: [id: string];
}>();
</script>

<template>
  <main class="ontology-view">
    <aside class="type-list">
      <header>
        <span>Ontology v0.4</span>
        <h1>Object types</h1>
        <p>Schema is derived from TDX, CWA, and EPA feeds. Edit a type to propose a change.</p>
      </header>

      <button
        v-for="type in types"
        :key="type.id"
        type="button"
        class="type-row"
        :class="{ active: type.id === activeTypeId }"
        @click="emit('selectType', type.id)"
      >
        <span>{{ type.label.slice(0, 1) }}</span>
        <strong>{{ type.label }}</strong>
        <small>{{ type.count }} objects</small>
      </button>
    </aside>

    <section
      v-for="type in types.filter((item) => item.id === activeTypeId)"
      :key="type.id"
      class="type-detail"
    >
      <div class="schema-map" aria-hidden="true">
        <span v-for="relation in type.relations" :key="relation">{{ relation }}</span>
      </div>

      <article>
        <div class="type-glyph">{{ type.label.slice(0, 1) }}</div>
        <div>
          <span class="eyebrow">{{ type.source }} - {{ type.cadence }}</span>
          <h2>{{ type.label }}</h2>
          <p>{{ type.summary }}</p>
          <button type="button" @click="emit('openMap', type.id)">Open matching map objects</button>
        </div>
      </article>

      <div class="schema-columns">
        <section>
          <h3>Properties</h3>
          <div v-for="property in type.properties" :key="property" class="schema-chip">
            {{ property }}
          </div>
        </section>
        <section>
          <h3>Relationships</h3>
          <div v-for="relation in type.relations" :key="relation" class="schema-chip relationship">
            {{ relation }}
          </div>
        </section>
      </div>
    </section>

    <aside class="instance-list">
      <span>Instances - {{ activeTypeId }}</span>
      <strong>{{ types.find((type) => type.id === activeTypeId)?.count ?? 0 }}</strong>
      <div v-for="index in 10" :key="index" class="instance-row">
        <code>{{ activeTypeId.slice(0, 1) }}{{ String(1000 + index).padStart(4, "0") }}</code>
        <span>summary</span>
      </div>
    </aside>
  </main>
</template>

<style scoped>
.ontology-view {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) 260px;
  flex: 1;
  min-height: 0;
  background: var(--twf-color-surface);
}

.type-list,
.instance-list {
  background: var(--twf-color-surface-raised);
  overflow-y: auto;
}

.type-list {
  border-right: 1px solid var(--twf-color-border);
}

.instance-list {
  border-left: 1px solid var(--twf-color-border);
  padding: 14px;
}

header {
  border-bottom: 1px solid var(--twf-color-border-soft);
  padding: 14px;
}

header span,
.eyebrow,
.instance-list > span {
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.65rem;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  margin-top: 3px;
  font-size: 1.2rem;
}

header p,
article p {
  margin-top: 8px;
  color: var(--twf-color-text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.type-row {
  display: grid;
  grid-template-columns: 26px 1fr auto;
  align-items: center;
  gap: 9px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--twf-color-border-soft);
  border-left: 2px solid transparent;
  background: transparent;
  padding: 12px;
  color: var(--twf-color-text);
  cursor: pointer;
  text-align: left;
}

.type-row.active {
  border-left-color: var(--twf-color-accent-warm);
  background: var(--twf-color-accent-warm-soft);
}

.type-row span,
.type-glyph {
  display: grid;
  place-items: center;
  border: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.type-row span {
  width: 24px;
  height: 24px;
}

.type-row small {
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.66rem;
}

.type-detail {
  overflow-y: auto;
}

.schema-map {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 112px;
  border-bottom: 1px solid var(--twf-color-border-soft);
  background:
    linear-gradient(rgba(31, 27, 23, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 27, 23, 0.04) 1px, transparent 1px);
  background-size: 36px 36px;
}

.schema-map span {
  border: 1px solid var(--twf-color-border);
  background: rgba(255, 255, 255, 0.78);
  padding: 8px 10px;
  color: var(--twf-color-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.7rem;
}

article {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 16px;
  max-width: 760px;
  padding: 28px;
}

.type-glyph {
  width: 52px;
  height: 52px;
  color: var(--twf-color-accent-warm);
  font-size: 1.4rem;
}

article h2 {
  margin-top: 3px;
  font-size: 2rem;
}

article button {
  margin-top: 14px;
  border: 1px solid var(--twf-color-text);
  border-radius: var(--twf-radius-sm);
  background: var(--twf-color-surface-raised);
  padding: 8px 11px;
  color: var(--twf-color-text);
  cursor: pointer;
}

.schema-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 820px;
  padding: 0 28px 28px;
}

.schema-columns h3 {
  margin-bottom: 8px;
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.schema-chip {
  border: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface-raised);
  padding: 8px 10px;
  color: var(--twf-color-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.72rem;
}

.schema-chip + .schema-chip {
  margin-top: 6px;
}

.schema-chip.relationship {
  background: var(--twf-color-route-blue-soft);
}

.instance-list strong {
  display: block;
  margin: 5px 0 14px;
  font-size: 2rem;
}

.instance-row {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--twf-color-border-soft);
  padding: 9px 0;
  color: var(--twf-color-text-faint);
  font-size: 0.76rem;
}

.instance-row code {
  color: var(--twf-color-accent-warm);
}

@media (max-width: 980px) {
  .ontology-view {
    grid-template-columns: 230px minmax(0, 1fr);
  }

  .instance-list {
    display: none;
  }
}

@media (max-width: 720px) {
  .ontology-view {
    grid-template-columns: 1fr;
  }

  .type-list {
    max-height: 330px;
    border-right: 0;
    border-bottom: 1px solid var(--twf-color-border);
  }

  .schema-columns {
    grid-template-columns: 1fr;
  }
}
</style>

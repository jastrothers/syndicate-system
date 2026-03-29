import { getRulebook, saveRulebook } from "./RulebookStore.js";
import { Component } from "../types/index.js";

export interface ComponentResult {
  components: Component[];
}

export interface UpsertResult {
  components: Component[];
  upserted: string;
}

export interface DeleteResult {
  components: Component[];
  deleted: string;
}

export async function getComponents(rulebookName: string, rulebookVersion?: string): Promise<ComponentResult> {
  const rulebook = await getRulebook(rulebookName, rulebookVersion);
  return { components: rulebook.components ?? [] };
}

export async function upsertComponent(rulebookName: string, component: Component): Promise<UpsertResult> {
  const rulebook = await getRulebook(rulebookName);
  if (!rulebook.components) rulebook.components = [];

  const idx = rulebook.components.findIndex(c => c.name === component.name);
  if (idx >= 0) {
    rulebook.components[idx] = component;
  } else {
    rulebook.components.push(component);
  }

  await saveRulebook(rulebookName, rulebook);
  return { components: rulebook.components, upserted: component.name };
}

export async function deleteComponent(rulebookName: string, componentName: string): Promise<DeleteResult> {
  const rulebook = await getRulebook(rulebookName);
  const components = rulebook.components ?? [];
  const idx = components.findIndex(c => c.name === componentName);

  if (idx < 0) {
    throw new Error(`Component '${componentName}' not found in rulebook '${rulebookName}'.`);
  }

  components.splice(idx, 1);
  await saveRulebook(rulebookName, rulebook);

  return { components, deleted: componentName };
}

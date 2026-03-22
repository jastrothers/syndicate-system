import { DesignerProfile } from "../types/index.js";
import * as StorageService from "./StorageService.js";
import { getDesignerProfilePath } from "../config/paths.js";
import * as fs from "fs/promises";

const DEFAULT_PROFILE: DesignerProfile = {
  affinities: {},
  complexityTolerance: 3,
  thematicPreferences: [],
  lastUpdated: new Date().toISOString(),
};

export async function getProfile(): Promise<DesignerProfile> {
  const filePath = getDesignerProfilePath();
  try {
    return await StorageService.readJson<DesignerProfile>(filePath);
  } catch (error) {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: DesignerProfile): Promise<void> {
  const filePath = getDesignerProfilePath();
  profile.lastUpdated = new Date().toISOString();
  await StorageService.saveJson(filePath, profile);
}

export async function updateAffinities(mechanisms: string[], delta: number): Promise<DesignerProfile> {
  const profile = await getProfile();
  
  for (const mech of mechanisms) {
    const currentWeight = profile.affinities[mech] || 0;
    // Apply delta and clamp between -1 and 1
    profile.affinities[mech] = Math.max(-1, Math.min(1, currentWeight + delta));
  }
  
  // Decay other affinities slightly to prevent stagnation
  for (const mech in profile.affinities) {
    if (!mechanisms.includes(mech)) {
      profile.affinities[mech] *= 0.99;
    }
  }
  
  await saveProfile(profile);
  return profile;
}

export async function updateComplexityTolerance(value: number): Promise<DesignerProfile> {
  const profile = await getProfile();
  profile.complexityTolerance = Math.max(1, Math.min(5, value));
  await saveProfile(profile);
  return profile;
}

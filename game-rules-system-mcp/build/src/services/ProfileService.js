import * as StorageService from "./StorageService.js";
import { getDesignerProfilePath } from "../config/paths.js";
const DEFAULT_PROFILE = {
    affinities: {},
    complexityTolerance: 3,
    thematicPreferences: [],
    lastUpdated: new Date().toISOString(),
};
export async function getProfile() {
    const filePath = getDesignerProfilePath();
    try {
        return await StorageService.readJson(filePath);
    }
    catch (error) {
        return DEFAULT_PROFILE;
    }
}
export async function saveProfile(profile) {
    const filePath = getDesignerProfilePath();
    profile.lastUpdated = new Date().toISOString();
    await StorageService.saveJson(filePath, profile);
}
export async function updateAffinities(mechanisms, delta) {
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
export async function updateComplexityTolerance(value) {
    const profile = await getProfile();
    profile.complexityTolerance = Math.max(1, Math.min(5, value));
    await saveProfile(profile);
    return profile;
}

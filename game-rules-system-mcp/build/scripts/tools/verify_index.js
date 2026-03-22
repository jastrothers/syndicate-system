import { initialize, closeDb } from "./src/services/ReferenceStore.js";
async function verify() {
    console.log("Initializing Reference Store...");
    await initialize(); // This also calls rebuildIndex
    console.log("Index rebuilt successfully.");
    closeDb();
}
verify().catch(console.error);

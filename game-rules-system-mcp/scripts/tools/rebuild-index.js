import { initialize } from "./build/src/services/ReferenceStore.js";
import { closeDb } from "./build/src/services/ReferenceStore.js";

async function run() {
    console.log("Initializing ReferenceStore and rebuilding index...");
    await initialize();
    console.log("Index rebuilt.");
    closeDb();
}

run().catch(console.error);

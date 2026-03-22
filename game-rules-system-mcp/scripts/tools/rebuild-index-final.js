import { initialize } from "./build/src/services/ReferenceStore.js";
import { closeDb } from "./build/src/services/ReferenceStore.js";

async function run() {
    console.log("Final Index Rebuild...");
    await initialize();
    console.log("Success.");
    closeDb();
}

run().catch(console.error);

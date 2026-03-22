import * as fs from "fs/promises";
import * as path from "path";
import { DATA_DIR } from "../src/config/paths.js";
import { rebuildIndex } from "../src/services/ReferenceStore.js";
import { initialize as initReference } from "../src/services/ReferenceStore.js";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function migrate() {
  console.log("Starting migration to game-first hierarchy...");
  console.log(`Data Directory: ${DATA_DIR}`);

  const resourceTypes = ["rulebooks", "reference", "sessions"];

  for (const type of resourceTypes) {
    const typeDir = path.join(DATA_DIR, type);
    try {
      const games = await fs.readdir(typeDir, { withFileTypes: true });
      for (const game of games) {
        if (game.isDirectory()) {
          const oldGameDir = path.join(typeDir, game.name);
          const newGameDir = path.join(DATA_DIR, game.name, type);
          
          await ensureDir(path.dirname(newGameDir));
          
          console.log(`Moving ${oldGameDir} -> ${newGameDir}`);
          
          // Use a recursive copy/delete if rename fails across partitions, 
          // but for local dev rename is fine.
          try {
            await ensureDir(newGameDir);
            const contents = await fs.readdir(oldGameDir);
            for (const item of contents) {
                const oldPath = path.join(oldGameDir, item);
                const newPath = path.join(newGameDir, item);
                
                // If it's a directory (like version folders in reference/sessions), move recursively
                const stats = await fs.stat(oldPath);
                if (stats.isDirectory()) {
                    await fs.cp(oldPath, newPath, { recursive: true });
                    await fs.rm(oldPath, { recursive: true });
                } else {
                    await fs.rename(oldPath, newPath);
                }
            }
            await fs.rmdir(oldGameDir);
          } catch (e) {
            console.error(`Failed to move ${oldGameDir}:`, e);
          }
        }
      }
      // Remove the old resource type directory if empty
      const remaining = await fs.readdir(typeDir);
      if (remaining.length === 0) {
        await fs.rmdir(typeDir);
      }
    } catch (e) {
      // Skip if type dir doesn't exist
    }
  }

  console.log("Migration complete. Rebuilding reference index...");
  await initReference(); // This also triggers rebuildIndex() in this implementation
  console.log("Reference index rebuilt.");
}

migrate().catch(console.error);

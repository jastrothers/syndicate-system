import * as fs from "fs/promises";
import * as path from "path";
import * as lockfile from "proper-lockfile";
/**
 * Ensures a directory exists, creating it if necessary.
 */
export async function ensureDirectory(dir) {
    await fs.mkdir(dir, { recursive: true });
}
/**
 * Reads a JSON file.
 * If a defaultValue is provided and the file does not exist, returns the defaultValue.
 */
export async function readJson(filePath, defaultValue) {
    try {
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data);
    }
    catch (error) {
        if (defaultValue !== undefined && error instanceof Error && error.code === "ENOENT") {
            return defaultValue;
        }
        throw error;
    }
}
/**
 * Saves a JSON object to a file with advisory locking.
 * Ensures the directory exists before writing.
 */
export async function saveJson(filePath, data) {
    const dir = path.dirname(filePath);
    await ensureDirectory(dir);
    // Ensure the file exists so we can lock it
    try {
        await fs.access(filePath);
    }
    catch (e) {
        if (e instanceof Error && e.code === "ENOENT") {
            await fs.writeFile(filePath, "{}", "utf-8");
        }
    }
    const release = await lockfile.lock(filePath, { retries: 5 });
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    }
    finally {
        await release();
    }
}

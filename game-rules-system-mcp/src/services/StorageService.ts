import * as fs from "fs/promises";
import * as path from "path";
import * as lockfile from "proper-lockfile";

/**
 * Ensures a directory exists, creating it if necessary.
 */
export async function ensureDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Reads a JSON file.
 * If a defaultValue is provided and the file does not exist, returns the defaultValue.
 */
export async function readJson<T>(filePath: string, defaultValue?: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch (error: unknown) {
    if (defaultValue !== undefined && error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Saves a JSON object to a file with advisory locking.
 * Ensures the directory exists before writing.
 */
export async function saveJson<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectory(dir);

  // Ensure the file exists so we can lock it
  try {
    await fs.access(filePath);
  } catch (e: unknown) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.writeFile(filePath, "{}", "utf-8");
    }
  }

  const release = await lockfile.lock(filePath, { retries: 5 });
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } finally {
    await release();
  }
}

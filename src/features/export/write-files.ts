import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { ExportedEdition } from "../../db/repository";
import { SOURCES, type Source } from "../fortune/domain";

const pathSchema = z.object({ source: z.enum(SOURCES), editionDate: z.iso.date() });

export function editionFilePath(edition: { source: Source; editionDate: string }): string {
  const { source, editionDate } = pathSchema.parse(edition);
  return `editions/${source}/${editionDate.slice(0, 4)}/${editionDate}.json`;
}

export async function writeExportFiles(payload: { editions: ExportedEdition[] }, rootDir: string): Promise<{ written: number; unchanged: number }> {
  const paths = payload.editions.map(editionFilePath);
  let written = 0;
  let unchanged = 0;
  for (const [i, edition] of payload.editions.entries()) {
    const path = join(rootDir, paths[i]);
    const content = JSON.stringify(edition, null, 2) + "\n";
    let existing: string | undefined;
    try { existing = await readFile(path, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (existing === content) { unchanged++; continue; }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
    written++;
  }
  return { written, unchanged };
}

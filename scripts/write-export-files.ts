import { readFile } from "node:fs/promises";
import { writeExportFiles } from "../src/features/export/write-files";

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Expected export JSON and private repository directory");
  let payload;
  try {
    payload = JSON.parse(await readFile(input, "utf8"));
  } catch {
    throw new Error("Invalid export JSON");
  }
  if (!Array.isArray(payload.editions)) throw new Error("Invalid export response");
  const { written, unchanged } = await writeExportFiles(payload, output);
  console.log(`written=${written} unchanged=${unchanged}`);
}
main().catch(() => {
  console.error("export file write failed");
  process.exitCode = 1;
});

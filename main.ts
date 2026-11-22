/*
 * main.ts — validate entry.png and copy it into an output directory.
 *
 * What it does:
 *   Reads entry.png from the directory containing this script and writes an
 *   identical copy named entry.png into the directory named by the
 *   MAKEFUN_OUTPUT_DIR environment variable. The output directory is created
 *   (recursively) if it does not exist. The source file is never modified.
 *   On success, prints one line with the number of bytes copied.
 *
 * Validation of the source (before anything is written):
 *   1. The file must not be empty (0 bytes).
 *   2. The file must be at most 1 MiB (1048576 bytes). The size is checked
 *      with stat() before reading, and again on the bytes actually read.
 *   3. The first 8 bytes must be the PNG signature
 *      0x89 'P' 'N' 'G' 0x0D 0x0A 0x1A 0x0A.
 *   The validated bytes held in memory are exactly what gets written, so the
 *   output cannot differ from what was checked even if the source changes
 *   mid-run.
 *
 * Verification of the output (after writing):
 *   The written file is read back and must be non-empty, at most 1 MiB,
 *   start with the PNG signature, and be byte-identical to the source bytes.
 *   If the read-back or any of these checks fails, the bad output file is
 *   deleted before exiting with code 1, and the error message says so. If the
 *   deletion itself fails, the exit code is still 1 and the message says why.
 *
 * Requirements:
 *   Node 22+. Uses only built-in node: modules; no npm dependencies and no
 *   network access.
 *
 * How to run:
 *   MAKEFUN_OUTPUT_DIR=/path/to/out node --experimental-strip-types main.ts
 *
 * Exit codes:
 *   0  success
 *   1  MAKEFUN_OUTPUT_DIR is not set, a source or output check failed, or an
 *      I/O error occurred. A message starting with "error:" goes to stderr.
 */

import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FILE_NAME = "entry.png";
const MAX_BYTES = 1048576; // 1 MiB
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

class ValidationError extends Error {}

/** Throws ValidationError if `bytes` is not a non-empty PNG within the size limit. */
function validatePng(bytes: Buffer, label: string): void {
  if (bytes.length === 0) {
    throw new ValidationError(`${label} is empty (0 bytes)`);
  }
  if (bytes.length > MAX_BYTES) {
    throw new ValidationError(
      `${label} is ${bytes.length} bytes, which exceeds the limit of ${MAX_BYTES} bytes (1 MiB)`,
    );
  }
  if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    const head = bytes.subarray(0, PNG_SIGNATURE.length).toString("hex").replace(/(..)(?!$)/g, "$1 ");
    throw new ValidationError(
      `${label} does not start with the PNG signature (expected 89 50 4e 47 0d 0a 1a 0a, got ${head})`,
    );
  }
}

async function main(): Promise<void> {
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (!outputDir) {
    throw new ValidationError("MAKEFUN_OUTPUT_DIR environment variable is not set");
  }

  const source = path.join(import.meta.dirname, FILE_NAME);
  const destDir = path.resolve(outputDir);
  const destination = path.join(destDir, FILE_NAME);

  // Reject oversized files before loading them into memory.
  const { size: sourceSize } = await stat(source);
  if (sourceSize > MAX_BYTES) {
    throw new ValidationError(
      `source ${source} is ${sourceSize} bytes, which exceeds the limit of ${MAX_BYTES} bytes (1 MiB)`,
    );
  }

  const sourceBytes = await readFile(source);
  validatePng(sourceBytes, `source ${source}`);

  // Copying a file onto itself is pointless; skip it so the source is never touched.
  if (path.resolve(source) === destination) {
    process.stdout.write(`${FILE_NAME} already in ${destDir} (${sourceBytes.length} bytes)\n`);
    return;
  }

  await mkdir(destDir, { recursive: true });
  await writeFile(destination, sourceBytes);

  let outputBytes: Buffer;
  try {
    outputBytes = await readFile(destination);
    verifyOutput(outputBytes, sourceBytes, destination);
  } catch (err) {
    throw await removeBadOutput(destination, err);
  }

  process.stdout.write(`copied ${FILE_NAME} to ${destination} (${outputBytes.length} bytes)\n`);
}

/** Throws ValidationError unless `outputBytes` is a valid PNG identical to `sourceBytes`. */
function verifyOutput(outputBytes: Buffer, sourceBytes: Buffer, destination: string): void {
  validatePng(outputBytes, `output ${destination}`);
  if (!outputBytes.equals(sourceBytes)) {
    throw new ValidationError(
      `output ${destination} is not byte-identical to the source ` +
        `(source ${sourceBytes.length} bytes, output ${outputBytes.length} bytes)`,
    );
  }
}

/**
 * Deletes an output file that failed verification and returns an Error whose
 * message explains the original failure and whether the bad file was removed.
 */
async function removeBadOutput(destination: string, cause: unknown): Promise<Error> {
  const reason = cause instanceof Error ? cause.message : String(cause);
  try {
    await rm(destination, { force: true });
  } catch (rmErr: unknown) {
    const rmReason = rmErr instanceof Error ? rmErr.message : String(rmErr);
    return new Error(`${reason}; additionally, failed to remove bad output ${destination}: ${rmReason}`);
  }
  return new Error(`${reason}; the bad output ${destination} was removed`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
});

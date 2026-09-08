import { zip, type Zippable } from "fflate";
import { downloadToolcraftArtifact } from "./artifact-download";
export type ToolcraftArchiveEntry = Readonly<{ path: string; bytes: Uint8Array }>;
export type ToolcraftArchiveRequest = Readonly<{ baseFileName: string; entries: readonly ToolcraftArchiveEntry[] }>;
export const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
export function encodeToolcraftArchive(entries: readonly ToolcraftArchiveEntry[]): Promise<Uint8Array> {
  if (!entries.length || entries.length > 16) throw new Error("Archive must contain between 1 and 16 files.");
  const files: Zippable = Object.create(null);
  const names = new Set<string>();
  let size = 0;
  for (const entry of entries) {
    if (!/^[a-zA-Z0-9_-]+(?:[./-][a-zA-Z0-9_-]+)*$/.test(entry.path) ||
        entry.path.split("/").some(p => p === "." || p === "..") ||
        names.has(entry.path.toLowerCase())) throw new Error("Invalid or duplicate archive path.");
    names.add(entry.path.toLowerCase());
    size += entry.bytes.byteLength;
    if (!entry.bytes.byteLength || size > MAX_ARCHIVE_BYTES) throw new Error("Archive is empty or exceeds 128 MiB.");
    files[entry.path] = [entry.bytes.slice(), { level: /\.(png|jpe?g)$/i.test(entry.path) ? 0 : 6 }];
  }
  return new Promise((resolve, reject) => zip(files, (error, bytes) => error ? reject(error) : resolve(bytes)));
}
export async function downloadToolcraftArchive(request: ToolcraftArchiveRequest, reportProgress: (value: number) => void): Promise<void> {
  reportProgress(0.55);
  const bytes = await encodeToolcraftArchive(request.entries);
  reportProgress(0.95);
  downloadToolcraftArtifact({ blob: new Blob([new Uint8Array(bytes).buffer], { type: "application/zip" }), extension: ".zip", rawBaseFileName: request.baseFileName });
  reportProgress(1);
}

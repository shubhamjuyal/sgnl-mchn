import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface BlobStore {
  put(payload: Buffer | string, ext?: string): Promise<string>; // returns ref
  get(ref: string): Promise<Buffer>;
}

class DiskBlobStore implements BlobStore {
  constructor(private root: string) {}

  private pathFor(ref: string) {
    return join(this.root, ref);
  }

  async put(payload: Buffer | string, ext = "bin") {
    const buf = typeof payload === "string" ? Buffer.from(payload) : payload;
    const hash = createHash("sha256").update(buf).digest("hex");
    const ref = `${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}.${ext}`;
    const path = this.pathFor(ref);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buf);
    return ref;
  }

  async get(ref: string) {
    return readFile(this.pathFor(ref));
  }
}

export function createBlobStore(): BlobStore {
  const root = process.env.BLOB_STORE_PATH ?? "./var/blobs";
  return new DiskBlobStore(root);
}

export const blob = createBlobStore();

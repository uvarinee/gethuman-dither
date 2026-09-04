import type { RasterPixels } from "./dither-algorithms";
import { decodeImageElement } from "./dither-renderer";

type SourceLease = { users: number; promise: Promise<HTMLImageElement>; pixels?: Promise<RasterPixels>; releaseImage: () => void };
const sources = new Map<string, SourceLease>();

export function retainDitherSource(resourceRef: string, url: string) {
  let entry = sources.get(resourceRef);
  if (!entry) {
    const image = new Image();
    image.decoding = "async";
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The source image could not be decoded. Re-import it and try again."));
      image.src = url;
    });
    entry = { users: 0, promise, releaseImage: () => { image.onload = null; image.onerror = null; image.src = ""; } };
    sources.set(resourceRef, entry);
  }
  entry.users += 1;
  const lease = entry;
  return { promise: lease.promise, release: () => {
    lease.users -= 1;
    if (lease.users === 0) { sources.delete(resourceRef); void lease.promise.then(lease.releaseImage, lease.releaseImage); }
  } };
}

export function getDitherSourcePixels(resourceRef: string): Promise<RasterPixels> {
  const source = sources.get(resourceRef);
  if (!source) return Promise.reject(new Error("The current source is not ready for export. Wait for its preview or re-import the image."));
  return source.pixels ??= source.promise.then(decodeImageElement);
}

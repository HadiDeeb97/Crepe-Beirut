/*
 * WebP encoder for browsers that can't make WebP pictures themselves (Safari on iPhone and Mac).
 * The encoder is libwebp compiled to WebAssembly, from Google's Squoosh via @jsquash/webp 1.5.0
 * (Apache-2.0, see LICENSE and LICENSE.codec.md). It is only downloaded when it's needed.
 */
import Module from "./webp_enc.js";
import { defaultOptions } from "./meta.js";

let ready = null;

/** ImageData → WebP bytes (ArrayBuffer). quality 0–100. */
export default async function encodeWebp(imageData, quality = 82) {
  ready = ready || Module({ noInitialRun: true });
  const m = await ready;
  const out = m.encode(imageData.data, imageData.width, imageData.height, { ...defaultOptions, quality });
  if (!out) throw new Error("WebP encoding failed.");
  return out.buffer;
}

// A short, stable tag for "is this the same value as last time". FNV-1a over the JSON form, base36.
// Not collision-resistant and not meant to be: it keys a cache and labels a config in the research
// data. Anything that needs a real digest needs a real hash.

/** FNV-1a 32-bit of `JSON.stringify(value)`, base36. Same answer in the browser and in Vitest. */
export const fingerprint = (value: unknown) => {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

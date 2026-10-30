/** Read a previous IndexedDB SQLite file once, when its OPFS replacement is absent. */
export async function readLegacyDatabase(name) {
  const databases = await indexedDB.databases();
  if (!databases.some((db) => db.name === "yaak-idb")) return null;
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("yaak-idb");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    const blocks = await new Promise((resolve, reject) => {
      const tx = db.transaction("blocks", "readonly");
      const request = tx.objectStore("blocks").getAll();
      tx.oncomplete = () => resolve(request.result.filter((block) => block.path === name));
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Database migration read aborted"));
    });
    if (!blocks.length) return null;
    blocks.sort((a, b) => a.offset - b.offset);
    const size = blocks.reduce((total, block) => total + block.data.byteLength, 0);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const block of blocks) {
      if (block.offset !== offset) throw new Error(`Incomplete SQLite file: ${name}`);
      bytes.set(new Uint8Array(block.data), offset);
      offset += block.data.byteLength;
    }
    return bytes;
  } finally {
    db.close();
  }
}

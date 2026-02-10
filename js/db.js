export const DB = {
  dbName: "HabitHeroDB",
  version: 6,

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains("tasks")) {
          const taskStore = db.createObjectStore("tasks", {
            keyPath: "id",
            autoIncrement: true,
          });
          taskStore.createIndex("by_date", "date", { unique: false });
          taskStore.createIndex("by_done", "done", { unique: false });
        } else {
          const store = e.target.transaction.objectStore("tasks");
          if (!store.indexNames.contains("by_done")) {
            store.createIndex("by_done", "done", { unique: false });
          }
        }

        if (!db.objectStoreNames.contains("habits")) {
          db.createObjectStore("habits", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("goals")) {
          db.createObjectStore("goals", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("stats")) {
          db.createObjectStore("stats", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata");
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async get(storeName, id) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).get(id);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    });
  },

  async getAll(storeName) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      tx.objectStore(storeName).getAll().onsuccess = (e) =>
        resolve(e.target.result);
    });
  },

  async getAllFromIndex(storeName, indexName, query) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllUnfinished(storeName) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index("by_done");

      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  },

  async put(storeName, item, key) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = key ? store.put(item, key) : store.put(item);
      request.onsuccess = () => resolve(true);
    });
  },

  async delete(storeName, id) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(id).onsuccess = () => resolve(true);
    });
  },
};

export const DB = {
    dbName: "HabitHeroDB",
    version: 2,
  
    open() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
  
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          
          if (!db.objectStoreNames.contains("tasks")) {
            const taskStore = db.createObjectStore("tasks", { keyPath: "id", autoIncrement: true });
            taskStore.createIndex("by_date", "date", { unique: false });
            taskStore.createIndex("by_done", "done", { unique: false });
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
        tx.objectStore(storeName).getAll().onsuccess = (e) => resolve(e.target.result);
      });
    },
  
    async put(storeName, item) {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(item).onsuccess = () => resolve(true);
      });
    },

    async delete(storeName, id) {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(id).onsuccess = () => resolve(true);
      });
    },
  
    // Specjalna funkcja dla Service Workera (liczenie zadań na dany dzień)
    async countUndoneTasks(dateKey) {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction("tasks", "readonly");
        const store = tx.objectStore("tasks");
        const index = store.index("by_date");
        const request = index.getAll(IDBKeyRange.only(dateKey));
  
        request.onsuccess = (e) => {
          const tasks = e.target.result;
          const undone = tasks.filter(t => !t.done).length;
          resolve(undone);
        };
      });
    }
  };
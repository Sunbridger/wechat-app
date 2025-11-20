import { Contact, Message, Moment, Sticker, User } from '../types';

const DB_NAME = 'WeChatCloneDB';
const DB_VERSION = 1;

// Store names
const STORE_SYSTEM = 'system'; // For currentUser, peerId
const STORE_CONTACTS = 'contacts';
const STORE_MESSAGES = 'messages'; // key: contactId, value: Message[]
const STORE_MOMENTS = 'moments';
const STORE_STICKERS = 'stickers';

export const dbService = {
  db: null as IDBDatabase | null,

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject("Error opening database");
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORE_SYSTEM)) {
          db.createObjectStore(STORE_SYSTEM);
        }
        if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
          db.createObjectStore(STORE_CONTACTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          // We store messages grouped by contactId
          db.createObjectStore(STORE_MESSAGES); 
        }
        if (!db.objectStoreNames.contains(STORE_MOMENTS)) {
          db.createObjectStore(STORE_MOMENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_STICKERS)) {
          db.createObjectStore(STORE_STICKERS, { keyPath: 'id' });
        }
      };
    });
  },

  // --- Generic Helpers ---

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async put(storeName: string, value: any, key?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = key ? store.put(value, key) : store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear(storeName: string): Promise<void> {
      return new Promise((resolve, reject) => {
          if (!this.db) return reject("DB not initialized");
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  },

  async delete(storeName: string, key: string): Promise<void> {
      return new Promise((resolve, reject) => {
          if (!this.db) return reject("DB not initialized");
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  },

  // --- Specific Data Handlers ---

  // User
  async getUser(): Promise<User | undefined> {
    return this.get<User>(STORE_SYSTEM, 'currentUser');
  },
  async saveUser(user: User): Promise<void> {
    return this.put(STORE_SYSTEM, user, 'currentUser');
  },

  // Peer ID
  async getPeerId(): Promise<string | undefined> {
      return this.get<string>(STORE_SYSTEM, 'peerId');
  },
  async savePeerId(id: string): Promise<void> {
      return this.put(STORE_SYSTEM, id, 'peerId');
  },

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return this.getAll<Contact>(STORE_CONTACTS);
  },
  async saveContacts(contacts: Contact[]): Promise<void> {
    // For simplicity, we clear and rewrite or put one by one. 
    // Transaction guarantees consistency.
    return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction([STORE_CONTACTS], 'readwrite');
        const store = transaction.objectStore(STORE_CONTACTS);
        
        // Careful: contacts might be deleted in app, so we need to sync correctly.
        // Simplest approach for this scale: clear store, add all current contacts.
        store.clear().onsuccess = () => {
             let processed = 0;
             if (contacts.length === 0) resolve();
             contacts.forEach(c => {
                 store.put(c).onsuccess = () => {
                     processed++;
                     if (processed === contacts.length) resolve();
                 };
             });
        };
    });
  },

  // Messages
  // Stored as Key: contactId, Value: Message[]
  async getMessagesMap(): Promise<Record<string, Message[]>> {
      return new Promise((resolve, reject) => {
          if (!this.db) return reject("DB not initialized");
          const transaction = this.db.transaction([STORE_MESSAGES], 'readonly');
          const store = transaction.objectStore(STORE_MESSAGES);
          const request = store.openCursor();
          const messagesMap: Record<string, Message[]> = {};

          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result;
              if (cursor) {
                  messagesMap[cursor.key as string] = cursor.value;
                  cursor.continue();
              } else {
                  resolve(messagesMap);
              }
          };
          request.onerror = () => reject(request.error);
      });
  },
  
  async saveMessages(messagesMap: Record<string, Message[]>): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction([STORE_MESSAGES], 'readwrite');
        const store = transaction.objectStore(STORE_MESSAGES);
        
        // Sync: put each entry
        const entries = Object.entries(messagesMap);
        if (entries.length === 0) resolve();
        
        let processed = 0;
        entries.forEach(([contactId, msgs]) => {
            store.put(msgs, contactId).onsuccess = () => {
                processed++;
                if (processed === entries.length) resolve();
            }
        });
        // Note: This doesn't handle deletion of entire conversation history keys if they are removed from the map in App.tsx (though handleDeleteChat handles that logic separately via logic below).
      });
  },
  
  async deleteMessagesForContact(contactId: string): Promise<void> {
      return this.delete(STORE_MESSAGES, contactId);
  },

  // Moments
  async getMoments(): Promise<Moment[]> {
      return this.getAll<Moment>(STORE_MOMENTS);
  },
  async saveMoments(moments: Moment[]): Promise<void> {
     return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction([STORE_MOMENTS], 'readwrite');
        const store = transaction.objectStore(STORE_MOMENTS);
        store.clear().onsuccess = () => {
             let processed = 0;
             if (moments.length === 0) resolve();
             moments.forEach(m => {
                 store.put(m).onsuccess = () => {
                     processed++;
                     if (processed === moments.length) resolve();
                 };
             });
        };
    });
  },

  // Stickers
  async getStickers(): Promise<Sticker[]> {
      return this.getAll<Sticker>(STORE_STICKERS);
  },
  async saveStickers(stickers: Sticker[]): Promise<void> {
     return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const transaction = this.db.transaction([STORE_STICKERS], 'readwrite');
        const store = transaction.objectStore(STORE_STICKERS);
        store.clear().onsuccess = () => {
             let processed = 0;
             if (stickers.length === 0) resolve();
             stickers.forEach(s => {
                 store.put(s).onsuccess = () => {
                     processed++;
                     if (processed === stickers.length) resolve();
                 };
             });
        };
    });
  }
};
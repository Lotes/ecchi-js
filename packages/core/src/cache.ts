export interface Cache<K, T> {
  hash: (key: K) => string;
  has: (hash: string) => boolean;
  get: (hash: string) => T|null;
  set: (hash: string, value: T) => void;
}

export class LRUCache<K, T> implements Cache<K, T> {
  private cache: Map<string, T> = new Map();
  private keys: string[] = [];

  constructor(private max: number) {}

  hash(key: K): string {
    return JSON.stringify(key);
  }

  has(hash: string): boolean {
    return this.cache.has(hash);
  }

  get(hash: string): T|null {
    if (this.cache.has(hash)) {
      this.keys = this.keys.filter((key) => key !== hash);
      this.keys.push(hash);
      return this.cache.get(hash)!;
    }
    return null;
  }

  set(hash: string, value: T): void {
    if (this.cache.size >= this.max) {
      const key = this.keys.shift();
      if (key) {
        this.cache.delete(key);
      }
    }
    this.cache.set(hash, value);
    this.keys.push(hash);
  }
}

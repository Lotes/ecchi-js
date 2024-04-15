export interface Cache {
  has: (hash: string) => boolean;
  get: (hash: string) => unknown|null;
  set: (hash: string, value: unknown) => void;
}

export class LRUCache implements Cache {
  private cache: Map<string, unknown> = new Map();
  private keys: string[] = [];

  constructor(private max: number) {}

  has(hash: string): boolean {
    return this.cache.has(hash);
  }

  get(hash: string): unknown|null {
    if (this.cache.has(hash)) {
      this.keys = this.keys.filter((key) => key !== hash);
      this.keys.push(hash);
      return this.cache.get(hash)!;
    }
    return null;
  }

  set(hash: string, value: unknown): void {
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

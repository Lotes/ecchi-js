export class Bitmask<S> {
  private readonly mask: Uint8Array;
  constructor(private readonly map: Map<S, {byteIndex: number, bitIndex: number}>) {
    this.mask = new Uint8Array(Math.ceil(map.size/8));
    this.mask.fill(0);
  }
  isSet(item: S) {
    if (!this.map.has(item)) {
      return false;
    }
    const {byteIndex, bitIndex} = this.map.get(item)!;
    return (this.mask[byteIndex] & (1 << (bitIndex))) !== 0;
  }
  set(...items: S[]) {
    items.filter((item) => this.map.has(item))
      .map((item) => this.map.get(item)!)
      .forEach(({byteIndex, bitIndex}) => {
        this.mask[byteIndex] |= (1 << bitIndex);
      });
  }
  unset(...items: S[]) {
    items.filter((item) => this.map.has(item))
      .map((item) => this.map.get(item)!)
      .forEach(({byteIndex, bitIndex}) => {
        this.mask[byteIndex] &= ~(1 << bitIndex);
      });
  }
  toItems() {
    return [...this.map.entries()]
      .filter(([_, {byteIndex, bitIndex}]) => (this.mask[byteIndex] & (1 << (bitIndex))) !== 0)
      .map(([item, _]) => item);
  }
}

export class BitmaskFactory<S> {
  private readonly map: Map<S, {byteIndex: number, bitIndex: number}>;
  constructor(map: Map<S, number>) {
    this.map = new Map([...map.entries()].map(([action, index]) => [action, {byteIndex: index / 8, bitIndex: index % 8}]));
  }
  createMask(...items: S[]) {
    const bitmask = new Bitmask(this.map);
    bitmask.set(...items);
    return bitmask;
  }
}
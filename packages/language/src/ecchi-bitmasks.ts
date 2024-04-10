import { AccessRuleMode } from "@ecchi-js/core";

export class Bitmask<S> {
  public static create<S>(items: S[]) {
    const itemsMap = new Map<S, number>(items.map((item, index) => [item, index]));
    return new Bitmask(itemsMap);
  }
  public static or<S>(...masks: Bitmask<S>[]) {
    const result = new Bitmask(masks[0].items);
    for (const mask of masks) {
      for (let index = 0; index < mask.mask.length; index++) {
        result.mask[index] |= mask.mask[index];
      }
    }
    return result;
  }
  private readonly mask: Uint8Array;
  private constructor(private items: Map<S, number>) {
    this.mask = new Uint8Array(Math.ceil(items.size*2/8));
    this.mask.fill(0);
  }
  clone() {
    const result = new Bitmask(this.items);
    result.mask.set(this.mask);
    return result;
  }
  isSet(item: S, mode: AccessRuleMode) {
    const bitIndices = this.getBitIndices(item, mode);
    if(bitIndices === undefined) {
      return false;
    }
    const {
      byteIndex,
      bitIndex
    } = bitIndices;
    return (this.mask[byteIndex] & (1 << bitIndex)) !== 0;
  }
  set(item: S, mode: AccessRuleMode, set: boolean) {
    const bitIndices = this.getBitIndices(item, mode);
    if(bitIndices === undefined) {
      return false;
    }
    const {
      byteIndex,
      bitIndex
    } = bitIndices;
    if(set) {
      this.mask[byteIndex] |= 1 << bitIndex;
    } else {
      this.mask[byteIndex] &= ~(1 << bitIndex);
    }
    return true;
  }
  private getBitIndices(item: S, mode: AccessRuleMode) {
    const index = this.items.get(item);
    if(index === undefined) {
      return undefined;
    }
    const bitOffset = index * 2  + (mode === "forbid" ? 1 : 0);
    const byteIndex = bitOffset >> 3;
    const bitIndex = bitOffset & 7;
    return { byteIndex, bitIndex };
  }
}

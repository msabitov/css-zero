import type { KeyGen, UtilityWithCounterType } from './types';
import { DEFAULT_PREFIX, UTIL_PREFIX } from './constants';
import { createKey } from './utils';

/**
 * Build name context: prefix plus monotonic counters
 */
export class KeyGenerator implements KeyGen {
    prefix: string;
    counters: Record<UtilityWithCounterType, number> = {
        id: 0,
        className: 0,
        variable: 0,
        animation: 0,
        layer: 0,
        container: 0,
        font: 0,
    };

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    protected _nextKey = <T extends UtilityWithCounterType>(type: T) =>
        createKey(this.prefix, UTIL_PREFIX[type], ++this.counters[type]);

    /**
     * CSS class name
     */
    get className() {
        return this._nextKey('className');
    }
    /**
     * Same as className, also a selector
     */
    get classSelector() {
        return this._nextKey('className');
    }
    /**
     * Animation keyframe name
     */
    get animation() {
        return this._nextKey('animation');
    }
    /**
     * CSS custom property token (without `--` prefix)
     */
    get variable() {
        return this._nextKey('variable');
    }
    /**
     * Cascade layer name
     * */
    get layer() {
        return this._nextKey('layer');
    }
    /**
     * Container query name
     */
    get container() {
        return this._nextKey('container');
    }
    /**
     * Font-family name
     */
    get font() {
        return this._nextKey('font');
    }
    /**
     * HTML id name
     */
    get id() {
        return this._nextKey('id');
    }
    /**
     * Same as id, also a selector
     */
    get idSelector() {
        return this._nextKey('id');
    }
}

/**
 * Create key generator
 */
export function createKeyGen(prefix: string = DEFAULT_PREFIX): KeyGen {
    return new KeyGenerator(prefix);
}

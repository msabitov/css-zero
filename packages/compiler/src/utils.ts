import type { ChunkType } from './types';
import { PACKAGE_NAME, CHUNKS_ORDER } from './constants';

/**
 * Narrow a value to a plain keyed object (non-null, non-array)
 */
export const isObject = (val: unknown): val is Record<string, unknown> =>
    val !== null && typeof val === 'object' && !Array.isArray(val);

/**
 * Own-property check that is safe across prototypes
 */
export const hasOwn = (obj: object, prop: PropertyKey): boolean =>
    Object.prototype.hasOwnProperty.call(obj, prop);

const kebabCache = new Map<string, string>();

/**
 * Convert a camelCase key to kebab-case (`backgroundColor` → `background-color`)
 */
export const kebabCase = (str: string): string => {
    let k = kebabCache.get(str);
    if (!k) {
        k = str.replace(/[A-Z]/g, (v) => '-' + v.toLowerCase());
        kebabCache.set(str, k);
    }
    return k;
};

/**
 * Match contract modules by `.css.ts`/`.css.js` extension
 */
export function isContractFile(filename: string): boolean {
    return /\.css\.(t|j)s$/i.test(filename);
}

/**
 * True for the css-zero runtime module (named or subpath import)
 */
export function isCSSZeroImport(specifier: string): boolean {
    return specifier === PACKAGE_NAME || specifier.startsWith(PACKAGE_NAME + '/');
}

/**
 * Order CSS fragments by category
 */
export function orderChunks(
    cssByType: Partial<Record<ChunkType, string[]>>
): string[] {
    return CHUNKS_ORDER.flatMap((type) => cssByType[type] ?? []);
}

/**
 * Create special key
 * @param prefix - build prefix
 * @param type - key type
 * @param counter  - key counter
 */
export function createKey(prefix: string, type: string, counter: number) {
    return `${prefix}-${type}_${(counter).toString(36)}`;
}

/**
 * Get key regexp
 * @param prefix - plugin prefix
 */
export function getKeyRegExp(prefix: string) {
    const prepared = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
        `${prepared}-(?:s|a|v|c|l|f|i)_[0-9a-z]+`,
        'g'
    );
}

/**
 * Find special keys by RegExp
 * @param source - source string
 * @param regexp - RegExp
 */
export function findKeysByRegExp(source: string, regexp: RegExp): string[] {
    const keys = Array.from(source.matchAll(regexp), (m) => m[0]);
    return [...new Set(keys)];
}

/**
 * Extract clear keys from deps
 */
export function parseDeps(deps: string[], prefix: string): string[] {
    const regexp = getKeyRegExp(prefix);
    const keys = deps.reduce((acc, key) => {
        acc.push(...findKeysByRegExp(key, regexp));
        return acc;
    }, [] as string[]);
    return [...(new Set(keys)).keys()];
}

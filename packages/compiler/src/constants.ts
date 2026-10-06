import type { ChunkType, UtilityWithCounterType } from './types';

/**
 * Package scope
 */
export const SCOPE = 'css-zero';
export const PACKAGE_NAME = `@${SCOPE}/core`;
export const DEFAULT_PREFIX = 'o';
export const ID = 'id';
export const ID_SELECTOR = 'idSelector';
export const CLASSNAME = 'className';
export const CLASS_SELECTOR = 'classSelector';
export const VARIABLE = 'variable';
export const ANIMATION = 'animation';
export const LAYER = 'layer';
export const CONTAINER = 'container';
export const FONT = 'font';
export const VARIANTS = 'variants';
export const STYLE = 'style';
export const THEME = 'theme';

/**
 * Package utils
 */
export const UTILS: ReadonlySet<string> = new Set([
    ID,
    ID_SELECTOR,
    CLASSNAME,
    CLASS_SELECTOR,
    VARIABLE,
    ANIMATION,
    LAYER,
    CONTAINER,
    FONT,
    VARIANTS,
    STYLE,
    THEME
]);
/**
 * Conditional utils
 */
export const CONDITIONAL_UTILS = new Set([STYLE]);
/**
 * Utils prefixes
 */
export const UTIL_PREFIX: Readonly<Record<UtilityWithCounterType, string>> = {
    className: 's',
    animation: 'a',
    variable: 'v',
    layer: 'l',
    id: 'i',
    container: 'c',
    font: 'f',
};

/**
 * Order of categories for final CSS assembly
 */
export const CHUNKS_ORDER: readonly ChunkType[] = [
    'layer',
    'font',
    'variable',
    'animation',
    'other'
];

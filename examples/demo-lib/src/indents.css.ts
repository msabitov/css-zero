/**
 * Indents utils
 */
import { className } from '@css-zero/core';
import { small, medium, large } from './vars.css';

/**
 * Small padding
 */
export const paddingSm = className({
    padding: small
});

/**
 * Medium padding
 */
export const paddingMd = className({
    padding: medium
});

/**
 * Large padding
 */
export const paddingLg = className({
    padding: large
});

/**
 * Small left and right padding
 */
export const paddingSmX = className({
    padding: `0 ${small}`
});

/**
 * Medium left and right padding
 */
export const paddingMdX = className({
    padding: `0 ${medium}`
});

/**
 * Large left and right padding
 */
export const paddingLgX = className({
    padding: `0 ${large}`
});

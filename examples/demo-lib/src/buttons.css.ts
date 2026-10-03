/**
 * Button styles
 */
import { className, classSelector, style, variable, variants } from '@css-zero/core';
import { primary, secondary } from './vars.css';

/**
 * Border radius
 */
export const [radiusKey, radius] = variable('1rem');

/**
 * Button
 */
export const [btn, btnSelector] = classSelector({
    background: 'transparent',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '1rem',
    padding: '0.5rem 1rem',
    borderRadius: 0,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'border-radius 300ms ease',
    '&:hover': {
        borderRadius: `calc(${radius} * 1.5)`,
    }
});

/**
 * Button background variants
 */
export const btnBg = variants(
    {
        primary: {
            background: primary,
            color: '#fff'
        },
        ghost: {
            background: secondary,
            color: '#fff'
        },
    },
    btn
);

/**
 * Conditional styles for buttons
 */
export const _btnConditional = style(
    {
        [`${btnSelector}:disabled`]: {
            opacity: 0.5,
            cursor: 'not-allowed'
        },
        [`${btnSelector}:focus-visible`]: {
            outline: '2px solid currentColor',
            outlineOffset: '2px'
        },
    },
    [btn]
);

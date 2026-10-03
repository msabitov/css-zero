import { animation, className, classSelector, style, variable, variants } from '@css-zero/core';
import { btn } from '@css-zero/demo-lib/buttons';

/**
 * Accent color
 */
export const [accentKey, accent] = variable('#2b6cb0');

/**
 * Background color animation
 */
export const cardHover = animation({
    from: { background: '#f5f5f5', color: accent },
    to: { background: accent, color: '#fff' },
});

/**
 * Card
 */
export const [card, cardSelector] = classSelector({
    display: 'block',
    padding: '16px',
    borderRadius: '8px',
    background: '#f5f5f5',
    color: accent,
});

/**
 * Card title
 */
export const [title, titleSelector] = classSelector({
    fontWeight: 'bold'
});

/*
 * Card radius variants
 */
export const cardSize = variants({
    sm: { borderRadius: '8px' },
    md: { borderRadius: '16px' },
    lg: { borderRadius: '24px' },
});

/**
 * Conditional card styles
 */
export const _cardConditional = style(
    {
        [`${cardSelector}:hover`]: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: `${cardHover} 0.3s ease forwards`,
            border: 'none'
        },
    },
    [card]
);

/**
 * Conditional card title styles
 */
export const _cardTitleConditional = style(
    {
        [`${cardSelector} > ${titleSelector}`]: {
            margin: '10px auto',
            width: 'max-content'
        },
    },
    [card, title]
);

/**
 * Transformed card
 */
export const transformedCard = className({
    background: 'linear-gradient(45deg, #f00, #00f)',
    transform: 'rotate(180deg)',
});

/**
 * Background variants
 */
export const bgVariants = variants({
    danger: { background: '#c00', color: '#fff' },
    success: { background: '#0a0', color: '#fff' },
});

/**
 * Conditional transformed card styles
 */
export const _transformedCardConditional = style(
    {
        [`.${transformedCard}:hover`]: { opacity: 0.5 },
    },
    [transformedCard]
);

export const _cardDeps = style(
    { '.card-dep': { display: 'block' } },
    [card]
);

export const _tfCardDeps = style(
    { '.tf-card-dep': { display: 'none' } },
    [transformedCard]
);

export const _cardAndBtnDep = style(
    { '.card-and-btn-dep': { position: 'relative' } },
    [card, btn]
);

export const _bothCardsDep = style(
    { '.both-cards-dep': { position: 'fixed' } },
    [card, transformedCard]
);

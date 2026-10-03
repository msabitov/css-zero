/**
 * CSS-Zero core package
 */
import type * as CSS from 'csstype';

// types
declare global {
    namespace CSSZero {
        /**
         * Extension hook: merge your own custom CSS props / values into
         * `CSSZero.ExtraProperties` (interface declaration merging).
         */
        interface ExtraProperties {}
        /**
         * CSS properties
         *
         * Base property set from `csstype` with string/number values.
         * Extended by users via `CSSZero.ExtraProperties`.
         */
        interface Properties
            extends CSS.Properties<string | number>, ExtraProperties {}
        /**
         * Style rule
         */
        interface Rule extends Properties {
            [selector: string]: Rule | string | number | undefined | string[];
        }
        /**
         * StyleSheet content
         */
        type StyleSheet = {
            [selector: string]: Rule | Rule[] | '';
        };
        /**
         * Variable config
         */
        type VariableConfig = {
            syntax?: string;
            inherits?: boolean;
            initialValue?: string | number | boolean | null;
        };
        /**
         * Animation config
         */
        type AnimationConfig = Record<string, Properties>;
        /**
         * Font config
         */
        type FontConfig = {
            /**
             * References to font resources
             */
            src: string;
            /**
             * Font-display
             */
            display?: string;
            /**
             * Font-stretch
             */
            stretch?: string;
            /**
             * Font-style
             */
            style?: string;
            /**
             * Font-weight
             */
            weight?: string | number;
            /**
             * Font-variant
             */
            variant?: string;
            /**
             * Font-feature-settings
             */
            featureSettings?: string;
            /**
             * Font-variation-settings
             */
            variationSettings?: string;
            /**
             * Unicode-range
             */
            unicodeRange?: string;
            /**
             * Size-adjust
             */
            sizeAdjust?: string;
        };
        /**
         * Container type
         */
        type ContainerType =
            | ''
            | 'normal'
            | 'inline-size'
            | 'size'
            | 'anchored'
            | 'scroll-state'
            | 'inline-size scroll-state'
            | 'size scroll-state';
    }
}
/**
 * Create id
 * @param rule - rule content
 * @returns Unique id token
 */
export type Id = (rule?: CSSZero.Rule) => string;
/**
 * Create id and derived selector
 * @param rule - rule content
 * @returns `[token, selector]` tuple
 */
export type IdSelector = (rule?: CSSZero.Rule) => [string, string];
/**
 * Create classname
 * @param rule - rule content
 * @returns Unique classname token
 */
export type ClassName = (rule?: CSSZero.Rule) => string;
/**
 * Create classname and derived selector
 * @param rule - rule content
 * @returns `[token, selector]` tuple
 */
export type ClassSelector = (rule?: CSSZero.Rule) => [string, string];
/**
 * Create variable (custom property)
 * @param config - variable config or value
 * @returns `[name, var(name)]` tuple
 */
export type Variable = (
    config?: CSSZero.VariableConfig | string | number | boolean | null
) => [string, string];
/**
 * Create animation (@keyframes)
 * @param config - keyframes config
 * @returns Unique keyframes token
 */
export type Animation = (config?: CSSZero.AnimationConfig) => string;
/**
 * Create font (@font-face)
 * @param config - font config
 * @returns Unique font-family token
 */
export type Font = (config?: CSSZero.FontConfig | string) => string;
/**
 * Create container (@container)
 * @param type - container type
 * @returns `[container, query]` tuple
 */
export type Container = (type?: CSSZero.ContainerType) => [string, string];
/**
 * Create layer (@layer)
 * @returns Unique cascade layer selector
 */
export type Layer = () => string;
/**
 * Create styles
 * 
 * Without deps — unconditional global styles.
 * With deps — emitted only if ALL deps are in the bundle.
 * 
 * @param content - style rules
 * @param deps - tokens that must be in the bundle to emit the content param
 * @return empty string that should be exported when packing styles into isolated lib
 */
export type Style = (content: CSSZero.StyleSheet, deps?: string[]) => string;
/**
 * Create style variants
 * @param config - style variations
 * @param base - optional base token
 * @return object with mapped variants and selectors
 */
export type Variants = <T extends string>(
    config: Record<T, CSSZero.Rule>,
    base?: string
) => Record<T, string>;
/**
 * Create theme
 * @param vars - theme variables
 * @param options - theme variants (axis)
 * @return `[{ var1: 'var(name1)', ... }, {opt1: '.cls1', ...}]` touple
 */
export type Theme = <T extends string, O extends string>(
    vars: Record<T, CSSZero.Rule | string | number>,
    options: Record<O, Partial<Record<T, CSSZero.Rule | string | number>>>
) => [Record<T, string>, Record<O, string>];

// individual rules

/**
 * Create id
 * @param rule - rule content
 * @returns Unique id token
 *
 * @example
 * `const badge = id({ backgroundColor: 'red' });` // → '@/badge...'
 */
export const id: Id = (_) => '';
/**
 * Create id and derived selector
 * @param rule - rule content
 * @returns `[token, selector]` tuple
 *
 * @example
 * `const [id, selector] = idSelector({ backgroundColor: 'red' });` // selector = '#o-i_1'
 */
export const idSelector: IdSelector = (_) => ['', ''];
/**
 * Create classname
 * @param rule - rule content
 * @returns Unique classname token
 *
 * @example
 * `const btn = className({ color: 'white' });` // → 'o-s_1' (runtime: '')
 */
export const className: ClassName = (_) => '';
/**
 * Create classname and derived selector
 * @param rule - rule content
 * @returns `[token, selector]` tuple
 *
 * @example
 * `const [name, selector] = classSelector({ display: 'grid' });` // selector = '.o-s_1'
 */
export const classSelector: ClassSelector = (_) => ['', ''];
/**
 * Create variable (custom property)
 * @param config - variable config or value
 * @returns `[name, var(name)]` tuple
 *
 * @example
 * `const [accent, varAccent] = variable('#ff0');` // ['--o-v_1', 'var(--o-v_1)']
 */
export const variable: Variable = (_) => ['', ''];
/**
 * Create animation (@keyframes)
 * @param config - keyframes config
 * @returns Unique keyframes token
 *
 * @example
 * `const spin = animation({ from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } });`
 */
export const animation: Animation = (_) => '';
/**
 * Create layer (@layer)
 * @returns Unique cascade layer selector
 *
 * @example
 * `const base = layer();` // → '@layer o-l_1'
 */
export const layer: Layer = () => '';
/**
 * Create font (@font-face)
 * @param config - font config
 * @returns Unique font-family token
 *
 * @example
 * `const Inter = font({ src: "url('/inter.woff2')" });`
 */
export const font: Font = (_) => '';
/**
 * Create container (@container)
 * @param type - container type
 * @returns `[container, query]` tuple
 *
 * @example
 * `const [card, cardRef] = container('inline-size');` // ['o-c_1 / inline-size', '@container o-c_1']
 */
export const container: Container = (_) => ['', ''];

// composed styles

/**
 * Create styles
 * 
 * Without deps — unconditional global styles.
 * With deps — emitted only if ALL deps are in the bundle.
 * 
 * @param content - style rules
 * @param deps - tokens that must be in the bundle to emit the content param
 * @return empty string that should be exported when packing styles into isolated lib
 *
 * @example
 * `style({ body: { margin: 0 } });` // → global
 * `const mobile = style({ [`${className1} > ${className2}`]: { padding: '8px' }}, [className1, className2]);` // → if both used
 */
export const style: Style = (_, __) => '';
/**
 * Create style variants
 * @param config - style variations
 * @param base - optional base token
 * @return object with mapped variants and selectors
 *
 * @example
 * `const tone = variants({ primary: { color: '#fff' }, ghost: { color: 'gray' } }, btn);`
 * `// → { primary: 'o-v_1', ghost: 'o-v_2' }`, and selector will be `.btn.primary`
 */
export const variants: Variants = (config: Record<string, unknown>) =>
    Object.entries(config).reduce(
        (acc, [key, _]) => {
            acc[key] = '';
            return acc;
        },
        {} as Record<string, string>
    );
/**
 * Create theme
 * @param vars - theme variables
 * @param options - theme variants (axis)
 * @return `[{ var1: 'var(name1)', ... }, {opt1: '.cls1', ...}]` touple
 *
 * @example
 * `const [tokens, themes] = theme({ accent: '#0af' }, { dark: { accent: '#0f0' } });`
 */
export const theme: Theme = (vars, opts) => [
    Object.entries(vars).reduce(
        (acc, [key, _]) => {
            acc[key] = '';
            return acc;
        },
        {} as Record<string, string>
    ),
    Object.entries(opts).reduce(
        (acc, [key, _]) => {
            acc[key] = '';
            return acc;
        },
        {} as Record<string, string>
    ),
];

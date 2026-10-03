import type { KeyGen, CSSChunk, Runtime, UtilityType } from './types';
import { isObject, hasOwn, kebabCase } from './utils';

const propVal = (prop: string, val: unknown): string =>
    `${kebabCase(prop)}:${'' + val};`;
const customProperty = (token: string): string => `--${token}`;
const prepareInitialValue = (arg: unknown): string =>
    arg !== null && arg !== undefined ? `initial-value:${arg};` : '';
const propertySyntaxList = [
    'angle', 'color', 'custom-ident', 'image', 'integer',
    'length', 'length-percentage', 'number', 'percentage',
    'resolution', 'string', 'time', 'transform-function',
    'transform-list', 'url'
];
const shortSyntax = propertySyntaxList.reduce((acc, key) => {
    acc[key] = `"<${key}>"`;
    return acc;
}, {'*': '"*"'} as Record<string, string>);

/**
 * Recursively collect style declarations
 */
const collect = (key: string, value: unknown, out: string[]): void => {
    const resKey = '' + key;
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) collect(resKey, value[i], out);
        return;
    }
    if (isObject(value)) {
        out.push(resKey, '{');
        for (const prop in value) {
            if (hasOwn(value, prop)) collect(prop, value[prop], out);
        }
        out.push('}');
    } else if (value === '') {
        out.push(resKey, ';');
    } else {
        out.push(propVal(resKey, value));
    }
};

/**
 * Serialize a styles object into native CSS
 */
export const parseStyles = (styles: unknown): string => {
    if (!isObject(styles)) return '';
    const out: string[] = [];
    for (const prop in styles) {
        if (hasOwn(styles, prop)) collect(prop, styles[prop], out);
    }
    return out.join('');
};

/**
 * Serialize arbitrary config into CSS (root level only)
 */
export const styles = (config?: object): string => parseStyles(config);

/**
 * Build a class-name rule: `.name{…}`
 */
export const className = (
    name: string,
    rule?: Record<string, unknown>
): string => (rule ? `.${name}{${parseStyles(rule)}}` : '');

/**
 * Build an id rule: `#name{…}`
 */
export const id = (name: string, rule?: Record<string, unknown>): string =>
    rule ? `#${name}{${parseStyles(rule)}}` : '';

/**
 * Build a custom-property `@property` rule
 */
export const variable = (name: string, value?: any): string => {
    if (value === undefined || value === null) return '';
    const body = isObject(value)
        ? parseStyles({
            syntax: value.syntax ? shortSyntax[(value as any).syntax] || value.syntax : '"*"',
            inherits: value.syntax ?? 'true',
            ...(value.initialValue !== null && value.initialValue !== undefined ? {initialValue: value.initialValue} : {})
        })
        : `syntax:"*";inherits:true;${prepareInitialValue(value)}`;
    return `@property ${name}{${body}}`;
};

/**
 * Build a `@keyframes` rule
 */
export const animation = (
    name: string,
    value?: Record<string, unknown>
): string => (value ? `@keyframes ${name}{${parseStyles(value)}}` : '');

/**
 * Build a `@layer` declaration
 */
export const layer = (name: string): string => `@layer ${name};`;

/**
 * Build a `@font-face` rule
 */
export const font = (name: string, value?: Record<string, unknown>): string =>
    `@font-face{font-family:${name};${parseStyles(value)}}`;

/**
 * Build a `var(token)` expression
 */
export const variableExp = (variableToken: string): string =>
    `var(${variableToken})`;

/**
 * Runtime callbacks
 */
export interface RuntimeCallbacks {
    /**
     * Emit a CSS chunk
     */
    emit(chunk: CSSChunk): void;
    /**
     * Report a warning
     */
    warn(message: string): void;
    /**
     * Record a utility call result (kind + computed value), in execution order
     */
    write(kind: UtilityType, value: unknown): void;
}

/**
 * Options for building the css-zero runtime
 */
export interface RuntimeOptions {
    /**
     * Key generator
     */
    keys: KeyGen;
    /**
     * Runtime callbacks
     */
    callbacks: RuntimeCallbacks;
}

/**
 * Build the css-zero runtime
 */
export function createRuntime(options: RuntimeOptions): Runtime {
    const { keys: ctx, callbacks } = options;
    const { emit, warn, write } = callbacks;
    return {
        id: (style) => {
            const name = ctx.id;
            if (style) emit({ key: name, type: 'other', css: id(name, style) });
            write('id', name);
            return name;
        },

        idSelector: (style) => {
            const name = ctx.id;
            if (style) emit({ key: name, type: 'other', css: id(name, style) });
            const result: [string, string] = [name, '#' + name];
            write('idSelector', result);
            return result;
        },

        className: (style) => {
            const name = ctx.className;
            if (style) emit({ key: name, type: 'other', css: className(name, style) });
            write('className', name);
            return name;
        },

        classSelector: (style) => {
            const name = ctx.className;
            if (style) emit({ key: name, type: 'other', css: className(name, style) });
            const result: [string, string] = [name, '.' + name];
            write('classSelector', result);
            return result;
        },

        variable: (config) => {
            const token = ctx.variable;
            const prop = customProperty(token);
            emit({ key: token, type: 'variable', css: variable(prop, config) });
            const result: [string, string] = [prop, `var(${prop})`];
            write('variable', result);
            return result;
        },

        animation: (config) => {
            const name = ctx.animation;
            if (config) emit({ key: name, type: 'animation', css: animation(name, config) });
            write('animation', name);
            return name;
        },

        layer: () => {
            const name = ctx.layer;
            emit({ key: name, type: 'layer', css: layer(name) });
            const result = '@layer ' + name;
            write('layer', result);
            return result;
        },

        container: (type) => {
            const name = ctx.container;
            const nameType = type ? ` / ${type}` : '';
            const result: [string, string] = [`${name}${nameType}`, `@container ${name}`];
            write('container', result);
            return result;
        },

        font: (config) => {
            const key = ctx.font;
            if (config) emit({ key, type: 'font', css: font(key, config) });
            write('font', key);
            return key;
        },

        style: (config, deps) => {
            if (deps !== undefined && !Array.isArray(deps)) {
                warn('style() deps must be an array; call blanked.');
                return '';
            }
            const key = '';
            if (config) emit({ key, type: 'other', css: styles(config), deps: deps ?? [] });
            write('style', key);
            return key;
        },

        variants: (config, base) => {
            if (!config) return {};
            const result = Object.entries(config).reduce(
                (acc, [key, val]) => {
                    const id = ctx.className;
                    acc[key] = id;
                    if (val) {
                        const selector = base ? `${base.startsWith('.') ? '' : '.'}${base}.${id}` : `.${id}`;
                        emit({ key: id, type: 'other', css: `${selector}{${parseStyles(val)}}` });
                    }
                    return acc;
                },
                {} as Record<string, string>
            );
            write('variants', result);
            return result;
        },

        theme: (vars, options) => {
            if (!isObject(vars) || !isObject(options)) {
                warn('theme() arguments must be static objects; call blanked.');
                return [{}, {}];
            }
            const values: Record<string, string> = {};
            const varByKey: Record<string, string> = {};
            for (const key of Object.keys(vars)) {
                const token = ctx.variable;
                const prop = customProperty(token);
                varByKey[key] = prop;
                values[key] = `var(${prop})`;
                emit({ key: token, type: 'variable', css: variable(prop, vars[key]) });
            }
            const classes: Record<string, string> = {};
            for (const optKey of Object.keys(options)) {
                const cls = ctx.className;
                classes[optKey] = cls;
                const overrides = options[optKey];
                const body = Object.entries(overrides)
                    .reduce((acc, [k, v]) => {
                        if (v !== undefined && v !== null) acc += `${varByKey[k]}:${v};`;
                        return acc;
                    }, '');
                emit({ key: cls, type: 'other', css: `.${cls}{${body}}` });
            }
            const result: [Record<string, string>, Record<string, string>] = [values, classes];
            write('theme', result);
            return result;
        },
    };
}
import { build, createServer } from 'vite';
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEMOS = ['vite-svelte', 'vite-react'];
const MODES = ['no', 'inline'];
const ENTRY = {
    'vite-svelte': '/src/main.ts',
    'vite-react': '/src/main.tsx',
};


const USED_MARKERS = ['.card-dep', '.card-and-btn-dep'];
const UNUSED_MARKERS = ['.tf-card-dep', '.both-cards-dep'];

function demoRoot(demo) {
    return join(ROOT, 'examples', demo);
}

function configFile(demo, mode) {
    return join(demoRoot(demo), mode === 'no' ? 'vite.config.ts' : `vite.config.${mode}.ts`);
}

function collectCss(dir, acc = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) collectCss(p, acc);
        else if (entry.name.endsWith('.css')) acc.push(readFileSync(p, 'utf-8'));
    }
    return acc;
}

function inlineCssFromHtml(htmlPath) {
    if (!existsSync(htmlPath)) return '';
    const html = readFileSync(htmlPath, 'utf-8');
    const out = [];
    for (const m of html.matchAll(/<style[^>]*data-css-zero[^>]*>([\s\S]*?)<\/style>/g)) {
        out.push(m[1]);
    }
    return out.join('\n');
}

async function verifyBuild(demo, mode) {
    const outDir = mkdtempSync(join(tmpdir(), 'css-zero-build-'));
    try {
        await build({
            root: demoRoot(demo),
            configFile: configFile(demo, mode),
            logLevel: 'silent',
            build: { outDir, minify: false },
        });

        const cssParts = collectCss(outDir);
        const inline = inlineCssFromHtml(join(outDir, 'index.html'));
        if (inline) cssParts.push(inline);

        const all = cssParts.join('\n');
        const hasCss = all.trim().length > 0;
        const hasGenerated = /\.o-s_/.test(all);

        const usedOk = USED_MARKERS.every((m) => all.includes(m));
        const unusedOk = UNUSED_MARKERS.every((m) => !all.includes(m));

        return {
            ok: hasCss && hasGenerated && usedOk && unusedOk,
            details: { hasCss, hasGenerated, usedOk, unusedOk, cssBytes: all.length },
        };
    } finally {
        rmSync(outDir, { recursive: true, force: true });
    }
}

async function verifyDev(demo, mode) {
    const server = await createServer({
        root: demoRoot(demo),
        configFile: configFile(demo, mode),
        logLevel: 'silent',
        server: { middlewareMode: true },
    });
    try {
        await server.transformRequest(ENTRY[demo]).catch(() => {});
        let code = '';
        for (let i = 0; i < 20; i++) {
            const mod = await server.transformRequest('/css-zero.css');
            code = mod?.code || '';
            if (/\.o-s_/.test(code)) break;
            await new Promise((r) => setTimeout(r, 50));
        }

        const hasCss = /\.o-s_/.test(code);
        const hasInject = code.includes('__vite__updateStyle');
        // The card (`o-s_4`) and its title (`o-s_5`) come from a local `.css.ts`
        // imported by the component. They must be present — this is the exact
        // case that regressed in dev (a race dropping the card's styles).
        const hasCard = code.includes('.o-s_4') && code.includes('.o-s_5');
        return {
            ok: hasCss && hasInject && hasCard,
            details: { hasCss, hasInject, hasCard, bytes: code.length },
        };
    } finally {
        server.close().catch(() => {});
    }
}

function parseArgs(argv) {
    const args = { demos: DEMOS, modes: MODES };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--demo') args.demos = [argv[++i]];
        if (argv[i] === '--mode') args.modes = [argv[++i]];
    }
    return args;
}

async function main() {
    const { demos, modes } = parseArgs(process.argv.slice(2));
    let failed = 0;

    for (const demo of demos) {
        for (const mode of modes) {
            for (const phase of ['build', 'dev']) {
                const label = `${demo} / ${mode} / ${phase}`;
                try {
                    const r = phase === 'build' ? await verifyBuild(demo, mode) : await verifyDev(demo, mode);
                    if (r.ok) {
                        console.log(`  ok   ${label}`);
                    } else {
                        failed++;
                        console.log(`  FAIL ${label}  ${JSON.stringify(r.details)}`);
                    }
                } catch (err) {
                    failed++;
                    console.log(`  ERROR ${label}  ${err.message}`);
                }
            }
        }
    }

    console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
    process.exit(failed === 0 ? 0 : 1);
}

main();

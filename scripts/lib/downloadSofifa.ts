import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SOFIFA_CACHE_DIR = path.join(__dirname, '..', '.cache', 'sofifa');

export const SOFIFA_CSV_FILES = {
    'male_players_legacy.csv': {
        url: 'https://huggingface.co/datasets/jsulz/FIFA23/resolve/main/male_players%20(legacy).csv',
    },
    'player_data_full.csv': {
        url: 'https://raw.githubusercontent.com/SolideSpoke/sofifa-web-scraper/main/output/player-data-full.csv',
    },
} as const;

export type SofifaCsvFileName = keyof typeof SOFIFA_CSV_FILES;

export async function downloadSofifaCsv(
    name: SofifaCsvFileName,
    force = false,
): Promise<string> {
    await mkdir(SOFIFA_CACHE_DIR, { recursive: true });
    const cachePath = path.join(SOFIFA_CACHE_DIR, name);

    if (!force) {
        try {
            return await readFile(cachePath, 'utf-8');
        } catch {
            // fetch below
        }
    }

    const { url } = SOFIFA_CSV_FILES[name];
    const started = Date.now();
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    await writeFile(cachePath, text, 'utf-8');
    const elapsedMs = Date.now() - started;
    const sizeMb = (Buffer.byteLength(text, 'utf-8') / (1024 * 1024)).toFixed(2);
    console.log(`  Downloaded ${name}: ${sizeMb} MB in ${(elapsedMs / 1000).toFixed(1)}s`);

    return text;
}

export async function downloadAllSofifaCsvs(force = false): Promise<Record<SofifaCsvFileName, string>> {
    const entries = await Promise.all(
        (Object.keys(SOFIFA_CSV_FILES) as SofifaCsvFileName[]).map(async (name) => {
            return [name, await downloadSofifaCsv(name, force)] as const;
        }),
    );
    return Object.fromEntries(entries) as Record<SofifaCsvFileName, string>;
}

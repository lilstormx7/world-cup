import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TM_CACHE_DIR = path.join(__dirname, '..', '.cache', 'tm');
const BASE_URL = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data';

export const TM_CSV_FILES = [
    'players.csv.gz',
    'appearances.csv.gz',
    'player_valuations.csv.gz',
    'games.csv.gz',
    'competitions.csv.gz',
] as const;

export type TmCsvFileName = (typeof TM_CSV_FILES)[number];

export async function downloadTransfermarktCsv(
    name: TmCsvFileName,
    force = false,
): Promise<string> {
    await mkdir(TM_CACHE_DIR, { recursive: true });
    const csvName = name.replace('.gz', '');
    const cachePath = path.join(TM_CACHE_DIR, csvName);

    if (!force) {
        try {
            return await readFile(cachePath, 'utf-8');
        } catch {
            // fetch below
        }
    }

    const url = `${BASE_URL}/${name}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const text = gunzipSync(buffer).toString('utf-8');
    await writeFile(cachePath, text, 'utf-8');
    return text;
}

export async function downloadAllTransfermarktCsvs(
    force = false,
): Promise<Record<string, string>> {
    const entries = await Promise.all(
        TM_CSV_FILES.map(async (name) => {
            const csvName = name.replace('.gz', '');
            return [csvName, await downloadTransfermarktCsv(name, force)] as const;
        }),
    );
    return Object.fromEntries(entries);
}

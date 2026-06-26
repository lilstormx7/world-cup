import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, '..', '.cache');
const BASE_URL = 'https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv';

export const CSV_FILES = [
    'squads.csv',
    'teams.csv',
    'qualified_teams.csv',
    'player_appearances.csv',
    'goals.csv',
    'tournaments.csv',
    'award_winners.csv',
] as const;

export type CsvFileName = (typeof CSV_FILES)[number];

export async function downloadCsv(name: CsvFileName, force = false): Promise<string> {
    await mkdir(CACHE_DIR, { recursive: true });
    const cachePath = path.join(CACHE_DIR, name);

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

    const text = await response.text();
    await writeFile(cachePath, text, 'utf-8');
    return text;
}

export async function downloadAllCsvs(force = false): Promise<Record<CsvFileName, string>> {
    const entries = await Promise.all(
        CSV_FILES.map(async (name) => [name, await downloadCsv(name, force)] as const),
    );
    return Object.fromEntries(entries) as Record<CsvFileName, string>;
}

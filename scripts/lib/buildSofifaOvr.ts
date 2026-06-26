import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsvRelaxed } from './parseCsv.js';
import {
    buildSofifaPlayerIndex,
    matchSofifaPlayers,
} from './matchSofifaPlayers.js';
import type { PlayerRatingsIndex, WcPlayerRef } from './types.js';
import { SOFIFA_CACHE_DIR } from './downloadSofifa.js';

type LegacyRow = {
    player_id: string;
    fifa_version?: string;
    long_name?: string;
    overall?: string;
    dob?: string;
    nationality_name?: string;
};

type SolideSpokeRow = {
    player_id: string;
    full_name?: string;
    name?: string;
    overall_rating?: string;
    dob?: string;
    country_name?: string;
};

function parseIntSafe(value: string | undefined): number {
    const n = Number.parseInt(value ?? '0', 10);
    return Number.isFinite(n) ? n : 0;
}

/** Map WC tournament year to FIFA edition number (15–23). */
export function wcYearToFifaVersion(wcYear: number): number {
    return Math.min(23, Math.max(15, wcYear - 1999));
}

/** Calendar year associated with a FIFA edition (Sep release). */
export function fifaVersionToCalendarYear(fifaVersion: number): number {
    return fifaVersion + 1999;
}

function mergeOvrEntry(
    merged: PlayerRatingsIndex,
    wcPlayerId: string,
    sofifaPlayerId: string,
    calendarYear: number,
    ovr: number,
): void {
    if (ovr <= 0) return;

    const entry = merged[wcPlayerId] ?? { wcGoalsByYear: {}, wcGoalsPrime: 0 };
    const byYear = entry.ovrByYear ?? {};
    byYear[calendarYear] = Math.max(byYear[calendarYear] ?? 0, ovr);
    entry.ovrByYear = byYear;
    entry.ovrPrime = Math.max(entry.ovrPrime ?? 0, ovr);
    entry.sofifaPlayerId = sofifaPlayerId;
    merged[wcPlayerId] = entry;
}

export async function buildSofifaOvrFromCsv(
    cacheDir: string = SOFIFA_CACHE_DIR,
    wcPlayers: WcPlayerRef[],
    playerRatings: PlayerRatingsIndex,
): Promise<PlayerRatingsIndex> {
    const legacyCsv = await readFile(path.join(cacheDir, 'male_players_legacy.csv'), 'utf-8');
    const solideCsv = await readFile(path.join(cacheDir, 'player_data_full.csv'), 'utf-8');

    const legacyRows = parseCsvRelaxed<LegacyRow>(legacyCsv);
    const solideRows = parseCsvRelaxed<SolideSpokeRow>(solideCsv);

    const playerIndex = buildSofifaPlayerIndex(legacyRows, solideRows);
    const sofifaList = [...playerIndex.values()];
    const wcToSofifa = matchSofifaPlayers(wcPlayers, sofifaList);

    const sofifaToWc = new Map<string, string>();
    for (const [wcId, sfId] of wcToSofifa) sofifaToWc.set(sfId, wcId);

    const merged: PlayerRatingsIndex = { ...playerRatings };

    for (const row of legacyRows) {
        const wcPlayerId = sofifaToWc.get(row.player_id);
        if (!wcPlayerId) continue;

        const fifaVersion = parseIntSafe(row.fifa_version);
        const ovr = parseIntSafe(row.overall);
        if (fifaVersion < 15 || fifaVersion > 23) continue;

        mergeOvrEntry(
            merged,
            wcPlayerId,
            row.player_id,
            fifaVersionToCalendarYear(fifaVersion),
            ovr,
        );
    }

    for (const row of solideRows) {
        const wcPlayerId = sofifaToWc.get(row.player_id);
        if (!wcPlayerId) continue;

        mergeOvrEntry(
            merged,
            wcPlayerId,
            row.player_id,
            2024,
            parseIntSafe(row.overall_rating),
        );
    }

    const withOvr = Object.values(merged).filter((e) => (e.ovrPrime ?? 0) > 0).length;
    console.log(`  SoFIFA OVR attached for ${withOvr} WC players.`);

    return merged;
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlayerBuildStats } from './types.js';

export type OverrideMode = 'set' | 'floor';

export interface OvrOverride {
    name?: string;
    playerId?: string;
    year?: number;
    country?: string;
    overall: number;
    mode?: OverrideMode;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDES_PATH = path.join(__dirname, '..', 'data', 'ovr-overrides.json');

function normalizeName(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function nameMatches(playerName: string, pattern: string): boolean {
    const player = normalizeName(playerName);
    const target = normalizeName(pattern);
    return player.includes(target) || target.includes(player.split(' ').pop() ?? '');
}

export async function loadOvrOverrides(): Promise<OvrOverride[]> {
    try {
        const raw = await readFile(OVERRIDES_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as OvrOverride[] | { overrides: OvrOverride[] };
        return Array.isArray(parsed) ? parsed : parsed.overrides;
    } catch {
        return [];
    }
}

export function applyOvrOverride(
    computed: number,
    stats: PlayerBuildStats,
    overrides: OvrOverride[],
): number {
    for (const rule of overrides) {
        if (rule.year !== undefined && rule.year !== stats.year) continue;
        if (rule.country && normalizeName(rule.country) !== normalizeName(stats.country)) continue;
        if (rule.playerId && rule.playerId !== stats.playerId) continue;
        if (rule.name && !nameMatches(stats.name, rule.name)) continue;
        if (!rule.name && !rule.playerId) continue;

        if (rule.mode === 'floor') {
            return Math.max(computed, rule.overall);
        }
        return rule.overall;
    }
    return computed;
}

import type { PlayerBuildStats, Position, SquadPlayer } from './types.js';
import { applyOvrOverride, type OvrOverride } from './ovrOverrides.js';

/** Realistic floor for a player selected in a World Cup squad */
export const POSITION_BASE: Record<Position, number> = {
    GK: 66,
    DEF: 68,
    MID: 69,
    FWD: 70,
};

/** Team success bonus — only applied when the player actually appeared */
export const PERFORMANCE_BONUS: Record<string, number> = {
    Winner: 4,
    'Runner-up': 3,
    'Second place': 3,
    'Third place': 2,
    'Fourth place': 1.5,
    'Quarter-finals': 1,
    'Round of 16': 0.5,
    'Group stage': 0,
};

export const AWARD_BONUS: Record<string, number> = {
    'Golden Ball': 8,
    'Silver Ball': 5,
    'Bronze Ball': 3,
    'Golden Boot': 6,
    'Silver Boot': 3,
    'Bronze Boot': 2,
    'Golden Glove': 5,
    'Best Young Player': 2,
};

const MIN_OVERALL = 55;
const MAX_OVERALL = 96;
const UNUSED_SQUAD_CAP = 78;

export function getPerformanceBonus(performance: string): number {
    if (performance in PERFORMANCE_BONUS) {
        return PERFORMANCE_BONUS[performance];
    }

    const lower = performance.toLowerCase();
    if (lower.includes('winner') || lower === 'champion') return 4;
    if (lower.includes('runner') || lower.includes('second')) return 3;
    if (lower.includes('third')) return 2;
    if (lower.includes('fourth')) return 1.5;
    if (lower.includes('quarter')) return 1;
    if (lower.includes('round of 16') || lower.includes('eighth')) return 0.5;
    return 0;
}

export function getAwardBonus(awardName: string): number {
    return AWARD_BONUS[awardName] ?? 0;
}

export function clampOverall(value: number): number {
    return Math.max(MIN_OVERALL, Math.min(MAX_OVERALL, Math.round(value)));
}

/**
 * Absolute OVR from World Cup pedigree — no per-squad percentile stretching.
 * Combines tournament impact, career WC record, awards, and squad role.
 */
export function computeOverall(stats: PlayerBuildStats): number {
    const base = POSITION_BASE[stats.position];

    const tournamentGoals = Math.min(stats.wcGoals * 2.5, 10);
    const tournamentApps = Math.min(stats.appearances * 0.6, 5);
    const tournamentStarts = Math.min(stats.starts * 0.8, 5);
    const regularStarter =
        stats.appearances >= 3 && stats.starts / stats.appearances >= 0.7 ? 1.5 : 0;

    const teamBonus =
        stats.appearances > 0 ? getPerformanceBonus(stats.teamPerformance) : 0;

    const careerGoals = Math.min(stats.careerGoals * 0.4, 6);
    const careerApps = Math.min(stats.careerApps * 0.12, 4);
    const careerTournaments = Math.min(Math.max(stats.careerTournaments - 1, 0) * 0.8, 3);

    let squadRoleBonus = 0;
    if (stats.appearances === 0) {
        if (stats.shirtNumber !== null && stats.shirtNumber <= 11) squadRoleBonus = 3;
        else if (stats.shirtNumber !== null && stats.shirtNumber <= 23) squadRoleBonus = 1;
    }

    let raw =
        base +
        tournamentGoals +
        tournamentApps +
        tournamentStarts +
        regularStarter +
        teamBonus +
        careerGoals +
        careerApps +
        careerTournaments +
        stats.awardBonus +
        squadRoleBonus;

    if (stats.appearances === 0) {
        raw = Math.min(raw, UNUSED_SQUAD_CAP);
    }

    return clampOverall(raw);
}

export function buildSquadPlayers(
    statsList: PlayerBuildStats[],
    overrides: OvrOverride[],
    makeId: (stats: PlayerBuildStats) => string,
): SquadPlayer[] {
    return statsList.map((stats) => {
        const computed = computeOverall(stats);
        const overall = applyOvrOverride(computed, stats, overrides);

        return {
            id: makeId(stats),
            playerId: stats.playerId,
            name: stats.name,
            positions: [stats.position],
            overall: clampOverall(overall),
        };
    });
}

export function findPlayerOverall(players: SquadPlayer[], nameIncludes: string): SquadPlayer | undefined {
    const lower = nameIncludes.toLowerCase();
    return players.find((p) => p.name.toLowerCase().includes(lower));
}

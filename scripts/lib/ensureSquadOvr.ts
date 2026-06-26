import type { NationalTeam, PlayerRatingsIndex } from './types.js';
import { defaultOvrForPositions } from '../../src/ratings/positionOvr.js';

export function ensureOvrForWorldCupSquads(
    ratings: PlayerRatingsIndex,
    nationalTeams: NationalTeam[],
    ovrYears: readonly number[],
): { ratings: PlayerRatingsIndex; defaultCount: number } {
    const ovrYearSet = new Set(ovrYears);
    const merged: PlayerRatingsIndex = { ...ratings };
    let defaultCount = 0;

    for (const team of nationalTeams) {
        if (!ovrYearSet.has(team.year)) continue;

        for (const player of team.players) {
            const playerId = player.playerId;
            if (!playerId) continue;

            const entry = merged[playerId] ?? { wcGoalsByYear: {}, wcGoalsPrime: 0 };
            const fallback = defaultOvrForPositions(player.positions);
            const byYear = entry.ovrByYear ?? {};

            if ((entry.ovrPrime ?? 0) <= 0) {
                byYear[team.year] = fallback;
                entry.ovrByYear = byYear;
                entry.ovrPrime = fallback;
                merged[playerId] = entry;
                defaultCount += 1;
                continue;
            }

            if (byYear[team.year] === undefined) {
                byYear[team.year] = entry.ovrPrime;
                entry.ovrByYear = byYear;
                merged[playerId] = entry;
            }
        }
    }

    return { ratings: merged, defaultCount };
}

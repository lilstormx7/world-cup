import type { SquadPlayer } from '../data';
import type { RatingScope, RoomSettings } from '../types';
import { defaultOvrForPositions } from './positionOvr';
import type { PlayerRatingsIndex, ResolvedPlayerRating } from './types';

export function extractPlayerId(squadPlayerId: string, playerId?: string): string {
    if (playerId) return playerId;
    const match = squadPlayerId.match(/(P-\d+)$/);
    return match ? match[1] : squadPlayerId;
}

function pickOvrForYear(
    entry: PlayerRatingsIndex[string] | undefined,
    teamYear: number,
    scope: RatingScope,
): number {
    if (!entry?.ovrByYear && !entry?.ovrPrime) return 0;

    if (scope === 'all_time_prime') return entry.ovrPrime ?? 0;

    const byYear = entry.ovrByYear ?? {};
    if (byYear[teamYear] !== undefined) return byYear[teamYear];

    const years = Object.keys(byYear).map(Number);
    if (years.length === 0) return entry.ovrPrime ?? 0;

    let closest = years[0];
    let minDist = Math.abs(years[0] - teamYear);
    for (const y of years) {
        const dist = Math.abs(y - teamYear);
        if (dist < minDist) {
            minDist = dist;
            closest = y;
        }
    }

    if (minDist <= 2) return byYear[closest] ?? 0;
    return entry.ovrPrime ?? 0;
}

export function resolvePlayerRating(
    player: SquadPlayer,
    teamYear: number,
    settings: Pick<RoomSettings, 'ratingScope'>,
    index: PlayerRatingsIndex,
): ResolvedPlayerRating {
    const fjelstulId = extractPlayerId(player.id, player.playerId);
    const entry = index[fjelstulId];

    const sofifaOvr = pickOvrForYear(entry, teamYear, settings.ratingScope);
    const ovr = sofifaOvr > 0 ? sofifaOvr : defaultOvrForPositions(player.positions);

    return {
        simValue: ovr,
        label: `OVR ${ovr}`,
        source: sofifaOvr > 0 ? 'sofifa' : 'default',
    };
}

/** Numeric value for draft sort and tournament simulation. */
export function resolvePlayerSimValue(
    player: SquadPlayer,
    teamYear: number,
    settings: Pick<RoomSettings, 'ratingScope'>,
    index: PlayerRatingsIndex,
): number {
    return resolvePlayerRating(player, teamYear, settings, index).simValue;
}

export function formatRatingScope(scope: RatingScope): string {
    return scope === 'all_time_prime' ? 'All Time Prime' : 'Year Rating';
}

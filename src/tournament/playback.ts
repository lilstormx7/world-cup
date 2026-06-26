import type { GroupLetter, GroupStandingRow, MatchResult, PlayerTournamentStat, TournamentState } from './types';
import { GROUP_LETTERS } from './types';

export function computeStandingsUpTo(
    tournament: TournamentState,
    throughIndex: number,
): Record<GroupLetter, GroupStandingRow[]> {
    const standings = {} as Record<GroupLetter, GroupStandingRow[]>;

    for (const group of GROUP_LETTERS) {
        standings[group] = tournament.groupStandings[group].map((row) => ({
            ...row,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            points: 0,
        }));
    }

    const matches = tournament.allMatches.slice(0, throughIndex + 1);
    for (const match of matches) {
        if (match.stage !== 'group' || !match.group) continue;
        applyMatch(standings[match.group], match);
    }

    for (const group of GROUP_LETTERS) {
        standings[group].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    }

    return standings;
}

function applyMatch(standings: GroupStandingRow[], match: MatchResult): void {
    const home = standings.find((s) => s.teamId === match.homeTeamId);
    const away = standings.find((s) => s.teamId === match.awayTeamId);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.gf += match.homeScore;
    home.ga += match.awayScore;
    away.gf += match.awayScore;
    away.ga += match.homeScore;

    if (match.homeScore > match.awayScore) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
    } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
    }

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
}

export function computeStatsUpTo(
    tournament: TournamentState,
    throughIndex: number,
): PlayerTournamentStat[] {
    const map = new Map<string, PlayerTournamentStat>();
    const matches = tournament.allMatches.slice(0, throughIndex + 1);

    for (const match of matches) {
        for (const event of match.events) {
            const key = `${event.teamId}:${event.scorerName}`;
            const team = tournament.teams.find((t) => t.id === event.teamId);
            const scorer = map.get(key) ?? {
                playerName: event.scorerName,
                teamId: event.teamId,
                teamName: team?.name ?? event.teamId,
                goals: 0,
                assists: 0,
            };
            scorer.goals += 1;
            map.set(key, scorer);

            if (event.assistName) {
                const aKey = `${event.teamId}:${event.assistName}`;
                const assister = map.get(aKey) ?? {
                    playerName: event.assistName,
                    teamId: event.teamId,
                    teamName: team?.name ?? event.teamId,
                    goals: 0,
                    assists: 0,
                };
                assister.assists += 1;
                map.set(aKey, assister);
            }
        }
    }

    return [...map.values()];
}

export function formatStageLabel(match: MatchResult): string {
    if (match.stage === 'group' && match.group) {
        return `Group ${match.group}`;
    }
    const labels: Record<string, string> = {
        r32: 'Round of 32',
        r16: 'Round of 16',
        qf: 'Quarter-finals',
        sf: 'Semi-finals',
        final: 'Final',
    };
    return labels[match.stage] ?? match.stage;
}

export function formatEliminatedIn(eliminatedIn: string): string {
    const labels: Record<string, string> = {
        winner: 'Champion',
        final: 'Final',
        sf: 'Semi-finals',
        qf: 'Quarter-finals',
        r16: 'Round of 16',
        r32: 'Round of 32',
        group: 'Group stage',
    };
    return labels[eliminatedIn] ?? eliminatedIn;
}

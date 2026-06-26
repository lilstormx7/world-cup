import type { DraftedPlayer, Manager, RoomSettings } from '../types';
import { buildGroupRevealOrder, buildTournamentTeams } from './buildTeams';
import { knockoutWinnerTeamId, simulateKnockoutMatch, simulateMatch } from './simulateMatch';
import { createRng } from './rng';
import {
    GROUP_LETTERS,
    type GroupLetter,
    type GroupStandingRow,
    type KnockoutStage,
    type ManagerTournamentResult,
    type MatchResult,
    type PlayerTournamentStat,
    type ScheduledMatch,
    type TournamentState,
    type TournamentTeam,
} from './types';

export function initStandings(teamIds: string[]): GroupStandingRow[] {
    return teamIds.map((teamId) => ({
        teamId,
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

export function applyMatchToStandings(
    standings: GroupStandingRow[],
    match: MatchResult,
): GroupStandingRow[] {
    const home = standings.find((s) => s.teamId === match.homeTeamId);
    const away = standings.find((s) => s.teamId === match.awayTeamId);
    if (!home || !away) return standings;

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

    return standings;
}

export function sortStandings(rows: GroupStandingRow[]): GroupStandingRow[] {
    return [...rows].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
}

export function buildGroupMatchSchedule(teams: TournamentTeam[]): ScheduledMatch[] {
    const schedule: ScheduledMatch[] = [];
    let matchCounter = 0;

    for (const group of GROUP_LETTERS) {
        const groupTeams = teams.filter((t) => t.group === group);
        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                schedule.push({
                    id: `g-${matchCounter++}`,
                    stage: 'group',
                    group,
                    homeTeamId: groupTeams[i].id,
                    awayTeamId: groupTeams[j].id,
                });
            }
        }
    }

    return schedule;
}

function runGroupStage(
    teams: TournamentTeam[],
    rng: ReturnType<typeof createRng>,
): { matches: MatchResult[]; standings: Record<GroupLetter, GroupStandingRow[]> } {
    const matches: MatchResult[] = [];
    const standings = {} as Record<GroupLetter, GroupStandingRow[]>;

    for (const group of GROUP_LETTERS) {
        const groupTeams = teams.filter((t) => t.group === group);
        standings[group] = initStandings(groupTeams.map((t) => t.id));

        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                const home = groupTeams[i];
                const away = groupTeams[j];
                const match = simulateMatch(
                    home,
                    away,
                    'group',
                    rng,
                    `g-${matches.length}`,
                    group,
                );
                matches.push(match);
                standings[group] = applyMatchToStandings(standings[group], match);
            }
        }
        standings[group] = sortStandings(standings[group]);
    }

    return { matches, standings };
}

interface AdvancingTeam {
    teamId: string;
    group: GroupLetter;
    rank: 1 | 2 | 3;
    points: number;
    gd: number;
    gf: number;
}

export function selectAdvancingTeams(
    standings: Record<GroupLetter, GroupStandingRow[]>,
): AdvancingTeam[] {
    const advancing: AdvancingTeam[] = [];

    for (const group of GROUP_LETTERS) {
        const sorted = standings[group];
        if (sorted[0]) advancing.push({ teamId: sorted[0].teamId, group, rank: 1, ...pickStats(sorted[0]) });
        if (sorted[1]) advancing.push({ teamId: sorted[1].teamId, group, rank: 2, ...pickStats(sorted[1]) });
    }

    const thirdPlace: AdvancingTeam[] = [];
    for (const group of GROUP_LETTERS) {
        const sorted = standings[group];
        if (sorted[2]) {
            thirdPlace.push({
                teamId: sorted[2].teamId,
                group,
                rank: 3,
                ...pickStats(sorted[2]),
            });
        }
    }

    thirdPlace.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    advancing.push(...thirdPlace.slice(0, 8));

    return advancing;
}

function pickStats(row: GroupStandingRow) {
    return { points: row.points, gd: row.gd, gf: row.gf };
}

function getTeamById(teams: TournamentTeam[], teamId: string): TournamentTeam | undefined {
    return teams.find((t) => t.id === teamId);
}

function runKnockoutRound(
    teamIds: string[],
    teams: TournamentTeam[],
    stage: KnockoutStage,
    rng: ReturnType<typeof createRng>,
    matchCounter: { value: number },
): { matches: MatchResult[]; winners: string[] } {
    const matches: MatchResult[] = [];
    const winners: string[] = [];

    for (let i = 0; i < teamIds.length; i += 2) {
        const home = getTeamById(teams, teamIds[i]);
        const away = getTeamById(teams, teamIds[i + 1]);
        if (!home || !away) continue;

        const match = simulateKnockoutMatch(home, away, stage, rng, `k-${matchCounter.value++}`);
        matches.push(match);
        winners.push(knockoutWinnerTeamId(match));
    }

    return { matches, winners };
}

export function buildR32Teams(advancing: AdvancingTeam[]): string[] {
    const winners = advancing.filter((a) => a.rank === 1);
    const runners = advancing.filter((a) => a.rank === 2);
    const thirds = advancing.filter((a) => a.rank === 3);

    let r32Teams = [
        ...winners.map((w) => w.teamId),
        ...runners.map((r) => r.teamId),
        ...thirds.map((t) => t.teamId),
    ];

    if (r32Teams.length < 32) {
        r32Teams = advancing.map((a) => a.teamId);
    }

    return r32Teams.slice(0, 32);
}

export function buildKnockoutRoundSchedule(
    teamIds: string[],
    stage: KnockoutStage,
    idOffset: number,
): ScheduledMatch[] {
    const schedule: ScheduledMatch[] = [];
    for (let i = 0; i < teamIds.length; i += 2) {
        if (!teamIds[i + 1]) break;
        schedule.push({
            id: `k-${idOffset + schedule.length}`,
            stage,
            homeTeamId: teamIds[i],
            awayTeamId: teamIds[i + 1],
        });
    }
    return schedule;
}

export function winnersFromKnockoutRound(
    matches: MatchResult[],
    stage: KnockoutStage,
): string[] {
    return matches
        .filter((m) => m.stage === stage)
        .map((m) => knockoutWinnerTeamId(m));
}

export const NEXT_KNOCKOUT_STAGE: Record<KnockoutStage, KnockoutStage | null> = {
    r32: 'r16',
    r16: 'qf',
    qf: 'sf',
    sf: 'final',
    final: null,
};

function runKnockout(
    advancing: AdvancingTeam[],
    teams: TournamentTeam[],
    rng: ReturnType<typeof createRng>,
): { matches: MatchResult[]; championId: string; runnerUpId: string } {
    const matches: MatchResult[] = [];
    const counter = { value: 0 };

    let r32Teams = buildR32Teams(advancing);

    const stages: KnockoutStage[] = ['r32', 'r16', 'qf', 'sf', 'final'];
    let current = r32Teams;
    let lastMatch: MatchResult | null = null;

    for (const stage of stages) {
        if (current.length === 1) break;
        const { matches: roundMatches, winners: roundWinners } = runKnockoutRound(
            current,
            teams,
            stage,
            rng,
            counter,
        );
        matches.push(...roundMatches);
        lastMatch = roundMatches[roundMatches.length - 1] ?? lastMatch;
        current = roundWinners;
    }

    const championId = current[0] ?? r32Teams[0];
    let runnerUpId = r32Teams[1];
    if (lastMatch) {
        runnerUpId =
            lastMatch.homeTeamId === championId ? lastMatch.awayTeamId : lastMatch.homeTeamId;
    }

    return { matches, championId, runnerUpId };
}

export function aggregatePlayerStats(
    matches: MatchResult[],
    teams: TournamentTeam[],
): PlayerTournamentStat[] {
    const map = new Map<string, PlayerTournamentStat>();

    const touch = (teamId: string, playerName: string): PlayerTournamentStat => {
        const key = `${teamId}:${playerName}`;
        const existing = map.get(key);
        if (existing) return existing;
        const team = getTeamById(teams, teamId);
        const stat: PlayerTournamentStat = {
            playerName,
            teamId,
            teamName: team?.name ?? teamId,
            goals: 0,
            assists: 0,
        };
        map.set(key, stat);
        return stat;
    };

    for (const match of matches) {
        for (const event of match.events) {
            if (event.penaltyShootout || event.scored === false) continue;
            const scorer = touch(event.teamId, event.scorerName);
            scorer.goals += 1;
            if (event.assistName && !event.assistName.startsWith('saved by ')) {
                const assister = touch(event.teamId, event.assistName);
                assister.assists += 1;
            }
        }
    }

    return [...map.values()];
}

export function computeManagerResults(
    managers: Manager[],
    teams: TournamentTeam[],
    groupStandings: Record<GroupLetter, GroupStandingRow[]>,
    knockoutMatches: MatchResult[],
    championId: string,
    runnerUpId: string,
    advancingTeamIds: Set<string>,
): ManagerTournamentResult[] {
    const stageOrder: Record<string, number> = {
        winner: 100,
        final: 90,
        sf: 80,
        qf: 70,
        r16: 60,
        r32: 50,
        group: 10,
    };

    const managerTeamMap = new Map<string, string>();
    for (const team of teams) {
        if (team.managerId) managerTeamMap.set(team.managerId, team.id);
    }

    const eliminatedIn = new Map<string, ManagerTournamentResult['eliminatedIn']>();

    for (const manager of managers) {
        const teamId = managerTeamMap.get(manager.id);
        if (!teamId) {
            eliminatedIn.set(manager.id, 'group');
            continue;
        }

        if (!advancingTeamIds.has(teamId)) {
            eliminatedIn.set(manager.id, 'group');
            continue;
        }

        if (teamId === championId) {
            eliminatedIn.set(manager.id, 'winner');
            continue;
        }
        if (teamId === runnerUpId) {
            eliminatedIn.set(manager.id, 'final');
            continue;
        }

        let deepest: ManagerTournamentResult['eliminatedIn'] = 'group';
        for (const match of knockoutMatches) {
            const involved =
                match.homeTeamId === teamId || match.awayTeamId === teamId;
            if (!involved) continue;
            const lost = knockoutWinnerTeamId(match) !== teamId;
            if (lost && stageOrder[match.stage] > stageOrder[deepest]) {
                deepest = match.stage;
            }
        }
        eliminatedIn.set(manager.id, deepest);
    }

    const results: ManagerTournamentResult[] = managers.map((manager) => {
        const teamId = managerTeamMap.get(manager.id);
        const team = teamId ? getTeamById(teams, teamId) : undefined;
        const group = team?.group;
        const row = group ? groupStandings[group]?.find((s) => s.teamId === teamId) : undefined;

        return {
            managerId: manager.id,
            rank: 0,
            eliminatedIn: eliminatedIn.get(manager.id) ?? 'group',
            groupName: group,
            groupRecord: row
                ? { w: row.won, d: row.drawn, l: row.lost, gd: row.gd }
                : undefined,
        };
    });

    results.sort(
        (a, b) =>
            stageOrder[b.eliminatedIn] - stageOrder[a.eliminatedIn] ||
            (b.groupRecord?.gd ?? 0) - (a.groupRecord?.gd ?? 0),
    );

    results.forEach((r, i) => {
        r.rank = i + 1;
    });

    return results;
}

export function simulateTournament(
    managers: Manager[],
    draftedPlayers: DraftedPlayer[],
    settings: RoomSettings,
    seed = Date.now(),
): { tournament: TournamentState; managerResults: ManagerTournamentResult[] } {
    const rng = createRng(seed);
    const userManagerIds = managers.map((m) => m.id);
    const teams = buildTournamentTeams(managers, draftedPlayers, settings, seed);
    const groupRevealOrder = buildGroupRevealOrder(teams);

    const groups = {} as Record<GroupLetter, string[]>;
    for (const group of GROUP_LETTERS) {
        groups[group] = teams.filter((t) => t.group === group).map((t) => t.id);
    }

    const { matches: groupMatches, standings: groupStandings } = runGroupStage(teams, rng);
    const advancing = selectAdvancingTeams(groupStandings);
    const advancingTeamIds = new Set(advancing.map((a) => a.teamId));
    const { matches: knockoutMatches, championId, runnerUpId } = runKnockout(
        advancing,
        teams,
        rng,
    );

    const allMatches = [...groupMatches, ...knockoutMatches];
    const playerStats = aggregatePlayerStats(allMatches, teams);
    const managerResults = computeManagerResults(
        managers,
        teams,
        groupStandings,
        knockoutMatches,
        championId,
        runnerUpId,
        advancingTeamIds,
    );

    const tournament: TournamentState = {
        seed,
        teams,
        groups,
        groupRevealOrder,
        groupStandings,
        matchSchedule: [],
        allMatches,
        knockoutMatches,
        playerStats,
        userManagerIds,
        championTeamId: championId,
        runnerUpTeamId: runnerUpId,
    };

    return { tournament, managerResults };
}

export { matchInvolvesUser } from './buildTeams';

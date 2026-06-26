import type { DraftedPlayer, Manager, ManagerTournamentResult, RoomSettings } from '../types';
import {
    buildGroupRevealOrder,
    buildRevealSequence,
    buildTournamentTeams,
} from './buildTeams';
import {
    aggregatePlayerStats,
    applyMatchToStandings,
    buildGroupMatchSchedule,
    buildKnockoutRoundSchedule,
    buildR32Teams,
    computeManagerResults,
    initStandings,
    NEXT_KNOCKOUT_STAGE,
    selectAdvancingTeams,
    sortStandings,
    winnersFromKnockoutRound,
} from './engine';
import { knockoutWinnerTeamId, simulateKnockoutMatch, simulateMatch } from './simulateMatch';
import { createRng } from './rng';
import {
    GROUP_LETTERS,
    type GroupLetter,
    type GroupStandingRow,
    type MatchResult,
    type TournamentState,
} from './types';

export function prepareDetailedTournament(
    managers: Manager[],
    draftedPlayers: DraftedPlayer[],
    settings: RoomSettings,
    seed = Date.now(),
): TournamentState {
    const userManagerIds = managers.map((m) => m.id);
    const teams = buildTournamentTeams(managers, draftedPlayers, settings, seed);
    const groupRevealOrder = buildGroupRevealOrder(teams);

    const groups = {} as Record<GroupLetter, string[]>;
    const groupStandings = {} as Record<GroupLetter, GroupStandingRow[]>;

    for (const group of GROUP_LETTERS) {
        groups[group] = teams.filter((t) => t.group === group).map((t) => t.id);
        groupStandings[group] = [];
    }

    return {
        seed,
        teams,
        groups,
        groupRevealOrder,
        groupStandings,
        matchSchedule: buildGroupMatchSchedule(teams),
        allMatches: [],
        knockoutMatches: [],
        playerStats: [],
        userManagerIds,
        championTeamId: '',
    };
}

export function initGroupStandingsForPlay(
    tournament: TournamentState,
): Record<GroupLetter, GroupStandingRow[]> {
    const standings = {} as Record<GroupLetter, GroupStandingRow[]>;
    for (const group of GROUP_LETTERS) {
        standings[group] = initStandings(tournament.groups[group]);
    }
    return standings;
}

export function simulateNextDetailedMatch(
    tournament: TournamentState,
    managers: Manager[],
): {
    tournament: TournamentState;
    lastMatch: MatchResult | null;
    managerResults?: ManagerTournamentResult[];
    complete: boolean;
} {
    const fixture = tournament.matchSchedule[0];
    if (!fixture) {
        return { tournament, lastMatch: null, complete: false };
    }

    const rng = createRng(tournament.seed + tournament.allMatches.length + 1);
    const home = tournament.teams.find((t) => t.id === fixture.homeTeamId);
    const away = tournament.teams.find((t) => t.id === fixture.awayTeamId);
    if (!home || !away) {
        return { tournament, lastMatch: null, complete: false };
    }

    const match =
        fixture.stage === 'group'
            ? simulateMatch(home, away, 'group', rng, fixture.id, fixture.group)
            : simulateKnockoutMatch(home, away, fixture.stage, rng, fixture.id);

    const allMatches = [...tournament.allMatches, match];
    const knockoutMatches =
        fixture.stage === 'group'
            ? tournament.knockoutMatches
            : [...tournament.knockoutMatches, match];

    let groupStandings = tournament.groupStandings;
    if (fixture.stage === 'group' && fixture.group) {
        groupStandings = {
            ...groupStandings,
            [fixture.group]: sortStandings(
                applyMatchToStandings(groupStandings[fixture.group], match),
            ),
        };
    }

    let matchSchedule = tournament.matchSchedule.slice(1);

    const groupStageJustFinished =
        fixture.stage === 'group' && matchSchedule.length === 0;

    if (groupStageJustFinished) {
        const advancing = selectAdvancingTeams(groupStandings);
        matchSchedule = buildKnockoutRoundSchedule(
            buildR32Teams(advancing),
            'r32',
            allMatches.length,
        );
    } else if (
        fixture.stage !== 'group' &&
        matchSchedule.length === 0 &&
        fixture.stage !== 'final'
    ) {
        const winners = winnersFromKnockoutRound(knockoutMatches, fixture.stage);
        const nextStage = NEXT_KNOCKOUT_STAGE[fixture.stage];
        if (nextStage && winners.length >= 2) {
            matchSchedule = buildKnockoutRoundSchedule(
                winners,
                nextStage,
                allMatches.length,
            );
        }
    }

    const complete = fixture.stage === 'final' && matchSchedule.length === 0;

    if (complete) {
        const advancing = selectAdvancingTeams(groupStandings);
        const advancingTeamIds = new Set(advancing.map((a) => a.teamId));
        const championTeamId = knockoutWinnerTeamId(match);
        const runnerUpTeamId =
            match.homeTeamId === championTeamId ? match.awayTeamId : match.homeTeamId;

        const playerStats = aggregatePlayerStats(allMatches, tournament.teams);
        const managerResults = computeManagerResults(
            managers,
            tournament.teams,
            groupStandings,
            knockoutMatches,
            championTeamId,
            runnerUpTeamId,
            advancingTeamIds,
        );

        return {
            tournament: {
                ...tournament,
                groupStandings,
                allMatches,
                knockoutMatches,
                matchSchedule: [],
                playerStats,
                championTeamId,
                runnerUpTeamId,
            },
            lastMatch: match,
            managerResults,
            complete: true,
        };
    }

    return {
        tournament: {
            ...tournament,
            groupStandings,
            allMatches,
            knockoutMatches,
            matchSchedule,
        },
        lastMatch: match,
        complete: false,
    };
}

export { buildRevealSequence };

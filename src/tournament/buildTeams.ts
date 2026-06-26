import type { DraftedPlayer, Manager, RoomSettings } from '../types';
import { filterNationalTeams } from '../draftLogic';
import { playerRatings } from '../data';
import { resolvePlayerSimValue } from '../ratings/resolveOverall';
import {
    GROUP_LETTERS,
    type GroupLetter,
    type TournamentPlayer,
    type TournamentTeam,
} from './types';
import { createRng, shuffle } from './rng';
import { computeTeamOvr, computeTeamStrength } from './teamOvr';

const TOTAL_TEAMS = 48;

function toTournamentPlayersFromDraft(drafted: DraftedPlayer[]): TournamentPlayer[] {
    return drafted.map((p) => ({
        name: p.name,
        overall: p.overall,
        position: p.assignedPosition,
    }));
}

function toTournamentPlayersFromNational(
    players: {
        name: string;
        overall: number;
        positions: import('../data').Position[];
        id: string;
        playerId?: string;
    }[],
    teamYear: number,
    settings: RoomSettings,
): TournamentPlayer[] {
    return players
        .map((p) => ({
            name: p.name,
            overall: resolvePlayerSimValue(p, teamYear, settings, playerRatings),
            position: p.positions[0],
        }))
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 11);
}

function buildTeam(
    partial: Omit<TournamentTeam, 'teamOvr' | 'strength' | 'group'>,
): Omit<TournamentTeam, 'group'> {
    const teamOvr = computeTeamOvr(partial.players);
    return {
        ...partial,
        teamOvr,
        strength: computeTeamStrength(partial.players),
    };
}

export function assignGroupsSnakeByOvr(teams: Omit<TournamentTeam, 'group'>[]): TournamentTeam[] {
    const sorted = [...teams].sort((a, b) => b.teamOvr - a.teamOvr);
    return sorted.map((team, index) => {
        const round = Math.floor(index / GROUP_LETTERS.length);
        let posInRound = index % GROUP_LETTERS.length;
        if (round % 2 === 1) {
            posInRound = GROUP_LETTERS.length - 1 - posInRound;
        }
        return {
            ...team,
            group: GROUP_LETTERS[posInRound] as GroupLetter,
        };
    });
}

export function buildGroupRevealOrder(
    teams: TournamentTeam[],
): Record<GroupLetter, string[]> {
    const order = {} as Record<GroupLetter, string[]>;
    for (const group of GROUP_LETTERS) {
        order[group] = teams
            .filter((t) => t.group === group)
            .sort((a, b) => b.teamOvr - a.teamOvr)
            .map((t) => t.id);
    }
    return order;
}

export function buildRevealSequence(
    groupRevealOrder: Record<GroupLetter, string[]>,
): { group: GroupLetter; teamId: string }[] {
    const sequence: { group: GroupLetter; teamId: string }[] = [];
    const slots = groupRevealOrder.A?.length ?? 4;

    for (let slot = 0; slot < slots; slot++) {
        for (const group of GROUP_LETTERS) {
            const teamId = groupRevealOrder[group][slot];
            if (teamId) sequence.push({ group, teamId });
        }
    }

    return sequence;
}

export function buildTournamentTeams(
    managers: Manager[],
    draftedPlayers: DraftedPlayer[],
    settings: RoomSettings,
    seed: number,
): TournamentTeam[] {
    const rng = createRng(seed);
    const rawTeams: Omit<TournamentTeam, 'group'>[] = [];

    for (const manager of managers) {
        const squad = draftedPlayers.filter((p) => p.pickedBy === manager.id);
        if (squad.length === 0) continue;

        rawTeams.push(
            buildTeam({
                id: `manager-${manager.id}`,
                name: manager.name,
                managerId: manager.id,
                players: toTournamentPlayersFromDraft(squad),
            }),
        );
    }

    const pool = shuffle(filterNationalTeams(settings), rng);
    let poolIndex = 0;
    const usedNationalIds = new Set<string>();

    while (rawTeams.length < TOTAL_TEAMS) {
        if (poolIndex >= pool.length) poolIndex = 0;
        const national = pool[poolIndex++];
        if (usedNationalIds.has(national.id)) continue;
        usedNationalIds.add(national.id);

        const players = toTournamentPlayersFromNational(
            national.players,
            national.year,
            settings,
        );
        if (players.length < 11) continue;

        rawTeams.push(
            buildTeam({
                id: `bot-${national.id}`,
                name: `${national.country} ${national.year}`,
                players,
            }),
        );
    }

    return assignGroupsSnakeByOvr(rawTeams);
}

export function getTeamById(teams: TournamentTeam[], teamId: string): TournamentTeam | undefined {
    return teams.find((t) => t.id === teamId);
}

export function matchInvolvesUser(
    match: { homeTeamId: string; awayTeamId: string },
    teams: TournamentTeam[],
    userManagerIds: string[],
): boolean {
    const home = getTeamById(teams, match.homeTeamId);
    const away = getTeamById(teams, match.awayTeamId);
    return (
        (home?.managerId !== undefined && userManagerIds.includes(home.managerId)) ||
        (away?.managerId !== undefined && userManagerIds.includes(away.managerId))
    );
}

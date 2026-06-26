import { parseCsv } from './parseCsv.js';
import type { CsvFileName } from './downloadCsv.js';
import type { Continent, NationalTeam, PlayerRatingsIndex, Position, SquadPlayer, WcPlayerRef } from './types.js';

type TournamentRow = {
    tournament_id: string;
    tournament_name: string;
};

type SquadRow = {
    tournament_id: string;
    tournament_name: string;
    team_id: string;
    team_name: string;
    player_id: string;
    family_name: string;
    given_name: string;
    position_code: string;
};

type TeamRow = {
    team_id: string;
    team_name: string;
    region_name: string;
    confederation_code: string;
    mens_team: string;
};

type GoalRow = {
    tournament_id: string;
    player_id: string;
};

const CONFEDERATION_TO_CONTINENT: Record<string, Continent> = {
    UEFA: 'Europe',
    CONMEBOL: 'South America',
    CAF: 'Africa',
    AFC: 'Asia',
    CONCACAF: 'North America',
    OFC: 'Oceania',
};

export function mapRegionToContinent(regionName: string, confederationCode: string): Continent {
    const region = regionName.trim();
    if (region === 'Africa') return 'Africa';
    if (region === 'Europe') return 'Europe';
    if (region === 'South America') return 'South America';
    if (region === 'North America') return 'North America';
    if (region === 'Oceania') return 'Oceania';
    if (region.includes('Asia') || region === 'East Asia' || region === 'West Asia') return 'Asia';

    return CONFEDERATION_TO_CONTINENT[confederationCode] ?? 'Europe';
}

export function mapPositionCode(code: string): Position | null {
    const normalized = code.trim().toUpperCase();
    if (normalized === 'GK') return 'GK';
    if (normalized === 'DF' || normalized === 'DEF') return 'DEF';
    if (normalized === 'MF' || normalized === 'MID') return 'MID';
    if (normalized === 'FW' || normalized === 'FWD') return 'FWD';
    return null;
}

export function isMensTournament(tournamentName: string): boolean {
    return !tournamentName.toLowerCase().includes('women');
}

export function parseTournamentYear(tournamentName: string, tournamentId: string): number | null {
    const fromName = tournamentName.match(/\b(19|20)\d{2}\b/);
    if (fromName) return Number(fromName[0]);

    const fromId = tournamentId.match(/\b(19|20)\d{2}\b/);
    if (fromId) return Number(fromId[0]);

    return null;
}

export function slugifyCountry(country: string): string {
    return country
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function buildPlayerName(givenName: string, familyName: string): string {
    const given = givenName.trim();
    const family = familyName.trim();
    if (given && family && given.toLowerCase() !== 'not applicable') return `${given} ${family}`;
    if (given && given.toLowerCase() !== 'not applicable') return given;
    return family || 'Unknown';
}

export interface TransformSquadsResult {
    nationalTeams: NationalTeam[];
    playerRatings: PlayerRatingsIndex;
    wcPlayers: WcPlayerRef[];
}

function upsertWcGoals(
    playerRatings: PlayerRatingsIndex,
    playerId: string,
    year: number,
    goals: number,
): void {
    const existing = playerRatings[playerId] ?? { wcGoalsByYear: {}, wcGoalsPrime: 0 };
    existing.wcGoalsByYear[year] = goals;
    existing.wcGoalsPrime = Math.max(existing.wcGoalsPrime, goals);
    playerRatings[playerId] = existing;
}

export function transformSquads(csvs: Record<CsvFileName, string>): TransformSquadsResult {
    const tournaments = parseCsv<TournamentRow>(csvs['tournaments.csv']);
    const squads = parseCsv<SquadRow>(csvs['squads.csv']);
    const teams = parseCsv<TeamRow>(csvs['teams.csv']);
    const goals = parseCsv<GoalRow>(csvs['goals.csv']);

    const mensTournamentIds = new Set<string>();
    const tournamentYears = new Map<string, number>();

    for (const tournament of tournaments) {
        if (!isMensTournament(tournament.tournament_name)) continue;
        const year = parseTournamentYear(tournament.tournament_name, tournament.tournament_id);
        if (year === null) continue;
        mensTournamentIds.add(tournament.tournament_id);
        tournamentYears.set(tournament.tournament_id, year);
    }

    const teamContinents = new Map<string, Continent>();
    for (const team of teams) {
        if (team.mens_team === '0') continue;
        teamContinents.set(
            team.team_id,
            mapRegionToContinent(team.region_name, team.confederation_code),
        );
    }

    const goalCounts = new Map<string, number>();
    for (const row of goals) {
        if (!mensTournamentIds.has(row.tournament_id)) continue;
        const key = `${row.tournament_id}:${row.player_id}`;
        goalCounts.set(key, (goalCounts.get(key) ?? 0) + 1);
    }

    const squadGroups = new Map<
        string,
        { country: string; year: number; teamId: string; tournamentId: string; rows: SquadRow[] }
    >();

    for (const row of squads) {
        if (!mensTournamentIds.has(row.tournament_id)) continue;

        const year = tournamentYears.get(row.tournament_id);
        if (year === null || year === undefined) continue;

        const groupKey = `${row.team_name}::${year}`;
        const existing = squadGroups.get(groupKey);
        if (existing) {
            existing.rows.push(row);
        } else {
            squadGroups.set(groupKey, {
                country: row.team_name,
                year,
                teamId: row.team_id,
                tournamentId: row.tournament_id,
                rows: [row],
            });
        }
    }

    const nationalTeams: NationalTeam[] = [];
    const playerRatings: PlayerRatingsIndex = {};
    const wcPlayerSeen = new Map<string, WcPlayerRef>();

    for (const group of squadGroups.values()) {
        const continent = teamContinents.get(group.teamId) ?? 'Europe';
        const teamSlug = slugifyCountry(group.country);
        const teamId = `${teamSlug}-${group.year}`;

        const players: SquadPlayer[] = [];

        for (const row of group.rows) {
            const position = mapPositionCode(row.position_code);
            if (!position) continue;

            const statsKey = `${group.tournamentId}:${row.player_id}`;
            const wcGoals = goalCounts.get(statsKey) ?? 0;
            const name = buildPlayerName(row.given_name, row.family_name);

            upsertWcGoals(playerRatings, row.player_id, group.year, wcGoals);

            if (!wcPlayerSeen.has(row.player_id)) {
                wcPlayerSeen.set(row.player_id, {
                    playerId: row.player_id,
                    name,
                    country: group.country,
                });
            }

            players.push({
                id: `${teamId}-${row.player_id}`,
                playerId: row.player_id,
                name,
                positions: [position],
                overall: 0,
            });
        }

        if (players.length === 0) continue;

        nationalTeams.push({
            id: teamId,
            country: group.country,
            year: group.year,
            continent,
            players,
        });
    }

    nationalTeams.sort((a, b) => a.year - b.year || a.country.localeCompare(b.country));
    return {
        nationalTeams,
        playerRatings,
        wcPlayers: [...wcPlayerSeen.values()],
    };
}

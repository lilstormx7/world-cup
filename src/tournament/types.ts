import type { Position } from '../data';

export type GroupLetter =
    | 'A'
    | 'B'
    | 'C'
    | 'D'
    | 'E'
    | 'F'
    | 'G'
    | 'H'
    | 'I'
    | 'J'
    | 'K'
    | 'L';

export const GROUP_LETTERS: GroupLetter[] = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
];

export type KnockoutStage = 'r32' | 'r16' | 'qf' | 'sf' | 'final';

export type MatchStage = 'group' | KnockoutStage;

export interface TournamentPlayer {
    name: string;
    overall: number;
    position: Position;
}

export interface TournamentTeam {
    id: string;
    name: string;
    managerId?: string;
    group: GroupLetter;
    players: TournamentPlayer[];
    /** Average OVR of the best 11 players. */
    teamOvr: number;
    /** Sum of top-11 overalls — used by the match engine. */
    strength: number;
}

export interface ScheduledMatch {
    id: string;
    stage: MatchStage;
    group?: GroupLetter;
    homeTeamId: string;
    awayTeamId: string;
}

export interface GoalEvent {
    minute: number;
    teamId: string;
    scorerName: string;
    assistName?: string;
    /** Penalty shootout attempt (minute ≥ 120). */
    penaltyShootout?: boolean;
    /** For shootout attempts only. */
    scored?: boolean;
}

export interface MatchResult {
    id: string;
    stage: MatchStage;
    group?: GroupLetter;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    /** Penalty shootout score (knockout only, when regulation is tied). */
    homePenalties?: number;
    awayPenalties?: number;
    events: GoalEvent[];
}

export interface GroupStandingRow {
    teamId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
}

export interface PlayerTournamentStat {
    playerName: string;
    teamId: string;
    teamName: string;
    goals: number;
    assists: number;
}

export interface ManagerTournamentResult {
    managerId: string;
    rank: number;
    eliminatedIn: MatchStage | 'winner';
    groupName?: GroupLetter;
    groupRecord?: { w: number; d: number; l: number; gd: number };
}

export interface TournamentState {
    seed: number;
    teams: TournamentTeam[];
    groups: Record<GroupLetter, string[]>;
    groupRevealOrder: Record<GroupLetter, string[]>;
    groupStandings: Record<GroupLetter, GroupStandingRow[]>;
    /** Remaining fixtures for detailed step-by-step simulation. */
    matchSchedule: ScheduledMatch[];
    allMatches: MatchResult[];
    knockoutMatches: MatchResult[];
    playerStats: PlayerTournamentStat[];
    userManagerIds: string[];
    championTeamId: string;
    runnerUpTeamId?: string;
}

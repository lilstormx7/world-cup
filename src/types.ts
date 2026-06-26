import { FormationId, Position, SquadPlayer } from './data';

import type { ManagerTournamentResult, TournamentState } from './tournament/types';



export type Continent =

    | 'Europe'

    | 'South America'

    | 'Africa'

    | 'Asia'

    | 'North America'

    | 'Oceania';



export type SimulationStyle = 'fast' | 'detailed';

export type RatingScope = 'all_time_prime' | 'year_rating';

export type SimulationPhase = 'idle' | 'revealing' | 'playing' | 'complete';



export interface Manager {

    id: string;

    name: string;

    isHost?: boolean;

    formation: FormationId | null;

    rerollsRemaining: number;

}



export type ManagerInput = Pick<Manager, 'id' | 'name' | 'isHost'>;



export interface RoomSettings {

    allTime: boolean;

    yearStart: number;

    yearEnd: number;

    continents: Continent[] | 'all';

    showOverall: boolean;

    draftTimeSeconds: number;

    simulationStyle: SimulationStyle;

    ratingScope: RatingScope;

}



export interface DraftedPlayer extends SquadPlayer {

    pickedBy: string;

    pickNumber: number;

    slotIndex: number;

    assignedPosition: Position;

}



export type GameStatus = 'landing' | 'lobby' | 'formation_select' | 'drafting' | 'post_draft';

export interface ManagerDraftProgress {
    activeNationalTeamId: string | null;
    timer: number;
    turnStartedAt?: number;
    picksCompleted: number;
    isComplete: boolean;
}

export interface DraftState {

    status: GameStatus;

    roomCode: string | null;

    settings: RoomSettings;

    managers: Manager[];

    currentUser: Manager | null;

    draftOrder: string[];

    currentTurnIndex: number;

    draftedPlayers: DraftedPlayer[];

    timer: number;

    logs: string[];

    activeNationalTeamId: string | null;

    tournament?: TournamentState;

    managerResults?: ManagerTournamentResult[];

    simulationPhase: SimulationPhase;

    playbackIndex: number;

    /** Teams revealed in detailed group draw (0–48). */
    revealIndex: number;

    /** Last simulated match shown in detailed mode. */
    lastSimulatedMatchId: string | null;

    /** Monotonic room revision from Firebase (for sync). */
    revision: number;

    /** Shared seed for deterministic tournament simulation. */
    simulationSeed?: number;

    /** Epoch ms when the current draft turn timer started. */
    turnStartedAt?: number;

    /** Per-manager parallel draft progress. */
    managerDraftProgress: Record<string, ManagerDraftProgress>;

}



export const DEFAULT_ROOM_SETTINGS: RoomSettings = {

    allTime: false,

    yearStart: 2014,

    yearEnd: 2022,

    continents: 'all',

    showOverall: true,

    draftTimeSeconds: 60,

    simulationStyle: 'fast',

    ratingScope: 'year_rating',

};



export const ALL_CONTINENTS: Continent[] = [

    'Europe',

    'South America',

    'Africa',

    'Asia',

    'North America',

    'Oceania',

];



export type { ManagerTournamentResult, TournamentState };



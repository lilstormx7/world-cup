export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type Continent =
    | 'Europe'
    | 'South America'
    | 'Africa'
    | 'Asia'
    | 'North America'
    | 'Oceania';

export interface SquadPlayer {
    id: string;
    playerId: string;
    name: string;
    positions: Position[];
    overall: number;
}

export interface PlayerRatingsEntry {
    /** SoFIFA overall rating (1–99) keyed by calendar year. */
    ovrByYear?: Record<number, number>;
    ovrPrime?: number;
    sofifaPlayerId?: string;
    /** Fjelstul goals.csv — WC goals when no SoFIFA match exists. */
    wcGoalsByYear: Record<number, number>;
    wcGoalsPrime: number;
}

export type PlayerRatingsIndex = Record<string, PlayerRatingsEntry>;

export interface WcPlayerRef {
    playerId: string;
    name: string;
    country: string;
}

export interface NationalTeam {
    id: string;
    country: string;
    year: number;
    continent: Continent;
    players: SquadPlayer[];
}

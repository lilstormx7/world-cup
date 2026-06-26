/** Per-player values sourced from SoFIFA (OVR) and Fjelstul WC CSVs (goals fallback). */
export interface PlayerRatingsEntry {
    /** SoFIFA overall rating (1–99) keyed by calendar year. */
    ovrByYear?: Record<number, number>;
    ovrPrime?: number;
    sofifaPlayerId?: string;
    /** Fjelstul goals.csv — WC goals in that tournament year. */
    wcGoalsByYear: Record<number, number>;
    wcGoalsPrime: number;
}

export type PlayerRatingsIndex = Record<string, PlayerRatingsEntry>;

export type RatingSourceKind = 'sofifa' | 'default';

export interface ResolvedPlayerRating {
    simValue: number;
    label: string;
    source: RatingSourceKind;
}

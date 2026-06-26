import type { PlayerRatingsIndex } from '../ratings/types';
import nationalTeamsJson from './nationalTeams.json';
import playerRatingsJson from './playerRatings.json';

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type FormationId = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2';

export interface Formation {
    id: FormationId;
    label: string;
    slots: Position[];
}

export const FORMATIONS: Record<FormationId, Formation> = {
    '4-4-2': {
        id: '4-4-2',
        label: '4-4-2',
        slots: ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD'],
    },
    '4-3-3': {
        id: '4-3-3',
        label: '4-3-3',
        slots: ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'],
    },
    '3-5-2': {
        id: '3-5-2',
        label: '3-5-2',
        slots: ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD'],
    },
    '4-2-3-1': {
        id: '4-2-3-1',
        label: '4-2-3-1',
        slots: ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD'],
    },
    '5-3-2': {
        id: '5-3-2',
        label: '5-3-2',
        slots: ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'],
    },
};

export interface SquadPlayer {
    id: string;
    playerId?: string;
    name: string;
    positions: Position[];
    overall: number;
}

export interface NationalTeam {
    id: string;
    country: string;
    year: number;
    continent: import('../types').Continent;
    players: SquadPlayer[];
}

/** World Cup years with SoFIFA OVR edition data (FIFA 15–23). */
export const OVR_WORLD_CUP_YEARS = [2014, 2018, 2022] as const;

export const OVR_YEAR_START = OVR_WORLD_CUP_YEARS[0];
export const OVR_YEAR_END = OVR_WORLD_CUP_YEARS[OVR_WORLD_CUP_YEARS.length - 1];

export const YEAR_OPTIONS: number[] = [...OVR_WORLD_CUP_YEARS];

export const nationalTeams: NationalTeam[] = nationalTeamsJson as NationalTeam[];

export const playerRatings = playerRatingsJson as PlayerRatingsIndex;

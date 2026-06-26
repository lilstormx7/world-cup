import type { Position } from '../data';

/** Squad floor OVR when no SoFIFA match exists (World Cup squad minimum). */
export const POSITION_DEFAULT_OVR: Record<Position, number> = {
    GK: 66,
    DEF: 68,
    MID: 69,
    FWD: 70,
};

export function defaultOvrForPositions(positions: Position[]): number {
    if (positions.length === 0) return POSITION_DEFAULT_OVR.MID;
    return Math.max(...positions.map((p) => POSITION_DEFAULT_OVR[p]));
}

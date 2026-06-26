import type { TournamentPlayer } from './types';

const TOP_SQUAD_SIZE = 11;

export function top11Players(players: TournamentPlayer[]): TournamentPlayer[] {
    return [...players].sort((a, b) => b.overall - a.overall).slice(0, TOP_SQUAD_SIZE);
}

/** Team OVR = average overall of the best 11 players. */
export function computeTeamOvr(players: TournamentPlayer[]): number {
    const top = top11Players(players);
    if (top.length === 0) return 0;
    const sum = top.reduce((acc, p) => acc + p.overall, 0);
    return Math.round((sum / top.length) * 10) / 10;
}

/** Match engine strength = sum of top-11 overalls (keeps goal scale stable). */
export function computeTeamStrength(players: TournamentPlayer[]): number {
    return top11Players(players).reduce((sum, p) => sum + p.overall, 0);
}

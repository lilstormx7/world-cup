import { FORMATIONS, FormationId, NationalTeam, OVR_WORLD_CUP_YEARS, Position, SquadPlayer, nationalTeams } from './data';
import { DraftedPlayer, Manager, RoomSettings } from './types';
import { extractPlayerId } from './ratings/resolveOverall';

const OVR_YEARS = new Set<number>(OVR_WORLD_CUP_YEARS);

/** Stable Fjelstul player id (same person across WC squads/years). */
export function getPlayerIdentityId(player: Pick<SquadPlayer, 'id' | 'playerId'>): string {
    return extractPlayerId(player.id, player.playerId);
}

export function filterNationalTeams(settings: RoomSettings): NationalTeam[] {
    return nationalTeams.filter((team) => {
        if (!OVR_YEARS.has(team.year)) return false;

        const yearOk =
            settings.allTime ||
            (team.year >= settings.yearStart && team.year <= settings.yearEnd);
        const continentOk =
            settings.continents === 'all' || settings.continents.includes(team.continent);
        return yearOk && continentOk;
    });
}

export function pickRandomNationalTeam(
    settings: RoomSettings,
    excludeIds: string[] = [],
): NationalTeam | null {
    const pool = filterNationalTeams(settings).filter((t) => !excludeIds.includes(t.id));
    if (pool.length === 0) {
        const fallback = filterNationalTeams(settings);
        if (fallback.length === 0) return null;
        return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

export function getFormationSlots(formationId: FormationId): Position[] {
    return FORMATIONS[formationId].slots;
}

export function getFilledSlotIndices(draftedPlayers: DraftedPlayer[], managerId: string): Set<number> {
    return new Set(
        draftedPlayers.filter((p) => p.pickedBy === managerId).map((p) => p.slotIndex),
    );
}

export function getOpenPositions(
    formationId: FormationId,
    draftedPlayers: DraftedPlayer[],
    managerId: string,
): Position[] {
    const slots = getFormationSlots(formationId);
    const filled = getFilledSlotIndices(draftedPlayers, managerId);
    const open: Position[] = [];
    slots.forEach((pos, index) => {
        if (!filled.has(index)) open.push(pos);
    });
    return open;
}

export function canPlayerFillFormation(
    player: SquadPlayer,
    formationId: FormationId,
    draftedPlayers: DraftedPlayer[],
    managerId: string,
): boolean {
    const slots = getFormationSlots(formationId);
    const filled = getFilledSlotIndices(draftedPlayers, managerId);

    for (let i = 0; i < slots.length; i++) {
        if (filled.has(i)) continue;
        if (player.positions.includes(slots[i])) return true;
    }
    return false;
}

export function assignPlayerToSlot(
    player: SquadPlayer,
    formationId: FormationId,
    draftedPlayers: DraftedPlayer[],
    managerId: string,
): { slotIndex: number; assignedPosition: Position } | null {
    const slots = getFormationSlots(formationId);
    const filled = getFilledSlotIndices(draftedPlayers, managerId);

    for (const pos of player.positions) {
        for (let i = 0; i < slots.length; i++) {
            if (filled.has(i)) continue;
            if (slots[i] === pos) {
                return { slotIndex: i, assignedPosition: pos };
            }
        }
    }
    return null;
}

export function isPlayerDraftedGlobally(
    player: Pick<SquadPlayer, 'id' | 'playerId'>,
    draftedPlayers: DraftedPlayer[],
): boolean {
    const identity = getPlayerIdentityId(player);
    return draftedPlayers.some((p) => getPlayerIdentityId(p) === identity);
}

export function getSelectablePlayers(
    team: NationalTeam,
    formationId: FormationId,
    draftedPlayers: DraftedPlayer[],
    managerId: string,
): SquadPlayer[] {
    return team.players.filter(
        (p) =>
            !isPlayerDraftedGlobally(p, draftedPlayers) &&
            canPlayerFillFormation(p, formationId, draftedPlayers, managerId),
    );
}

export function getNationalTeamById(id: string | null): NationalTeam | null {
    if (!id) return null;
    return nationalTeams.find((t) => t.id === id) ?? null;
}

export function allManagersHaveFormation(managers: Manager[]): boolean {
    return managers.length > 0 && managers.every((m) => m.formation !== null);
}

export function generateSnakeDraft(managers: string[], rounds: number): string[] {
    const order: string[] = [];
    for (let r = 0; r < rounds; r++) {
        if (r % 2 === 0) {
            order.push(...managers);
        } else {
            order.push(...[...managers].reverse());
        }
    }
    return order;
}

export function pickRandomFormation(): FormationId {
    const ids = Object.keys(FORMATIONS) as FormationId[];
    return ids[Math.floor(Math.random() * ids.length)];
}

export const PICKS_PER_MANAGER = 11;

export function createEmptyManagerDraftProgress(settings: RoomSettings): import('./types').ManagerDraftProgress {
    return {
        activeNationalTeamId: null,
        timer: settings.draftTimeSeconds,
        picksCompleted: 0,
        isComplete: false,
    };
}

export function initManagerDraftProgress(
    settings: RoomSettings,
    excludeIds: string[] = [],
): import('./types').ManagerDraftProgress {
    const team = pickRandomNationalTeam(settings, excludeIds);
    return {
        activeNationalTeamId: team?.id ?? null,
        timer: settings.draftTimeSeconds,
        turnStartedAt: Date.now(),
        picksCompleted: 0,
        isComplete: false,
    };
}

export function getManagerPickCount(managerId: string, draftedPlayers: DraftedPlayer[]): number {
    return draftedPlayers.filter((p) => p.pickedBy === managerId).length;
}

export function allManagersDraftComplete(
    managers: Manager[],
    draftedPlayers: DraftedPlayer[],
    progress: Record<string, import('./types').ManagerDraftProgress>,
): boolean {
    if (managers.length === 0) return false;
    return managers.every((m) => {
        const p = progress[m.id];
        return p?.isComplete === true || getManagerPickCount(m.id, draftedPlayers) >= PICKS_PER_MANAGER;
    });
}

export function pickRandomSelectablePlayer(
    team: NationalTeam,
    formationId: FormationId,
    draftedPlayers: DraftedPlayer[],
    managerId: string,
): SquadPlayer | null {
    const selectable = getSelectablePlayers(team, formationId, draftedPlayers, managerId);
    if (selectable.length === 0) return null;
    return selectable[Math.floor(Math.random() * selectable.length)];
}

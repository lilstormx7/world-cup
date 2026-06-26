import type { DraftState } from '../types';
import type { Manager } from '../types';
import { DEFAULT_ROOM_SETTINGS } from '../types';
import { createEmptyManagerDraftProgress } from '../draftLogic';

/** Room state persisted in Firebase (everything except per-client currentUser). */
export interface SharedRoomState {
    revision: number;
    status: DraftState['status'];
    roomCode: string;
    settings: DraftState['settings'];
    managers: Manager[];
    draftOrder: string[];
    currentTurnIndex: number;
    draftedPlayers: DraftState['draftedPlayers'];
    timer: number;
    logs: string[];
    activeNationalTeamId: string | null;
    tournament?: DraftState['tournament'];
    managerResults?: DraftState['managerResults'];
    simulationPhase: DraftState['simulationPhase'];
    playbackIndex: number;
    revealIndex: number;
    lastSimulatedMatchId: string | null;
    simulationSeed?: number;
    turnStartedAt?: number;
    managerDraftProgress: Record<string, import('../types').ManagerDraftProgress>;
}

/** Strip undefined values so Firebase RTDB accepts the payload. */
export function sanitizeForFirebase<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeForFirebase(item)) as T;
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (val !== undefined) {
            result[key] = sanitizeForFirebase(val);
        }
    }
    return result as T;
}

export function createInitialSharedRoom(
    roomCode: string,
    host: Manager,
): SharedRoomState {
    return {
        revision: 1,
        status: 'lobby',
        roomCode,
        settings: { ...DEFAULT_ROOM_SETTINGS },
        managers: [host],
        draftOrder: [],
        currentTurnIndex: 0,
        draftedPlayers: [],
        timer: DEFAULT_ROOM_SETTINGS.draftTimeSeconds,
        logs: [`Room ${roomCode} created by ${host.name}.`],
        activeNationalTeamId: null,
        simulationPhase: 'idle',
        playbackIndex: 0,
        revealIndex: 0,
        lastSimulatedMatchId: null,
        managerDraftProgress: {},
    };
}

export function extractShared(state: DraftState): SharedRoomState {
    if (!state.roomCode) {
        throw new Error('Cannot extract shared state without roomCode');
    }
    return sanitizeForFirebase({
        revision: state.revision ?? 0,
        status: state.status,
        roomCode: state.roomCode,
        settings: state.settings,
        managers: state.managers,
        draftOrder: state.draftOrder,
        currentTurnIndex: state.currentTurnIndex,
        draftedPlayers: state.draftedPlayers,
        timer: state.timer,
        logs: state.logs,
        activeNationalTeamId: state.activeNationalTeamId,
        tournament: state.tournament,
        managerResults: state.managerResults,
        simulationPhase: state.simulationPhase,
        playbackIndex: state.playbackIndex,
        revealIndex: state.revealIndex,
        lastSimulatedMatchId: state.lastSimulatedMatchId,
        simulationSeed: state.simulationSeed,
        turnStartedAt: state.turnStartedAt,
        managerDraftProgress: state.managerDraftProgress,
    });
}

export function mergeSharedIntoState(
    state: DraftState,
    shared: SharedRoomState,
    managerId: string | null,
): DraftState {
    const managers = (shared.managers ?? []).map((m) => ({
        ...m,
        formation: m.formation ?? null,
    }));
    const matchedManager =
        managerId != null ? managers.find((m) => m.id === managerId) : null;
    const currentUser = matchedManager
        ? {
              ...matchedManager,
              formation: matchedManager.formation ?? null,
          }
        : state.currentUser;

    const status = shared.status ?? state.status;
    const settings = shared.settings ?? state.settings;
    let managerDraftProgress = shared.managerDraftProgress ?? {};

    if (status === 'drafting') {
        const filled = { ...managerDraftProgress };
        for (const manager of managers) {
            if (!filled[manager.id]) {
                filled[manager.id] = createEmptyManagerDraftProgress(settings);
            }
        }
        managerDraftProgress = filled;
    }

    return {
        ...state,
        revision: shared.revision,
        status,
        roomCode: shared.roomCode,
        settings,
        managers,
        draftOrder: shared.draftOrder ?? [],
        currentTurnIndex: shared.currentTurnIndex ?? 0,
        draftedPlayers: shared.draftedPlayers ?? [],
        timer: shared.timer ?? state.timer,
        logs: shared.logs ?? [],
        activeNationalTeamId: shared.activeNationalTeamId ?? null,
        tournament: shared.tournament,
        managerResults: shared.managerResults,
        simulationPhase: shared.simulationPhase ?? state.simulationPhase,
        playbackIndex: shared.playbackIndex ?? 0,
        revealIndex: shared.revealIndex ?? 0,
        lastSimulatedMatchId: shared.lastSimulatedMatchId ?? null,
        simulationSeed: shared.simulationSeed,
        turnStartedAt: shared.turnStartedAt,
        managerDraftProgress,
        currentUser,
    };
}

export function resolveManagerFromShared(
    shared: SharedRoomState,
    managerId: string,
): Manager | null {
    return shared.managers.find((m) => m.id === managerId) ?? null;
}

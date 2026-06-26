import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useReducer,
    useRef,
    useState,
    ReactNode,
} from 'react';
import {
    DraftState,
    Manager,
    ManagerInput,
    DraftedPlayer,
    RoomSettings,
    DEFAULT_ROOM_SETTINGS,
    Continent,
    ManagerDraftProgress,
} from './types';
import { SquadPlayer, playerRatings } from './data';
import { resolvePlayerSimValue } from './ratings/resolveOverall';
import {
    allManagersHaveFormation,
    allManagersDraftComplete,
    assignPlayerToSlot,
    getNationalTeamById,
    getSelectablePlayers,
    getManagerPickCount,
    initManagerDraftProgress,
    pickRandomFormation,
    pickRandomNationalTeam,
    pickRandomSelectablePlayer,
    PICKS_PER_MANAGER,
} from './draftLogic';

import { simulateTournament } from './tournament/engine';
import {
    buildRevealSequence,
    initGroupStandingsForPlay,
    prepareDetailedTournament,
    simulateNextDetailedMatch,
} from './tournament/detailedEngine';
import { isFirebaseConfigured } from './multiplayer/firebase';
import { createRoom, joinRoom, subscribeRoom, updateRoom, fetchRoom } from './multiplayer/roomApi';
import { extractShared, mergeSharedIntoState } from './multiplayer/roomState';
import { loadSession, saveSession, clearSession, isInviteLinkVisit } from './multiplayer/session';

type Action =
    | { type: 'CREATE_ROOM'; payload: { roomCode: string; manager: ManagerInput } }
    | { type: 'JOIN_ROOM'; payload: { roomCode: string; manager: ManagerInput } }
    | { type: 'ROOM_CONNECTED'; payload: { shared: import('./multiplayer/roomState').SharedRoomState; manager: Manager } }
    | { type: 'SYNC_ROOM'; payload: { shared: import('./multiplayer/roomState').SharedRoomState; managerId: string | null } }
    | { type: 'ADD_MOCK_MANAGER'; payload: ManagerInput }
    | { type: 'UPDATE_ROOM_SETTINGS'; payload: Partial<RoomSettings> }
    | { type: 'SET_FORMATION'; payload: { managerId: string; formation: import('./data').FormationId } }
    | { type: 'START_DRAFT' }
    | { type: 'DRAFT_PLAYER'; payload: { player: SquadPlayer; managerId: string } }
    | { type: 'REROLL'; payload: { managerId: string } }
    | { type: 'TICK_TIMER' }
    | { type: 'AUTO_DRAFT_PICK'; payload: { managerId: string } }
    | { type: 'START_SIMULATION'; payload?: { seed: number } }
    | { type: 'ADVANCE_PLAYBACK' };

const initialState: DraftState = {
    status: 'landing',
    roomCode: null,
    settings: DEFAULT_ROOM_SETTINGS,
    managers: [],
    currentUser: null,
    draftOrder: [],
    currentTurnIndex: 0,
    draftedPlayers: [],
    timer: DEFAULT_ROOM_SETTINGS.draftTimeSeconds,
    logs: [],
    activeNationalTeamId: null,
    simulationPhase: 'idle',
    playbackIndex: 0,
    revealIndex: 0,
    lastSimulatedMatchId: null,
    revision: 0,
    managerDraftProgress: {},
};

const HOST_ONLY_ACTIONS = new Set<Action['type']>([
    'START_DRAFT',
    'UPDATE_ROOM_SETTINGS',
    'TICK_TIMER',
    'ADD_MOCK_MANAGER',
]);

const SYNC_ACTIONS = new Set<Action['type']>([
    'ADD_MOCK_MANAGER',
    'UPDATE_ROOM_SETTINGS',
    'SET_FORMATION',
    'START_DRAFT',
    'DRAFT_PLAYER',
    'REROLL',
    'TICK_TIMER',
    'AUTO_DRAFT_PICK',
    'START_SIMULATION',
    'ADVANCE_PLAYBACK',
]);

function createManager(base: ManagerInput): Manager {
    return { ...base, formation: null, rerollsRemaining: 3 };
}

function newManagerId(): string {
    return globalThis.crypto?.randomUUID?.() ?? Date.now().toString();
}

function drawTeamForManager(
    progress: ManagerDraftProgress,
    settings: RoomSettings,
    managerName: string,
    excludeIds: string[] = [],
): { progress: ManagerDraftProgress; log?: string } {
    const team = pickRandomNationalTeam(settings, excludeIds);
    if (!team) {
        return { progress: { ...progress, activeNationalTeamId: null } };
    }
    return {
        progress: {
            ...progress,
            activeNationalTeamId: team.id,
            timer: settings.draftTimeSeconds,
            turnStartedAt: Date.now(),
        },
        log: `${managerName} draws ${team.country} ${team.year}.`,
    };
}

function maybeBeginParallelDraft(state: DraftState): DraftState {
    if (state.status !== 'formation_select' || !allManagersHaveFormation(state.managers)) {
        return state;
    }

    const logs = [...state.logs, 'All formations locked. The draft begins!'];
    let draftingState: DraftState = {
        ...state,
        status: 'drafting',
        draftOrder: [],
        currentTurnIndex: 0,
        draftedPlayers: [],
        logs,
        activeNationalTeamId: null,
        managerDraftProgress: {},
    };

    const progress: Record<string, ManagerDraftProgress> = {};
    for (const manager of draftingState.managers) {
        const { progress: p, log } = drawTeamForManager(
            initManagerDraftProgress(draftingState.settings),
            draftingState.settings,
            manager.name,
        );
        progress[manager.id] = p;
        if (log) draftingState = { ...draftingState, logs: [...draftingState.logs, log] };
    }

    return { ...draftingState, managerDraftProgress: progress };
}

function finishDraftIfComplete(state: DraftState): DraftState {
    if (!allManagersDraftComplete(state.managers, state.draftedPlayers, state.managerDraftProgress)) {
        return state;
    }
    return {
        ...state,
        status: 'post_draft',
        activeNationalTeamId: null,
        managerDraftProgress: Object.fromEntries(
            Object.entries(state.managerDraftProgress).map(([id, p]) => [
                id,
                { ...p, isComplete: true, activeNationalTeamId: null },
            ]),
        ),
        logs: [...state.logs, 'Draft complete! All squads are locked.'],
    };
}

function applyPlayerDraft(
    state: DraftState,
    managerId: string,
    player: SquadPlayer,
    autoPick = false,
): DraftState {
    const manager = state.managers.find((m) => m.id === managerId);
    const progress = state.managerDraftProgress[managerId];
    if (!manager?.formation || !progress || progress.isComplete) return state;

    const team = getNationalTeamById(progress.activeNationalTeamId);
    if (!team) return state;

    const selectable = getSelectablePlayers(
        team,
        manager.formation,
        state.draftedPlayers,
        managerId,
    );
    if (!selectable.some((p) => p.id === player.id)) return state;

    const slot = assignPlayerToSlot(player, manager.formation, state.draftedPlayers, managerId);
    if (!slot) return state;

    const resolvedOverall = resolvePlayerSimValue(
        player,
        team.year,
        state.settings,
        playerRatings,
    );

    const draftedPlayer: DraftedPlayer = {
        ...player,
        overall: resolvedOverall,
        pickedBy: managerId,
        pickNumber: state.draftedPlayers.length + 1,
        slotIndex: slot.slotIndex,
        assignedPosition: slot.assignedPosition,
    };

    const picksCompleted = getManagerPickCount(managerId, state.draftedPlayers) + 1;
    const isComplete = picksCompleted >= PICKS_PER_MANAGER;

    let updatedProgress = { ...progress, picksCompleted, isComplete };
    const logs = [
        ...state.logs,
        autoPick
            ? `${manager.name} auto-drafted ${player.name} from ${team.country} ${team.year} (time expired).`
            : `${manager.name} drafted ${player.name} from ${team.country} ${team.year}.`,
    ];

    if (!isComplete) {
        const exclude = progress.activeNationalTeamId ? [progress.activeNationalTeamId] : [];
        const drawn = drawTeamForManager(updatedProgress, state.settings, manager.name, exclude);
        updatedProgress = drawn.progress;
        if (drawn.log) logs.push(drawn.log);
    } else {
        updatedProgress = { ...updatedProgress, activeNationalTeamId: null, timer: 0 };
    }

    const next: DraftState = {
        ...state,
        draftedPlayers: [...state.draftedPlayers, draftedPlayer],
        managerDraftProgress: {
            ...state.managerDraftProgress,
            [managerId]: updatedProgress,
        },
        logs,
    };

    return finishDraftIfComplete(next);
}

function applyAutoDraftPick(state: DraftState, managerId: string): DraftState {
    const manager = state.managers.find((m) => m.id === managerId);
    const progress = state.managerDraftProgress[managerId];
    if (!manager?.formation || !progress || progress.isComplete) return state;

    let team = getNationalTeamById(progress.activeNationalTeamId);
    if (!team) return state;

    let player = pickRandomSelectablePlayer(
        team,
        manager.formation,
        state.draftedPlayers,
        managerId,
    );

    if (!player) {
        const exclude = progress.activeNationalTeamId ? [progress.activeNationalTeamId] : [];
        const newTeam = pickRandomNationalTeam(state.settings, exclude);
        if (!newTeam) return state;

        const updatedProgress: ManagerDraftProgress = {
            ...progress,
            activeNationalTeamId: newTeam.id,
            timer: state.settings.draftTimeSeconds,
            turnStartedAt: Date.now(),
        };
        team = newTeam;
        player = pickRandomSelectablePlayer(
            team,
            manager.formation,
            state.draftedPlayers,
            managerId,
        );

        if (!player) {
            return {
                ...state,
                managerDraftProgress: {
                    ...state.managerDraftProgress,
                    [managerId]: updatedProgress,
                },
                logs: [
                    ...state.logs,
                    `${manager.name} drew ${team.country} ${team.year} but no valid auto-pick was available.`,
                ],
            };
        }

        state = {
            ...state,
            managerDraftProgress: {
                ...state.managerDraftProgress,
                [managerId]: updatedProgress,
            },
            logs: [...state.logs, `${manager.name} draws ${team.country} ${team.year}.`],
        };
    }

    return applyPlayerDraft(state, managerId, player, true);
}

function reducer(state: DraftState, action: Action): DraftState {
    switch (action.type) {
        case 'ROOM_CONNECTED':
            return mergeSharedIntoState(
                { ...initialState, revision: 0 },
                action.payload.shared,
                action.payload.manager.id,
            );

        case 'SYNC_ROOM': {
            if (action.payload.shared.revision <= state.revision) return state;
            return mergeSharedIntoState(state, action.payload.shared, action.payload.managerId);
        }

        case 'CREATE_ROOM':
            return {
                ...initialState,
                status: 'lobby',
                roomCode: action.payload.roomCode,
                settings: { ...DEFAULT_ROOM_SETTINGS },
                managers: [createManager(action.payload.manager)],
                currentUser: createManager(action.payload.manager),
                logs: [`Room ${action.payload.roomCode} created by ${action.payload.manager.name}.`],
                revision: 1,
            };

        case 'JOIN_ROOM':
            return {
                ...state,
                status: 'lobby',
                roomCode: action.payload.roomCode,
                managers: [...state.managers, createManager(action.payload.manager)],
                currentUser: createManager(action.payload.manager),
                logs: [...state.logs, `${action.payload.manager.name} joined the room.`],
                revision: state.revision + 1,
            };

        case 'ADD_MOCK_MANAGER': {
            const bot = createManager(action.payload);
            const withBot = {
                ...state,
                managers: [...state.managers, bot],
                logs: [...state.logs, `${bot.name} joined the room.`],
            };
            if (withBot.status === 'formation_select') {
                const botFormation = pickRandomFormation();
                return maybeBeginParallelDraft({
                    ...withBot,
                    managers: withBot.managers.map((m) =>
                        m.id === bot.id ? { ...m, formation: botFormation } : m,
                    ),
                    logs: [...withBot.logs, `${bot.name} chose ${botFormation}.`],
                });
            }
            return withBot;
        }

        case 'UPDATE_ROOM_SETTINGS':
            return {
                ...state,
                settings: { ...state.settings, ...action.payload },
            };

        case 'SET_FORMATION': {
            const updatedManagers = state.managers.map((m) =>
                m.id === action.payload.managerId
                    ? { ...m, formation: action.payload.formation }
                    : m,
            );
            const managerName = state.managers.find((m) => m.id === action.payload.managerId)?.name;
            const next = {
                ...state,
                managers: updatedManagers,
                currentUser:
                    state.currentUser?.id === action.payload.managerId
                        ? { ...state.currentUser, formation: action.payload.formation }
                        : state.currentUser,
                logs: [...state.logs, `${managerName} chose ${action.payload.formation}.`],
            };
            return maybeBeginParallelDraft(next);
        }

        case 'START_DRAFT': {
            const managers = state.managers.map((m) =>
                m.name.startsWith('Bot')
                    ? { ...m, formation: m.formation ?? pickRandomFormation() }
                    : m,
            );
            const next: DraftState = {
                ...state,
                managers,
                status: 'formation_select',
                managerDraftProgress: {},
                logs: [...state.logs, 'Choose your formation before the draft begins.'],
            };
            return maybeBeginParallelDraft(next);
        }

        case 'DRAFT_PLAYER':
            return applyPlayerDraft(state, action.payload.managerId, action.payload.player);

        case 'REROLL': {
            const { managerId } = action.payload;
            const manager = state.managers.find((m) => m.id === managerId);
            const progress = state.managerDraftProgress[managerId];
            if (!manager || !progress || progress.isComplete) return state;
            if (manager.rerollsRemaining <= 0) return state;

            const exclude = progress.activeNationalTeamId ? [progress.activeNationalTeamId] : [];
            const drawn = drawTeamForManager(progress, state.settings, manager.name, exclude);
            const updatedManagers = state.managers.map((m) =>
                m.id === managerId ? { ...m, rerollsRemaining: m.rerollsRemaining - 1 } : m,
            );

            const logs = [
                ...state.logs,
                `${manager.name} used a reroll (${manager.rerollsRemaining - 1} left).`,
            ];
            if (drawn.log) logs.push(drawn.log);

            return {
                ...state,
                managers: updatedManagers,
                currentUser:
                    state.currentUser?.id === managerId
                        ? { ...state.currentUser, rerollsRemaining: manager.rerollsRemaining - 1 }
                        : state.currentUser,
                managerDraftProgress: {
                    ...state.managerDraftProgress,
                    [managerId]: drawn.progress,
                },
                logs,
            };
        }

        case 'AUTO_DRAFT_PICK':
            return applyAutoDraftPick(state, action.payload.managerId);

        case 'TICK_TIMER': {
            if (state.status !== 'drafting') return state;

            let next = state;
            for (const manager of state.managers) {
                const progress = next.managerDraftProgress[manager.id];
                if (!progress || progress.isComplete) continue;

                const newTimer = Math.max(0, progress.timer - 1);
                next = {
                    ...next,
                    managerDraftProgress: {
                        ...next.managerDraftProgress,
                        [manager.id]: { ...progress, timer: newTimer },
                    },
                };

                if (newTimer === 0) {
                    next = applyAutoDraftPick(next, manager.id);
                }
            }
            return next;
        }

        case 'START_SIMULATION': {
            const seed = action.payload?.seed ?? state.simulationSeed ?? Date.now();
            const isFast = state.settings.simulationStyle === 'fast';

            if (isFast) {
                const { tournament, managerResults } = simulateTournament(
                    state.managers,
                    state.draftedPlayers,
                    state.settings,
                    seed,
                );
                return {
                    ...state,
                    simulationSeed: seed,
                    tournament,
                    managerResults,
                    simulationPhase: 'complete',
                    playbackIndex: 0,
                    revealIndex: 0,
                    lastSimulatedMatchId: null,
                    logs: [...state.logs, 'World Cup tournament simulated.'],
                };
            }

            const tournament = prepareDetailedTournament(
                state.managers,
                state.draftedPlayers,
                state.settings,
                seed,
            );
            return {
                ...state,
                simulationSeed: seed,
                tournament,
                managerResults: undefined,
                simulationPhase: 'revealing',
                playbackIndex: 0,
                revealIndex: 0,
                lastSimulatedMatchId: null,
                logs: [...state.logs, 'World Cup draw ready — reveal group teams.'],
            };
        }

        case 'ADVANCE_PLAYBACK': {
            if (!state.tournament) return state;

            if (state.simulationPhase === 'revealing') {
                const sequence = buildRevealSequence(state.tournament.groupRevealOrder);
                const nextReveal = state.revealIndex + 1;

                if (nextReveal >= sequence.length) {
                    return {
                        ...state,
                        revealIndex: nextReveal,
                        simulationPhase: 'playing',
                        tournament: {
                            ...state.tournament,
                            groupStandings: initGroupStandingsForPlay(state.tournament),
                        },
                        logs: [...state.logs, 'Group draw complete. Group stage begins.'],
                    };
                }

                return {
                    ...state,
                    revealIndex: nextReveal,
                };
            }

            if (state.simulationPhase !== 'playing') return state;

            const { tournament, lastMatch, managerResults, complete } = simulateNextDetailedMatch(
                state.tournament,
                state.managers,
            );

            return {
                ...state,
                tournament,
                managerResults: managerResults ?? state.managerResults,
                simulationPhase: complete ? 'complete' : 'playing',
                playbackIndex: tournament.allMatches.length,
                lastSimulatedMatchId: lastMatch?.id ?? state.lastSimulatedMatchId,
                logs: lastMatch
                    ? [...state.logs, `Match simulated: ${lastMatch.id}.`]
                    : state.logs,
            };
        }

        default:
            return state;
    }
}

type DraftContextValue = {
    state: DraftState;
    dispatch: (action: Action) => void;
    isConnecting: boolean;
    roomError: string | null;
    clearRoomError: () => void;
};

const DraftContext = createContext<DraftContextValue | undefined>(undefined);

export const DraftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, rawDispatch] = useReducer(reducer, initialState);
    const [isConnecting, setIsConnecting] = useState(false);
    const [roomError, setRoomError] = useState<string | null>(null);
    const managerIdRef = useRef<string | null>(loadSession()?.managerId ?? null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const stateRef = useRef(state);
    stateRef.current = state;

    const clearSubscription = useCallback(() => {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
    }, []);

    const subscribeToRoom = useCallback(
        (roomCode: string) => {
            clearSubscription();
            if (!isFirebaseConfigured()) return;

            unsubscribeRef.current = subscribeRoom(
                roomCode,
                (shared) => {
                    rawDispatch({
                        type: 'SYNC_ROOM',
                        payload: { shared, managerId: managerIdRef.current },
                    });
                },
                () => setRoomError('Lost connection to the room.'),
            );
        },
        [clearSubscription],
    );

    const pushSharedState = useCallback(async (nextState: DraftState) => {
        if (!nextState.roomCode || !isFirebaseConfigured()) return;
        try {
            const shared = extractShared(nextState);
            shared.revision = (stateRef.current.revision ?? 0) + 1;
            await updateRoom(shared);
        } catch {
            setRoomError('Failed to sync room. Check your connection.');
        }
    }, []);

    useEffect(() => {
        if (isInviteLinkVisit()) {
            clearSession();
            return;
        }

        const session = loadSession();
        if (!session || !isFirebaseConfigured()) return;

        managerIdRef.current = session.managerId;
        setIsConnecting(true);
        subscribeToRoom(session.roomCode);

        fetchRoom(session.roomCode)
            .then((shared) => {
                if (!shared) {
                    setRoomError('Saved room no longer exists.');
                    return;
                }
                const manager = shared.managers.find((m) => m.id === session.managerId);
                if (!manager) {
                    setRoomError('Could not rejoin saved room.');
                    return;
                }
                rawDispatch({
                    type: 'ROOM_CONNECTED',
                    payload: { shared, manager },
                });
            })
            .catch(() => setRoomError('Could not rejoin room.'))
            .finally(() => setIsConnecting(false));

        return clearSubscription;
    }, [subscribeToRoom, clearSubscription]);

    const syncAndDispatch = useCallback(
        (action: Action) => {
            const prev = stateRef.current;
            const next = reducer(prev, action);
            if (next === prev) return;

            rawDispatch(action);

            if (next.roomCode && SYNC_ACTIONS.has(action.type)) {
                void pushSharedState(next);
            }
        },
        [pushSharedState],
    );

    const dispatch = useCallback(
        (action: Action) => {
            if (action.type === 'CREATE_ROOM') {
                void (async () => {
                    const name = action.payload.manager.name.trim();
                    if (!name) {
                        setRoomError('Enter your manager name');
                        return;
                    }

                    setRoomError(null);
                    setIsConnecting(true);

                    try {
                        const managerInput: ManagerInput = {
                            id: newManagerId(),
                            name,
                            isHost: true,
                        };

                        if (!isFirebaseConfigured()) {
                            const code = action.payload.roomCode;
                            saveSession(code, managerInput.id);
                            managerIdRef.current = managerInput.id;
                            rawDispatch({
                                type: 'CREATE_ROOM',
                                payload: { roomCode: code, manager: managerInput },
                            });
                            return;
                        }

                        const { roomCode, manager } = await createRoom(managerInput);
                        saveSession(roomCode, manager.id);
                        managerIdRef.current = manager.id;
                        subscribeToRoom(roomCode);
                        const shared = await fetchRoom(roomCode);
                        if (shared) {
                            rawDispatch({
                                type: 'ROOM_CONNECTED',
                                payload: { shared, manager },
                            });
                        }
                    } catch {
                        setRoomError('Could not create room. Check Firebase configuration.');
                    } finally {
                        setIsConnecting(false);
                    }
                })();
                return;
            }

            if (action.type === 'JOIN_ROOM') {
                void (async () => {
                    const name = action.payload.manager.name.trim();
                    const code = action.payload.roomCode.trim().toUpperCase();

                    if (!name) {
                        setRoomError('Enter your manager name');
                        return;
                    }
                    if (!code) {
                        setRoomError('Enter the room code');
                        return;
                    }

                    setRoomError(null);
                    setIsConnecting(true);

                    try {
                        const managerInput: ManagerInput = {
                            id: newManagerId(),
                            name,
                            isHost: false,
                        };

                        if (!isFirebaseConfigured()) {
                            saveSession(code, managerInput.id);
                            managerIdRef.current = managerInput.id;
                            rawDispatch({
                                type: 'JOIN_ROOM',
                                payload: { roomCode: code, manager: managerInput },
                            });
                            return;
                        }

                        const result = await joinRoom(code, managerInput);
                        if (!result.ok) {
                            setRoomError(result.error);
                            return;
                        }

                        saveSession(code, result.manager.id);
                        managerIdRef.current = result.manager.id;
                        subscribeToRoom(code);
                        rawDispatch({
                            type: 'ROOM_CONNECTED',
                            payload: { shared: result.shared, manager: result.manager },
                        });
                    } catch {
                        setRoomError('Could not join room. Check Firebase configuration.');
                    } finally {
                        setIsConnecting(false);
                    }
                })();
                return;
            }

            if (HOST_ONLY_ACTIONS.has(action.type) && !stateRef.current.currentUser?.isHost) {
                return;
            }

            if (
                action.type === 'DRAFT_PLAYER' &&
                action.payload.managerId !== stateRef.current.currentUser?.id
            ) {
                return;
            }

            if (
                action.type === 'REROLL' &&
                action.payload.managerId !== stateRef.current.currentUser?.id
            ) {
                return;
            }

            if (action.type === 'START_SIMULATION') {
                if (!stateRef.current.currentUser?.isHost) return;
                const seed = stateRef.current.simulationSeed ?? Date.now();
                syncAndDispatch({ type: 'START_SIMULATION', payload: { seed } });
                return;
            }

            syncAndDispatch(action);
        },
        [pushSharedState, subscribeToRoom, syncAndDispatch],
    );

    return (
        <DraftContext.Provider
            value={{
                state,
                dispatch,
                isConnecting,
                roomError,
                clearRoomError: () => setRoomError(null),
            }}
        >
            {children}
        </DraftContext.Provider>
    );
};

export const useDraft = () => {
    const context = useContext(DraftContext);
    if (!context) throw new Error('useDraft must be used within DraftProvider');
    return context;
};

export type { Continent, RoomSettings };

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
    DraftState,
    Manager,
    ManagerInput,
    DraftedPlayer,
    RoomSettings,
    DEFAULT_ROOM_SETTINGS,
    Continent,
} from './types';
import { SquadPlayer, playerRatings } from './data';
import { resolvePlayerSimValue } from './ratings/resolveOverall';
import {
    allManagersHaveFormation,
    assignPlayerToSlot,
    generateSnakeDraft,
    getNationalTeamById,
    getSelectablePlayers,
    pickRandomFormation,
    pickRandomNationalTeam,
} from './draftLogic';

import { simulateTournament } from './tournament/engine';
import {
    buildRevealSequence,
    initGroupStandingsForPlay,
    prepareDetailedTournament,
    simulateNextDetailedMatch,
} from './tournament/detailedEngine';

type Action =
    | { type: 'CREATE_ROOM'; payload: { roomCode: string; manager: ManagerInput } }
    | { type: 'JOIN_ROOM'; payload: { roomCode: string; manager: ManagerInput } }
    | { type: 'ADD_MOCK_MANAGER'; payload: ManagerInput }
    | { type: 'UPDATE_ROOM_SETTINGS'; payload: Partial<RoomSettings> }
    | { type: 'SET_FORMATION'; payload: { managerId: string; formation: import('./data').FormationId } }
    | { type: 'START_DRAFT' }
    | { type: 'DRAFT_PLAYER'; payload: { player: SquadPlayer; managerId: string } }
    | { type: 'REROLL'; payload: { managerId: string } }
    | { type: 'TICK_TIMER' }
    | { type: 'START_SIMULATION' }
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
};

function createManager(base: ManagerInput): Manager {
    return { ...base, formation: null, rerollsRemaining: 3 };
}

function assignTeamForCurrentPicker(state: DraftState, excludeIds: string[] = []): DraftState {
    const managerId = state.draftOrder[state.currentTurnIndex];
    if (!managerId) return state;

    const team = pickRandomNationalTeam(state.settings, excludeIds);
    if (!team) {
        return {
            ...state,
            logs: [...state.logs, 'No national teams match the room filters. Adjust settings in the lobby.'],
        };
    }

    return {
        ...state,
        activeNationalTeamId: team.id,
        timer: state.settings.draftTimeSeconds,
        logs: [...state.logs, `${state.managers.find((m) => m.id === managerId)?.name} draws ${team.country} ${team.year}.`],
    };
}

function advanceTurn(state: DraftState): DraftState {
    const nextTurnIndex = state.currentTurnIndex + 1;
    const isOver = nextTurnIndex >= state.draftOrder.length;

    if (isOver) {
        return {
            ...state,
            currentTurnIndex: nextTurnIndex,
            activeNationalTeamId: null,
            status: 'post_draft',
            logs: [...state.logs, 'Draft complete! All squads are locked.'],
        };
    }

    const nextState: DraftState = {
        ...state,
        currentTurnIndex: nextTurnIndex,
        activeNationalTeamId: null,
        timer: state.settings.draftTimeSeconds,
    };
    return assignTeamForCurrentPicker(nextState);
}

function maybeBeginDraft(state: DraftState): DraftState {
    if (state.status !== 'formation_select' || !allManagersHaveFormation(state.managers)) {
        return state;
    }

    const managerIds = state.managers.map((m) => m.id);
    const draftOrder = generateSnakeDraft(managerIds, 11);
    const draftingState: DraftState = {
        ...state,
        status: 'drafting',
        draftOrder,
        currentTurnIndex: 0,
        draftedPlayers: [],
        timer: state.settings.draftTimeSeconds,
        logs: [...state.logs, 'All formations locked. The draft begins!'],
        activeNationalTeamId: null,
    };
    return assignTeamForCurrentPicker(draftingState);
}

function reducer(state: DraftState, action: Action): DraftState {
    switch (action.type) {
        case 'CREATE_ROOM':
            return {
                ...initialState,
                status: 'lobby',
                roomCode: action.payload.roomCode,
                settings: { ...DEFAULT_ROOM_SETTINGS },
                managers: [createManager(action.payload.manager)],
                currentUser: createManager(action.payload.manager),
                logs: [`Room ${action.payload.roomCode} created by ${action.payload.manager.name}.`],
            };

        case 'JOIN_ROOM':
            return {
                ...state,
                status: 'lobby',
                roomCode: action.payload.roomCode,
                managers: [...state.managers, createManager(action.payload.manager)],
                currentUser: state.currentUser || createManager(action.payload.manager),
                logs: [...state.logs, `${action.payload.manager.name} joined the room.`],
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
                return maybeBeginDraft({
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
            if (!state.currentUser?.isHost) return state;
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
            return maybeBeginDraft(next);
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
                logs: [...state.logs, 'Choose your formation before the draft begins.'],
            };
            return maybeBeginDraft(next);
        }

        case 'DRAFT_PLAYER': {
            const { player, managerId } = action.payload;
            const manager = state.managers.find((m) => m.id === managerId);
            const team = getNationalTeamById(state.activeNationalTeamId);

            if (!manager?.formation || !team) return state;
            if (state.draftOrder[state.currentTurnIndex] !== managerId) return state;
            if (!team.players.some((p) => p.id === player.id)) return state;

            const selectable = getSelectablePlayers(
                team,
                manager.formation,
                state.draftedPlayers,
                managerId,
            );
            if (!selectable.some((p) => p.id === player.id)) return state;

            const slot = assignPlayerToSlot(
                player,
                manager.formation,
                state.draftedPlayers,
                managerId,
            );
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
                pickNumber: state.currentTurnIndex + 1,
                slotIndex: slot.slotIndex,
                assignedPosition: slot.assignedPosition,
            };

            return advanceTurn({
                ...state,
                draftedPlayers: [...state.draftedPlayers, draftedPlayer],
                logs: [
                    ...state.logs,
                    `${manager.name} drafted ${player.name} from ${team.country} ${team.year}.`,
                ],
            });
        }

        case 'REROLL': {
            const { managerId } = action.payload;
            const manager = state.managers.find((m) => m.id === managerId);
            if (!manager || state.draftOrder[state.currentTurnIndex] !== managerId) return state;
            if (manager.rerollsRemaining <= 0) return state;

            const exclude = state.activeNationalTeamId ? [state.activeNationalTeamId] : [];
            const team = pickRandomNationalTeam(state.settings, exclude);
            const updatedManagers = state.managers.map((m) =>
                m.id === managerId ? { ...m, rerollsRemaining: m.rerollsRemaining - 1 } : m,
            );

            const logs = [
                ...state.logs,
                `${manager.name} used a reroll (${manager.rerollsRemaining - 1} left).`,
            ];
            if (team) {
                logs.push(`${manager.name} draws ${team.country} ${team.year}.`);
            }

            return {
                ...state,
                managers: updatedManagers,
                currentUser:
                    state.currentUser?.id === managerId
                        ? { ...state.currentUser, rerollsRemaining: manager.rerollsRemaining - 1 }
                        : state.currentUser,
                activeNationalTeamId: team?.id ?? null,
                timer: state.settings.draftTimeSeconds,
                logs,
            };
        }

        case 'TICK_TIMER':
            return {
                ...state,
                timer: Math.max(0, state.timer - 1),
            };

        case 'START_SIMULATION': {
            const seed = Date.now();
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

const DraftContext = createContext<
    { state: DraftState; dispatch: React.Dispatch<Action> } | undefined
>(undefined);

export const DraftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
        <DraftContext.Provider value={{ state, dispatch }}>{children}</DraftContext.Provider>
    );
};

export const useDraft = () => {
    const context = useContext(DraftContext);
    if (!context) throw new Error('useDraft must be used within DraftProvider');
    return context;
};

export type { Continent, RoomSettings };

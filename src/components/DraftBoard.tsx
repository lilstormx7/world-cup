import React from 'react';
import { useDraft } from '../store';
import { PlayerList } from './PlayerList';
import { FormationPitch } from './FormationPitch';
import { Clock, RefreshCw } from 'lucide-react';
import { SquadPlayer } from '../data';
import { getNationalTeamById, getSelectablePlayers } from '../draftLogic';

export const DraftBoard: React.FC = () => {
    const { state, dispatch } = useDraft();
    const currentManagerId = state.draftOrder[state.currentTurnIndex];
    const currentManager = state.managers.find((m) => m.id === currentManagerId);
    const isMyTurn = currentManagerId === state.currentUser?.id;
    const myManager = state.managers.find((m) => m.id === state.currentUser?.id);
    const activeTeam = getNationalTeamById(state.activeNationalTeamId);

    const roundNumber = Math.floor(state.currentTurnIndex / state.managers.length) + 1;
    const pickNumber = state.currentTurnIndex + 1;

    const upcomingPicks = state.draftOrder
        .slice(state.currentTurnIndex, state.currentTurnIndex + 5)
        .map((id, idx) => ({
            manager: state.managers.find((m) => m.id === id),
            isCurrent: idx === 0,
            pickNum: state.currentTurnIndex + idx + 1,
        }));

    const handleDraftPlayer = (player: SquadPlayer) => {
        if (!isMyTurn || !myManager?.formation || !activeTeam) return;

        const selectable = getSelectablePlayers(
            activeTeam,
            myManager.formation,
            state.draftedPlayers,
            state.currentUser!.id,
        );
        if (!selectable.some((p) => p.id === player.id)) return;

        dispatch({
            type: 'DRAFT_PLAYER',
            payload: { player, managerId: state.currentUser!.id },
        });
    };

    const handleReroll = () => {
        if (!isMyTurn || !state.currentUser) return;
        const remaining = myManager?.rerollsRemaining ?? 0;
        if (remaining <= 0) return alert('No rerolls remaining.');
        dispatch({ type: 'REROLL', payload: { managerId: state.currentUser.id } });
    };

    return (
        <div className="flex flex-col h-full lg:flex-row gap-6 animate-fade-in">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                    <div>
                        <div className="text-brand-accent text-sm font-bold uppercase tracking-wider mb-1">
                            Round {roundNumber} · Pick {pickNumber}
                        </div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3 flex-wrap">
                            {currentManager?.name}&apos;s turn
                            {isMyTurn && (
                                <span className="bg-brand-accent text-white text-xs px-2 py-1 rounded animate-pulse">
                                    YOUR TURN
                                </span>
                            )}
                        </h2>
                        {activeTeam && (
                            <p className="text-slate-400 text-sm mt-1">
                                Drafting from{' '}
                                <span className="text-white font-semibold">
                                    {activeTeam.country} {activeTeam.year}
                                </span>
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {isMyTurn && (
                            <button
                                onClick={handleReroll}
                                disabled={(myManager?.rerollsRemaining ?? 0) <= 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 hover:bg-slate-800 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={16} />
                                Reroll ({myManager?.rerollsRemaining ?? 0})
                            </button>
                        )}
                        <div
                            className={`flex items-center gap-2 text-3xl font-mono font-bold ${state.timer <= 10 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}
                        >
                            <Clock size={28} />
                            {state.timer}s
                        </div>
                    </div>
                </div>

                <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {upcomingPicks.map((pick, i) => (
                        <div
                            key={i}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg border flex flex-col items-center min-w-[110px]
                                ${pick.isCurrent ? 'bg-brand-accent/20 border-brand-accent ring-2 ring-brand-accent/50' : 'bg-slate-800/50 border-slate-700'}`}
                        >
                            <span className="text-xs text-slate-400">Pick {pick.pickNum}</span>
                            <span
                                className={`font-bold truncate w-full text-center text-sm ${pick.isCurrent ? 'text-brand-accent' : 'text-slate-300'}`}
                            >
                                {pick.manager?.name}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[320px]">
                    <PlayerList
                        onDraft={handleDraftPlayer}
                        managerId={state.currentUser?.id ?? ''}
                        isMyTurn={isMyTurn}
                    />
                </div>
            </div>

            <div className="w-full lg:w-80 flex flex-col gap-4">
                {myManager?.formation && state.currentUser && (
                    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-lg mb-3 text-white border-b border-slate-700 pb-2">
                            My Formation
                        </h3>
                        <FormationPitch
                            formationId={myManager.formation}
                            draftedPlayers={state.draftedPlayers}
                            managerId={state.currentUser.id}
                            compact
                        />
                        <div className="mt-3 flex justify-between text-xs text-slate-400">
                            <span>
                                {state.draftedPlayers.filter((p) => p.pickedBy === state.currentUser?.id).length}
                                /11 picked
                            </span>
                            <span>{myManager.rerollsRemaining} rerolls left</span>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex-1 overflow-auto max-h-64 lg:max-h-none">
                    <h3 className="font-bold text-lg mb-3 text-white border-b border-slate-700 pb-2">
                        Draft Log
                    </h3>
                    <div className="space-y-2">
                        {state.logs
                            .slice()
                            .reverse()
                            .slice(0, 20)
                            .map((log, i) => (
                                <div key={i} className="text-sm text-slate-300">
                                    {log}
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

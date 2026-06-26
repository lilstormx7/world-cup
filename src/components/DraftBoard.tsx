import React from 'react';
import { useDraft } from '../store';
import { PlayerList } from './PlayerList';
import { FormationPitch } from './FormationPitch';
import { Clock, RefreshCw } from 'lucide-react';
import { SquadPlayer } from '../data';
import {
    getNationalTeamById,
    getSelectablePlayers,
    hasSubmittedFormation,
    PICKS_PER_MANAGER,
} from '../draftLogic';

export const DraftBoard: React.FC = () => {
    const { state, dispatch } = useDraft();
    const draftedPlayers = state.draftedPlayers ?? [];
    const logs = state.logs ?? [];
    const myManager = state.managers.find((m) => m.id === state.currentUser?.id);
    const myFormation =
        (myManager && hasSubmittedFormation(myManager) ? myManager.formation : null) ??
        (state.currentUser && hasSubmittedFormation(state.currentUser)
            ? state.currentUser.formation
            : null);
    const myProgress = state.currentUser
        ? state.managerDraftProgress[state.currentUser.id]
        : undefined;
    const isDrafting = Boolean(myProgress && !myProgress.isComplete);
    const activeTeam = getNationalTeamById(myProgress?.activeNationalTeamId ?? null);
    const myPickCount = draftedPlayers.filter((p) => p.pickedBy === state.currentUser?.id).length;

    const handleDraftPlayer = (player: SquadPlayer) => {
        if (!isDrafting || !myFormation || !state.currentUser) return;

        const team = getNationalTeamById(myProgress?.activeNationalTeamId ?? null);
        if (!team) return;

        const selectable = getSelectablePlayers(
            team,
            myFormation,
            draftedPlayers,
            state.currentUser.id,
        );
        if (!selectable.some((p) => p.id === player.id)) return;

        dispatch({
            type: 'DRAFT_PLAYER',
            payload: { player, managerId: state.currentUser.id },
        });
    };

    const handleReroll = () => {
        if (!isDrafting || !state.currentUser) return;
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
                            Parallel Draft · {myPickCount}/{PICKS_PER_MANAGER} picks
                        </div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3 flex-wrap">
                            {myProgress?.isComplete ? (
                                'Your squad is complete'
                            ) : (
                                <>
                                    Your draft
                                    {isDrafting && (
                                        <span className="bg-brand-accent text-white text-xs px-2 py-1 rounded animate-pulse">
                                            DRAFTING
                                        </span>
                                    )}
                                </>
                            )}
                        </h2>
                        {activeTeam && isDrafting && (
                            <p className="text-slate-400 text-sm mt-1">
                                Drafting from{' '}
                                <span className="text-white font-semibold">
                                    {activeTeam.country} {activeTeam.year}
                                </span>
                            </p>
                        )}
                    </div>
                    {isDrafting && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleReroll}
                                disabled={(myManager?.rerollsRemaining ?? 0) <= 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 hover:bg-slate-800 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={16} />
                                Reroll ({myManager?.rerollsRemaining ?? 0})
                            </button>
                            <div
                                className={`flex items-center gap-2 text-3xl font-mono font-bold ${(myProgress?.timer ?? 0) <= 10 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}
                            >
                                <Clock size={28} />
                                {myProgress?.timer ?? 0}s
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[320px]">
                    {isDrafting ? (
                        <PlayerList
                            onDraft={handleDraftPlayer}
                            managerId={state.currentUser?.id ?? ''}
                            isMyTurn={isDrafting}
                            activeNationalTeamId={myProgress?.activeNationalTeamId ?? null}
                            formation={myFormation}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 p-8 text-center">
                            {myProgress?.isComplete
                                ? 'Waiting for other managers to finish their drafts…'
                                : 'Syncing draft…'}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full lg:w-80 flex flex-col gap-4">
                {myFormation && state.currentUser && (
                    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-lg mb-3 text-white border-b border-slate-700 pb-2">
                            My Formation
                        </h3>
                        <FormationPitch
                            formationId={myFormation}
                            draftedPlayers={draftedPlayers}
                            managerId={state.currentUser.id}
                            compact
                        />
                        <div className="mt-3 flex justify-between text-xs text-slate-400">
                            <span>
                                {myPickCount}/{PICKS_PER_MANAGER} picked
                            </span>
                            <span>{myManager?.rerollsRemaining ?? 0} rerolls left</span>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                    <h3 className="font-bold text-lg mb-3 text-white border-b border-slate-700 pb-2">
                        Manager Progress
                    </h3>
                    <div className="space-y-2">
                        {state.managers.map((m) => {
                            const progress = state.managerDraftProgress[m.id];
                            const picks = draftedPlayers.filter((p) => p.pickedBy === m.id).length;
                            const done = progress?.isComplete || picks >= PICKS_PER_MANAGER;
                            return (
                                <div
                                    key={m.id}
                                    className="flex justify-between items-center text-sm bg-slate-900/50 rounded-lg px-3 py-2"
                                >
                                    <span
                                        className={
                                            m.id === state.currentUser?.id
                                                ? 'text-brand-accent font-semibold'
                                                : 'text-slate-300'
                                        }
                                    >
                                        {m.name}
                                    </span>
                                    <span className={done ? 'text-green-400' : 'text-slate-400'}>
                                        {done ? 'Done' : `${picks}/${PICKS_PER_MANAGER}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex-1 overflow-auto max-h-64 lg:max-h-none">
                    <h3 className="font-bold text-lg mb-3 text-white border-b border-slate-700 pb-2">
                        Draft Log
                    </h3>
                    <div className="space-y-2">
                        {logs
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

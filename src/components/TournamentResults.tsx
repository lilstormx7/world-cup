import React from 'react';
import { useDraft } from '../store';
import { formatEliminatedIn } from '../tournament/playback';
import { GroupStagePanel } from './GroupStagePanel';
import { KnockoutBracket } from './KnockoutBracket';

export const TournamentResults: React.FC = () => {
    const { state } = useDraft();
    const results = state.managerResults ?? [];
    const tournament = state.tournament;
    const championTeam = tournament?.teams.find((t) => t.id === tournament.championTeamId);

    if (!tournament) return null;

    const throughIndex = tournament.allMatches.length - 1;

    return (
        <div className="flex flex-col py-6 animate-fade-in w-full">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold text-white mb-2">Tournament Complete</h2>
                {championTeam && (
                    <p className="text-brand-accent font-semibold text-lg">
                        Champion: {championTeam.name}
                    </p>
                )}
            </div>

            <div className="w-full max-w-2xl mx-auto mb-8 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="bg-slate-900/50 p-4 border-b border-slate-700 text-center">
                    <h3 className="text-xl font-bold text-white">Manager Rankings</h3>
                </div>
                <div className="p-2">
                    {results.map((result) => {
                        const manager = state.managers.find((m) => m.id === result.managerId);
                        let rankStyle =
                            'bg-slate-800/50 border-slate-700 text-slate-300';
                        if (result.rank === 1)
                            rankStyle =
                                'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
                        if (result.rank === 2)
                            rankStyle = 'bg-slate-300/10 border-slate-300/30 text-slate-200';
                        if (result.rank === 3)
                            rankStyle = 'bg-amber-700/10 border-amber-700/30 text-amber-600';

                        return (
                            <div
                                key={result.managerId}
                                className={`flex items-center justify-between p-4 m-2 rounded-xl border ${rankStyle}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 flex items-center justify-center font-bold text-xl">
                                        #{result.rank}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{manager?.name}</h4>
                                        <p className="text-xs opacity-70">
                                            {formatEliminatedIn(result.eliminatedIn)}
                                            {result.groupName &&
                                                ` · Group ${result.groupName}`}
                                            {result.groupRecord &&
                                                ` · ${result.groupRecord.w}-${result.groupRecord.d}-${result.groupRecord.l} (GD ${result.groupRecord.gd >= 0 ? '+' : ''}${result.groupRecord.gd})`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <section className="xl:col-span-8">
                    <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wider">
                        Group Stage
                    </h3>
                    <GroupStagePanel
                        teams={tournament.teams}
                        userManagerIds={tournament.userManagerIds}
                        groupRevealOrder={tournament.groupRevealOrder}
                        revealIndex={48}
                        standings={tournament.groupStandings}
                        showStats
                    />
                </section>

                <section className="xl:col-span-4">
                    <KnockoutBracket
                        teams={tournament.teams}
                        throughIndex={throughIndex}
                        allMatches={tournament.allMatches}
                    />
                </section>
            </div>
        </div>
    );
};

import React from 'react';
import type { PlayerTournamentStat } from '../tournament/types';
import { Target, Handshake } from 'lucide-react';

interface TournamentStatsSidebarProps {
    stats: PlayerTournamentStat[];
}

export const TournamentStatsSidebar: React.FC<TournamentStatsSidebarProps> = ({ stats }) => {
    const topScorers = [...stats].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 8);
    const topAssists = [...stats].sort((a, b) => b.assists - a.assists || b.goals - a.goals).slice(0, 8);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-4">
                <h3 className="font-bold text-white flex items-center gap-2 mb-3 text-sm uppercase tracking-wider">
                    <Target size={16} className="text-brand-accent" />
                    Top Scorers
                </h3>
                <div className="space-y-2">
                    {topScorers.length === 0 && (
                        <p className="text-xs text-slate-500">No goals yet</p>
                    )}
                    {topScorers.map((s, i) => (
                        <div key={`${s.teamId}-${s.playerName}`} className="flex justify-between text-sm">
                            <span className="text-slate-300 truncate pr-2">
                                {i + 1}. {s.playerName}
                                <span className="text-slate-500 text-xs block">{s.teamName}</span>
                            </span>
                            <span className="font-bold text-white shrink-0">{s.goals}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-4">
                <h3 className="font-bold text-white flex items-center gap-2 mb-3 text-sm uppercase tracking-wider">
                    <Handshake size={16} className="text-brand-accent" />
                    Top Assists
                </h3>
                <div className="space-y-2">
                    {topAssists.filter((s) => s.assists > 0).length === 0 && (
                        <p className="text-xs text-slate-500">No assists yet</p>
                    )}
                    {topAssists
                        .filter((s) => s.assists > 0)
                        .map((s, i) => (
                            <div key={`a-${s.teamId}-${s.playerName}`} className="flex justify-between text-sm">
                                <span className="text-slate-300 truncate pr-2">
                                    {i + 1}. {s.playerName}
                                    <span className="text-slate-500 text-xs block">{s.teamName}</span>
                                </span>
                                <span className="font-bold text-white shrink-0">{s.assists}</span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

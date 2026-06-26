import React from 'react';
import type { MatchResult, TournamentTeam } from '../tournament/types';
import { formatMatchScore } from '../tournament/simulateMatch';

interface KnockoutBracketProps {
    teams: TournamentTeam[];
    throughIndex: number;
    allMatches: MatchResult[];
}

export const KnockoutBracket: React.FC<KnockoutBracketProps> = ({
    teams,
    throughIndex,
    allMatches,
}) => {
    const playedKnockout = allMatches
        .slice(0, throughIndex + 1)
        .filter((m) => m.stage !== 'group');

    const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;

    const byStage: Record<string, MatchResult[]> = {};
    for (const match of playedKnockout) {
        byStage[match.stage] = byStage[match.stage] ?? [];
        byStage[match.stage].push(match);
    }

    const stages = ['r32', 'r16', 'qf', 'sf', 'final'] as const;

    return (
        <div className="space-y-3 max-h-[70vh] overflow-auto custom-scrollbar">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Knockout</h3>
            {stages.map((stage) => {
                const matches = byStage[stage];
                if (!matches?.length) return null;
                const label =
                    stage === 'r32'
                        ? 'Round of 32'
                        : stage === 'r16'
                          ? 'Round of 16'
                          : stage === 'qf'
                            ? 'Quarter-finals'
                            : stage === 'sf'
                              ? 'Semi-finals'
                              : 'Final';
                return (
                    <div key={stage}>
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        {matches.map((m) => (
                            <div
                                key={m.id}
                                className="bg-slate-800/60 border border-slate-700 rounded px-2 py-1 mb-1 text-xs"
                            >
                                <div className="flex justify-between text-slate-300">
                                    <span className="truncate">{teamName(m.homeTeamId)}</span>
                                    <span className="font-bold text-white mx-1">
                                        {formatMatchScore(m)}
                                    </span>
                                    <span className="truncate text-right">{teamName(m.awayTeamId)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
            {playedKnockout.length === 0 && (
                <p className="text-xs text-slate-500">Knockout stage begins after groups</p>
            )}
        </div>
    );
};

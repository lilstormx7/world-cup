import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useDraft } from '../store';
import { buildRevealSequence } from '../tournament/detailedEngine';
import { computeStatsUpTo, formatStageLabel } from '../tournament/playback';
import { formatMatchScore } from '../tournament/simulateMatch';
import { TournamentStatsSidebar } from './TournamentStatsSidebar';
import { GroupStagePanel } from './GroupStagePanel';
import { KnockoutBracket } from './KnockoutBracket';
import { TournamentResults } from './TournamentResults';

export const TournamentDetailed: React.FC = () => {
    const { state, dispatch } = useDraft();
    const tournament = state.tournament;
    const isHost = state.currentUser?.isHost;
    const isRevealing = state.simulationPhase === 'revealing';
    const isPlaying = state.simulationPhase === 'playing';

    const revealSequence = useMemo(
        () => (tournament ? buildRevealSequence(tournament.groupRevealOrder) : []),
        [tournament],
    );

    const totalReveals = revealSequence.length;
    const nextReveal = revealSequence[state.revealIndex];

    const lastMatch = useMemo(() => {
        if (!tournament || tournament.allMatches.length === 0) return null;
        if (state.lastSimulatedMatchId) {
            return (
                tournament.allMatches.find((m) => m.id === state.lastSimulatedMatchId) ??
                tournament.allMatches[tournament.allMatches.length - 1]
            );
        }
        return tournament.allMatches[tournament.allMatches.length - 1];
    }, [tournament, state.lastSimulatedMatchId]);

    const nextFixture = tournament?.matchSchedule[0] ?? null;

    const stats = useMemo(
        () =>
            tournament && isPlaying
                ? computeStatsUpTo(tournament, tournament.allMatches.length - 1)
                : [],
        [tournament, isPlaying],
    );

    if (!tournament) return null;

    if (state.simulationPhase === 'complete') {
        return <TournamentResults />;
    }

    const handleNext = () => {
        dispatch({ type: 'ADVANCE_PLAYBACK' });
    };

    const home = lastMatch
        ? tournament.teams.find((t) => t.id === lastMatch.homeTeamId)
        : null;
    const away = lastMatch
        ? tournament.teams.find((t) => t.id === lastMatch.awayTeamId)
        : null;

    const nextHome = nextFixture
        ? tournament.teams.find((t) => t.id === nextFixture.homeTeamId)
        : null;
    const nextAway = nextFixture
        ? tournament.teams.find((t) => t.id === nextFixture.awayTeamId)
        : null;

    const inKnockout = isPlaying && lastMatch?.stage !== 'group';
    const matchTotal =
        tournament.allMatches.length + (tournament.matchSchedule.length ?? 0);
    const progress = isRevealing
        ? (state.revealIndex / totalReveals) * 100
        : matchTotal > 0
          ? (tournament.allMatches.length / matchTotal) * 100
          : 0;

    return (
        <div className="w-full animate-fade-in">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>
                            {isRevealing
                                ? `Group draw: ${state.revealIndex} / ${totalReveals} teams revealed`
                                : `Matches played: ${tournament.allMatches.length}`}
                        </span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand-accent transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                {isHost && (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-white px-6 py-3 rounded-xl font-bold shadow-lg shrink-0"
                    >
                        {isRevealing ? 'Reveal next team' : 'Simulate next match'}
                        <ChevronRight size={20} />
                    </button>
                )}
            </div>

            {!isHost && (
                <p className="text-slate-500 text-sm mb-4 text-center">
                    Waiting for host to advance…
                </p>
            )}

            {isRevealing && (
                <p className="text-slate-400 text-sm mb-4 text-center">
                    {state.revealIndex === 0
                        ? 'All groups empty — reveal strongest team in each group first (avg OVR of top 11).'
                        : nextReveal
                          ? `Next reveal: Group ${nextReveal.group}`
                          : 'Draw complete — press Next to start matches.'}
                </p>
            )}

            {isRevealing ? (
                <GroupStagePanel
                    teams={tournament.teams}
                    userManagerIds={tournament.userManagerIds}
                    groupRevealOrder={tournament.groupRevealOrder}
                    revealIndex={state.revealIndex}
                    highlightGroup={nextReveal?.group}
                    showStats={false}
                    wide
                />
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
                <div className="lg:col-span-3 order-1">
                    {isPlaying ? (
                        <TournamentStatsSidebar stats={stats} />
                    ) : null}
                </div>

                <div className="lg:col-span-6 order-2 flex flex-col gap-4">
                    <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-6 min-h-[280px] flex flex-col justify-center">
                        {lastMatch && home && away ? (
                            <>
                                <div className="text-center text-sm text-brand-accent font-bold uppercase tracking-wider mb-4">
                                    {formatStageLabel(lastMatch)}
                                </div>
                                <div className="flex items-center justify-center gap-6 mb-6">
                                    <div className="text-center flex-1">
                                        <div className="font-bold text-white text-lg">{home.name}</div>
                                        <div className="text-xs text-slate-500">
                                            OVR {Math.round(home.teamOvr)}
                                        </div>
                                    </div>
                                    <div className="text-4xl font-black text-white font-mono">
                                        {formatMatchScore(lastMatch)}
                                    </div>
                                    <div className="text-center flex-1">
                                        <div className="font-bold text-white text-lg">{away.name}</div>
                                        <div className="text-xs text-slate-500">
                                            OVR {Math.round(away.teamOvr)}
                                        </div>
                                    </div>
                                </div>
                                {lastMatch.events.length > 0 && (
                                    <div className="border-t border-slate-700 pt-4 space-y-1">
                                        {lastMatch.events.map((e, i) => (
                                            <div key={i} className="text-sm text-slate-300">
                                                {e.penaltyShootout ? (
                                                    <>
                                                        <span className="text-slate-500 font-mono">
                                                            PEN{' '}
                                                        </span>
                                                        {e.scored ? (
                                                            <>
                                                                {e.scorerName}
                                                                <span className="text-emerald-400">
                                                                    {' '}
                                                                    scored
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {e.scorerName}
                                                                <span className="text-red-400">
                                                                    {' '}
                                                                    missed
                                                                </span>
                                                                {e.assistName && (
                                                                    <span className="text-slate-500">
                                                                        {' '}
                                                                        ({e.assistName})
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-slate-500 font-mono">
                                                            {e.minute}&apos;
                                                        </span>{' '}
                                                        {e.scorerName}
                                                        {e.assistName && (
                                                            <span className="text-slate-500">
                                                                {' '}
                                                                (assist: {e.assistName})
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-slate-500">
                                <p className="text-lg">Ready for kickoff</p>
                                {nextFixture && nextHome && nextAway && (
                                    <p className="text-sm mt-3 text-slate-400">
                                        Up next: {nextHome.name} vs {nextAway.name}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3 order-3">
                    {inKnockout ? (
                        <KnockoutBracket
                            teams={tournament.teams}
                            throughIndex={tournament.allMatches.length - 1}
                            allMatches={tournament.allMatches}
                        />
                    ) : (
                        <GroupStagePanel
                            teams={tournament.teams}
                            userManagerIds={tournament.userManagerIds}
                            groupRevealOrder={tournament.groupRevealOrder}
                            revealIndex={state.revealIndex}
                            standings={isPlaying ? tournament.groupStandings : undefined}
                            highlightGroup={
                                isRevealing ? nextReveal?.group : lastMatch?.group
                            }
                            showStats={isPlaying}
                        />
                    )}
                </div>
            </div>
            )}
        </div>
    );
};

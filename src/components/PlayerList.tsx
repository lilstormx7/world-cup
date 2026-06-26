import React, { useMemo } from 'react';
import { useDraft } from '../store';
import { SquadPlayer, playerRatings } from '../data';
import { getNationalTeamById, getSelectablePlayers, isPlayerDraftedGlobally } from '../draftLogic';
import { resolvePlayerRating } from '../ratings/resolveOverall';
import { Search } from 'lucide-react';
interface PlayerListProps {
    onDraft: (player: SquadPlayer) => void;
    managerId: string;
    isMyTurn: boolean;
    activeNationalTeamId: string | null;
}

export const PlayerList: React.FC<PlayerListProps> = ({
    onDraft,
    managerId,
    isMyTurn,
    activeNationalTeamId,
}) => {
    const { state } = useDraft();
    const [search, setSearch] = React.useState('');

    const manager = state.managers.find((m) => m.id === managerId);
    const team = getNationalTeamById(activeNationalTeamId);

    const { selectableIds, playersWithStatus } = useMemo(() => {
        if (!team || !manager?.formation) {
            return { selectableIds: new Set<string>(), playersWithStatus: [] };
        }

        const selectable = getSelectablePlayers(
            team,
            manager.formation,
            state.draftedPlayers,
            managerId,
        );
        const selectableSet = new Set(selectable.map((p) => p.id));

        const players = team.players
            .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
            .map((p) => {
                const alreadyDrafted = isPlayerDraftedGlobally(p, state.draftedPlayers);
                return {
                    player: p,
                    selectable: selectableSet.has(p.id),
                    alreadyDrafted,
                    displayRating: resolvePlayerRating(
                        p,
                        team.year,
                        state.settings,
                        playerRatings,
                    ),
                };
            })
            .sort((a, b) =>
                state.settings.showOverall
                    ? b.displayRating.simValue - a.displayRating.simValue
                    : a.player.name.localeCompare(b.player.name),
            );

        return { selectableIds: selectableSet, playersWithStatus: players };
    }, [team, manager, state.draftedPlayers, state.settings, managerId, search]);

    if (!team) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 p-8">
                Waiting for national team assignment…
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 bg-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="font-bold text-white text-lg">
                            {team.country} {team.year}
                        </h3>
                        <p className="text-xs text-slate-400">{team.continent}</p>
                    </div>
                    <div className="relative w-full sm:w-56">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search squad…"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <p className="text-xs text-slate-500">
                    {selectableIds.size} selectable ·{' '}
                    {playersWithStatus.filter((p) => p.alreadyDrafted).length} already drafted ·{' '}
                    {
                        playersWithStatus.filter((p) => !p.selectable && !p.alreadyDrafted)
                            .length
                    }{' '}
                    blocked by your formation
                </p>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {playersWithStatus.map(({ player, selectable, alreadyDrafted, displayRating }) => (
                        <div
                            key={player.id}
                            className={`rounded-xl p-3 flex justify-between items-center border transition-all
                                ${selectable
                                    ? 'bg-slate-800/60 border-slate-700 hover:border-brand-accent/50'
                                    : alreadyDrafted
                                      ? 'bg-slate-900/60 border-slate-800 opacity-50'
                                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                                }`}
                        >
                            <div>
                                <h4
                                    className={`font-bold ${selectable ? 'text-slate-100' : 'text-slate-500'}`}
                                >
                                    {player.name}
                                </h4>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {player.positions.map((pos) => (
                                        <span
                                            key={pos}
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700"
                                        >
                                            {pos}
                                        </span>
                                    ))}
                                    {alreadyDrafted && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/50 text-red-400 border border-red-900/50">
                                            Already drafted
                                        </span>
                                    )}
                                </div>
                                {state.settings.showOverall && (
                                    <span className="text-xs text-slate-500 mt-1 inline-block">
                                        {displayRating.label}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => onDraft(player)}
                                disabled={!selectable || !isMyTurn}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all shrink-0
                                    ${selectable && isMyTurn
                                        ? 'bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white border border-brand-accent/30'
                                        : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                    }`}
                            >
                                Draft
                            </button>
                        </div>
                    ))}
                    {playersWithStatus.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-500">
                            No players available in this squad.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import type { GroupLetter, GroupStandingRow, TournamentTeam } from '../tournament/types';
import { GROUP_LETTERS } from '../tournament/types';
import { buildRevealSequence } from '../tournament/detailedEngine';

interface GroupStagePanelProps {
    teams: TournamentTeam[];
    userManagerIds: string[];
    groupRevealOrder: Record<GroupLetter, string[]>;
    revealIndex: number;
    standings?: Record<GroupLetter, GroupStandingRow[]>;
    highlightGroup?: GroupLetter;
    showStats: boolean;
    /** Wider cards and full team names (group draw). */
    wide?: boolean;
}

const SLOTS_PER_GROUP = 4;

export const GroupStagePanel: React.FC<GroupStagePanelProps> = ({
    teams,
    userManagerIds,
    groupRevealOrder,
    revealIndex,
    standings,
    highlightGroup,
    showStats,
    wide = false,
}) => {
    const revealSequence = React.useMemo(
        () => buildRevealSequence(groupRevealOrder),
        [groupRevealOrder],
    );
    const revealedIds = new Set(
        revealSequence.slice(0, revealIndex).map((entry) => entry.teamId),
    );
    const lastRevealedId =
        revealIndex > 0 ? revealSequence[revealIndex - 1]?.teamId : undefined;

    const teamById = (id: string) => teams.find((t) => t.id === id);
    const isUserTeam = (id: string) => {
        const team = teamById(id);
        return team?.managerId !== undefined && userManagerIds.includes(team.managerId);
    };

    const standingFor = (group: GroupLetter, teamId: string) =>
        standings?.[group]?.find((row) => row.teamId === teamId);

    return (
        <div
            className={`grid gap-3 max-h-[75vh] overflow-auto custom-scrollbar
                ${wide ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 xl:grid-cols-3 gap-2'}`}
        >
            {GROUP_LETTERS.map((group) => (
                <div
                    key={group}
                    className={`bg-slate-800/60 rounded-lg border
                        ${wide ? 'p-3 text-sm' : 'p-2 text-xs'}
                        ${highlightGroup === group ? 'border-brand-accent ring-1 ring-brand-accent/50' : 'border-slate-700'}`}
                >
                    <div className="font-bold text-brand-accent mb-2">Group {group}</div>
                    <table className="w-full table-fixed">
                        <thead>
                            <tr className="text-slate-500">
                                <th className={`text-left ${wide ? 'w-[65%]' : ''}`}>Team</th>
                                <th className="text-center whitespace-nowrap">OVR</th>
                                {showStats && (
                                    <>
                                        <th className="text-center whitespace-nowrap">Pts</th>
                                        <th className="text-center whitespace-nowrap">GD</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: SLOTS_PER_GROUP }, (_, slot) => {
                                const teamId = groupRevealOrder[group][slot];
                                const revealed = teamId && revealedIds.has(teamId);
                                const team = revealed ? teamById(teamId) : undefined;
                                const row = team && showStats ? standingFor(group, teamId) : undefined;
                                const isLast = teamId === lastRevealedId;

                                return (
                                    <tr
                                        key={slot}
                                        className={`${
                                            revealed && isUserTeam(teamId)
                                                ? 'text-brand-accent font-semibold'
                                                : revealed
                                                  ? 'text-slate-300'
                                                  : 'text-slate-600'
                                        } ${isLast ? 'bg-brand-accent/10' : ''}`}
                                    >
                                        <td className={`pr-2 ${wide ? 'break-words' : 'truncate max-w-[90px]'}`}>
                                            {revealed && team ? team.name : '—'}
                                        </td>
                                        <td className="text-center">
                                            {revealed && team ? Math.round(team.teamOvr) : '—'}
                                        </td>
                                        {showStats && (
                                            <>
                                                <td className="text-center">{row?.points ?? 0}</td>
                                                <td className="text-center">
                                                    {row
                                                        ? row.gd >= 0
                                                            ? `+${row.gd}`
                                                            : row.gd
                                                        : 0}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

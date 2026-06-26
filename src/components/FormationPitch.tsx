import React from 'react';
import { FORMATIONS, FormationId } from '../data';
import { DraftedPlayer } from '../types';

interface FormationPitchProps {
    formationId: FormationId;
    draftedPlayers: DraftedPlayer[];
    managerId: string;
    compact?: boolean;
}

const POSITION_COLORS: Record<string, string> = {
    GK: 'bg-yellow-500/30 border-yellow-500/50 text-yellow-200',
    DEF: 'bg-blue-500/30 border-blue-500/50 text-blue-200',
    MID: 'bg-green-500/30 border-green-500/50 text-green-200',
    FWD: 'bg-red-500/30 border-red-500/50 text-red-200',
};

function groupSlotsForDisplay(formationId: FormationId) {
    const slots = FORMATIONS[formationId].slots;
    const gk = slots.filter((s) => s === 'GK');
    const def = slots.filter((s) => s === 'DEF');
    const mid = slots.filter((s) => s === 'MID');
    const fwd = slots.filter((s) => s === 'FWD');
    return { gk, def, mid, fwd, slots };
}

export const FormationPitch: React.FC<FormationPitchProps> = ({
    formationId,
    draftedPlayers,
    managerId,
    compact = false,
}) => {
    const { gk, def, mid, fwd, slots } = groupSlotsForDisplay(formationId);
    const myPlayers = draftedPlayers.filter((p) => p.pickedBy === managerId);

    const getPlayerAtSlot = (slotIndex: number) =>
        myPlayers.find((p) => p.slotIndex === slotIndex);

    let slotCursor = 0;
    const renderRow = (rowSlots: typeof slots, label: string) => {
        const row = rowSlots.map((pos) => {
            const index = slotCursor++;
            const player = getPlayerAtSlot(index);
            return (
                <div
                    key={index}
                    className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all
                        ${player ? 'bg-brand-accent/20 border-brand-accent/60' : POSITION_COLORS[pos]}
                        ${compact ? 'w-14 h-14 text-[10px]' : 'w-20 h-20 text-xs'}
                    `}
                >
                    {player ? (
                        <>
                            <span className={`font-bold leading-tight ${compact ? 'text-[9px]' : 'text-xs'}`}>
                                {player.name.split(' ').pop()}
                            </span>
                            <span className="opacity-60 text-[9px]">{player.assignedPosition}</span>
                        </>
                    ) : (
                        <>
                            <span className="font-bold opacity-70">{pos}</span>
                            <span className="opacity-40 text-[9px]">Empty</span>
                        </>
                    )}
                </div>
            );
        });

        return (
            <div className="flex flex-col items-center gap-1">
                {!compact && <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>}
                <div className="flex justify-center gap-2 flex-wrap">{row}</div>
            </div>
        );
    };

    slotCursor = 0;

    return (
        <div
            className={`relative rounded-xl border border-emerald-800/40 bg-gradient-to-b from-emerald-950/60 to-emerald-900/30
                ${compact ? 'p-3' : 'p-5'}`}
        >
            <div className="absolute inset-x-4 top-1/2 h-px bg-emerald-700/30" />
            <div className="absolute inset-y-4 left-1/2 w-px bg-emerald-700/30" />
            <div className="relative flex flex-col items-center gap-3">
                <div className="text-xs font-bold text-emerald-400/80 mb-1">{formationId}</div>
                {renderRow(gk, 'Goalkeeper')}
                {renderRow(def, 'Defense')}
                {renderRow(mid, 'Midfield')}
                {renderRow(fwd, 'Attack')}
            </div>
        </div>
    );
};

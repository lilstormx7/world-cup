import React from 'react';
import { useDraft } from '../store';
import { FORMATIONS, FormationId } from '../data';
import { LayoutGrid } from 'lucide-react';

export const FormationSelect: React.FC = () => {
    const { state, dispatch } = useDraft();
    const myManager = state.managers.find((m) => m.id === state.currentUser?.id);
    const hasChosen = myManager?.formation !== null;

    const handleSelect = (formation: FormationId) => {
        if (!state.currentUser || hasChosen) return;
        dispatch({ type: 'SET_FORMATION', payload: { managerId: state.currentUser.id, formation } });
    };

    return (
        <div className="flex flex-col items-center py-8 animate-fade-in">
            <div className="text-center mb-8">
                <LayoutGrid size={40} className="text-brand-accent mx-auto mb-3" />
                <h2 className="text-3xl font-bold text-white">Choose Your Formation</h2>
                <p className="text-slate-400 mt-2 max-w-lg">
                    Pick how your squad lines up. You can only draft players who fit open positions in this shape.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
                {(Object.keys(FORMATIONS) as FormationId[]).map((id) => {
                    const selected = myManager?.formation === id;
                    const disabled = hasChosen && !selected;
                    return (
                        <button
                            key={id}
                            onClick={() => handleSelect(id)}
                            disabled={disabled}
                            className={`p-5 rounded-xl border-2 text-left transition-all
                                ${selected
                                    ? 'border-brand-accent bg-brand-accent/10 ring-2 ring-brand-accent/40'
                                    : disabled
                                        ? 'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
                                        : 'border-slate-700 bg-slate-800/60 hover:border-brand-accent/50 hover:bg-slate-800'
                                }`}
                        >
                            <div className="text-2xl font-black text-white mb-2">{id}</div>
                            <div className="flex gap-2 text-xs">
                                {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => {
                                    const count = FORMATIONS[id].slots.filter((s) => s === pos).length;
                                    return (
                                        <span key={pos} className="bg-slate-900 px-2 py-1 rounded text-slate-400">
                                            {pos} ×{count}
                                        </span>
                                    );
                                })}
                            </div>
                            {selected && (
                                <span className="inline-block mt-3 text-xs font-bold text-brand-accent">Your choice</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="w-full max-w-3xl">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Managers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.managers.map((m) => (
                        <div
                            key={m.id}
                            className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3"
                        >
                            <span className="font-medium text-white">{m.name}</span>
                            <span className={`text-sm ${m.formation ? 'text-brand-accent' : 'text-slate-500'}`}>
                                {m.formation ?? 'Choosing…'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

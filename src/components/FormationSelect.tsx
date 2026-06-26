import React, { useEffect, useState } from 'react';
import { useDraft } from '../store';
import { FORMATIONS, FormationId } from '../data';
import { allManagersHaveFormation, hasSubmittedFormation } from '../draftLogic';
import { LayoutGrid, Check, Play } from 'lucide-react';

export const FormationSelect: React.FC = () => {
    const { state, dispatch } = useDraft();
    const myManager = state.managers.find((m) => m.id === state.currentUser?.id);
    const hasSubmitted = myManager != null && hasSubmittedFormation(myManager);
    const isHost = state.currentUser?.isHost;
    const allSubmitted = allManagersHaveFormation(state.managers);

    const [pendingFormation, setPendingFormation] = useState<FormationId | null>(
        myManager?.formation ?? null,
    );

    useEffect(() => {
        if (!hasSubmittedFormation(myManager ?? { formation: null })) {
            setPendingFormation(null);
        }
    }, [state.status, myManager?.id, myManager?.formation]);

    const handleSelect = (formation: FormationId) => {
        if (!state.currentUser || hasSubmitted) return;
        setPendingFormation(formation);
    };

    const handleSubmit = () => {
        if (!state.currentUser || hasSubmitted || !pendingFormation) return;
        dispatch({
            type: 'SET_FORMATION',
            payload: { managerId: state.currentUser.id, formation: pendingFormation },
        });
    };

    const handleStartDrafting = () => {
        if (!isHost || !allSubmitted) return;
        dispatch({ type: 'START_DRAFTING' });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full animate-fade-in">
            <aside className="w-full lg:w-60 shrink-0">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Players
                </h3>
                <ul className="space-y-2">
                    {state.managers.map((m) => {
                        const submitted = hasSubmittedFormation(m);
                        return (
                            <li
                                key={m.id}
                                className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3"
                            >
                                {submitted ? (
                                    <Check size={18} className="text-emerald-400 shrink-0" />
                                ) : (
                                    <span className="w-[18px] h-[18px] rounded-full border-2 border-slate-600 shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <span className="font-medium text-white block truncate">
                                        {m.name}
                                        {m.id === state.currentUser?.id && (
                                            <span className="text-slate-500 font-normal"> (you)</span>
                                        )}
                                    </span>
                                    {submitted ? (
                                        <span className="text-xs text-brand-accent">{m.formation}</span>
                                    ) : (
                                        <span className="text-xs text-slate-500">Waiting…</span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="text-center mb-6">
                    <LayoutGrid size={40} className="text-brand-accent mx-auto mb-3" />
                    <h2 className="text-3xl font-bold text-white">Choose Your Formation</h2>
                    <p className="text-slate-400 mt-2 max-w-lg mx-auto">
                        Pick how your squad lines up, then submit. You can only draft players who fit
                        open positions in this shape.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                    {(Object.keys(FORMATIONS) as FormationId[]).map((id) => {
                        const selected = hasSubmitted
                            ? myManager?.formation === id
                            : pendingFormation === id;
                        const disabled = hasSubmitted && !selected;
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
                                            <span
                                                key={pos}
                                                className="bg-slate-900 px-2 py-1 rounded text-slate-400"
                                            >
                                                {pos} ×{count}
                                            </span>
                                        );
                                    })}
                                </div>
                                {selected && (
                                    <span className="inline-block mt-3 text-xs font-bold text-brand-accent">
                                        {hasSubmitted ? 'Submitted' : 'Selected'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto pt-4 border-t border-slate-700">
                    {hasSubmitted ? (
                        <p className="text-emerald-400 text-sm font-medium">
                            Formation locked — waiting for other players…
                        </p>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!pendingFormation}
                            className="px-6 py-2.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Submit Formation
                        </button>
                    )}

                    {isHost && (
                        <button
                            onClick={handleStartDrafting}
                            disabled={!allSubmitted}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Play size={18} fill="currentColor" />
                            Start Drafting
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

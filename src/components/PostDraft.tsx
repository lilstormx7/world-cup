import React from 'react';
import { useDraft } from '../store';
import { FormationPitch } from './FormationPitch';
import { Trophy, Activity } from 'lucide-react';

export const PostDraft: React.FC = () => {
    const { state, dispatch } = useDraft();
    const isHost = state.currentUser?.isHost;
    const canSimulate = state.simulationPhase === 'idle';

    const handleSimulate = () => {
        dispatch({ type: 'START_SIMULATION' });
    };

    return (
        <div className="flex flex-col items-center py-8 animate-fade-in w-full max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <Trophy
                    size={64}
                    className="text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                />
                <h2 className="text-4xl font-extrabold text-white mb-2">Draft Complete!</h2>
                <p className="text-slate-400">
                    All squads are locked.{' '}
                    {state.settings.simulationStyle === 'fast'
                        ? 'Run the World Cup to see final ranks.'
                        : 'Start the World Cup — reveal groups, then play matches one at a time.'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 w-full">
                {state.managers.map((m) => (
                    <div key={m.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-lg text-brand-accent mb-3">
                            {m.name}
                            {m.formation && (
                                <span className="text-slate-400 font-normal text-sm ml-2">
                                    ({m.formation})
                                </span>
                            )}
                        </h3>
                        {m.formation && (
                            <FormationPitch
                                formationId={m.formation}
                                draftedPlayers={state.draftedPlayers}
                                managerId={m.id}
                                compact
                            />
                        )}
                    </div>
                ))}
            </div>

            {canSimulate && isHost && (
                <button
                    onClick={handleSimulate}
                    className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg mx-auto transition-all hover:scale-105 active:scale-95"
                >
                    <Activity size={24} />
                    Simulate Tournament
                </button>
            )}

            {!isHost && canSimulate && (
                <p className="text-slate-500 text-sm">Waiting for host to start the tournament…</p>
            )}
        </div>
    );
};

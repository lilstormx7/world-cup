import { useEffect } from 'react';
import { DraftProvider, useDraft } from './store';
import { Landing } from './components/Landing';
import { Lobby } from './components/Lobby';
import { FormationSelect } from './components/FormationSelect';
import { DraftBoard } from './components/DraftBoard';
import { PostDraftScreen } from './components/PostDraftScreen';

function AppContent() {
    const { state, dispatch } = useDraft();
    const isGroupReveal =
        state.status === 'post_draft' &&
        state.settings.simulationStyle === 'detailed' &&
        state.simulationPhase === 'revealing';
    const isDetailedWide =
        state.status === 'post_draft' &&
        state.settings.simulationStyle === 'detailed' &&
        (state.simulationPhase === 'revealing' ||
            state.simulationPhase === 'playing' ||
            state.simulationPhase === 'complete');
    const isTournamentComplete =
        state.status === 'post_draft' && state.simulationPhase === 'complete';

    useEffect(() => {
        if (state.status === 'drafting') {
            const timer = setInterval(() => {
                dispatch({ type: 'TICK_TIMER' });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [state.status, dispatch]);

    const mainWidth = isGroupReveal
        ? 'max-w-screen-2xl'
        : isDetailedWide || isTournamentComplete
          ? 'max-w-7xl'
          : 'max-w-6xl';

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-dark to-slate-800 text-brand-light font-sans p-4 flex flex-col items-center">
            <header className="mb-8 mt-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-brand-accent drop-shadow-md">
                    World Cup Draft
                </h1>
                <p className="text-slate-400 mt-2">National Team Edition</p>
            </header>

            <main
                className={`w-full ${mainWidth} flex-grow flex flex-col glass-panel rounded-2xl p-6 shadow-2xl relative overflow-hidden bg-slate-900/50 backdrop-blur-sm border border-slate-700`}
            >
                {state.status === 'landing' && <Landing />}
                {state.status === 'lobby' && <Lobby />}
                {state.status === 'formation_select' && <FormationSelect />}
                {state.status === 'drafting' && <DraftBoard />}
                {state.status === 'post_draft' && <PostDraftScreen />}
            </main>
        </div>
    );
}

function App() {
    return (
        <DraftProvider>
            <AppContent />
        </DraftProvider>
    );
}

export default App;

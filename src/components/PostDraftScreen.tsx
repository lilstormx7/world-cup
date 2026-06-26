import React from 'react';
import { useDraft } from '../store';
import { PostDraft } from './PostDraft';
import { TournamentResults } from './TournamentResults';
import { TournamentDetailed } from './TournamentDetailed';

export const PostDraftScreen: React.FC = () => {
    const { state } = useDraft();
    const { simulationPhase, settings } = state;

    if (simulationPhase === 'complete' && settings.simulationStyle === 'fast') {
        return <TournamentResults />;
    }

    if (
        settings.simulationStyle === 'detailed' &&
        (simulationPhase === 'revealing' ||
            simulationPhase === 'playing' ||
            simulationPhase === 'complete')
    ) {
        return <TournamentDetailed />;
    }

    if (simulationPhase === 'idle') {
        return <PostDraft />;
    }

    return <PostDraft />;
};

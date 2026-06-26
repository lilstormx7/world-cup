import React, { useState } from 'react';
import { useDraft } from '../store';
import { ALL_CONTINENTS, Continent } from '../types';
import { YEAR_OPTIONS } from '../data';
import { filterNationalTeams } from '../draftLogic';
import { Users, Play, UserPlus, Settings, Globe, Calendar, Timer, Eye, Zap, Film, Star, Link2 } from 'lucide-react';
import type { RatingScope, SimulationStyle } from '../types';
import { formatRatingScope } from '../ratings/resolveOverall';

export const Lobby: React.FC = () => {
    const { state, dispatch } = useDraft();
    const isHost = state.currentUser?.isHost;
    const { settings } = state;

    const [continentSelection, setContinentSelection] = useState<Continent[]>(
        settings.continents === 'all' ? [...ALL_CONTINENTS] : settings.continents,
    );
    const [allContinents, setAllContinents] = useState(settings.continents === 'all');

    const applySettings = (patch: Partial<typeof settings>) => {
        dispatch({ type: 'UPDATE_ROOM_SETTINGS', payload: patch });
    };

    const toggleContinent = (continent: Continent) => {
        if (allContinents) return;
        const next = continentSelection.includes(continent)
            ? continentSelection.filter((c) => c !== continent)
            : [...continentSelection, continent];
        setContinentSelection(next);
        applySettings({ continents: next.length === ALL_CONTINENTS.length ? 'all' : next });
    };

    const handleAllContinents = (checked: boolean) => {
        setAllContinents(checked);
        if (checked) {
            setContinentSelection([...ALL_CONTINENTS]);
            applySettings({ continents: 'all' });
        } else {
            applySettings({ continents: continentSelection });
        }
    };

    const handleAllTime = (checked: boolean) => {
        applySettings({ allTime: checked });
    };

    const teamCount = filterNationalTeams(settings).length;

    const handleStart = () => {
        if (teamCount === 0) {
            alert('No national teams match your filters. Adjust years or continents.');
            return;
        }
        dispatch({ type: 'START_FORMATION' });
    };

    const addMockUser = () => {
        const id = Date.now().toString();
        dispatch({
            type: 'ADD_MOCK_MANAGER',
            payload: { id, name: `Bot ${state.managers.length}`, isHost: false },
        });
    };

    const copyInviteLink = async () => {
        if (!state.roomCode) return;
        const url = `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`;
        try {
            await navigator.clipboard.writeText(url);
            alert('Invite link copied to clipboard!');
        } catch {
            prompt('Copy this invite link:', url);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in gap-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-700 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-brand-accent" />
                        Lobby
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Room Code:{' '}
                        <span className="text-brand-accent font-mono font-bold tracking-widest">
                            {state.roomCode}
                        </span>
                    </p>
                </div>

                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={copyInviteLink}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
                    >
                        <Link2 size={18} />
                        Copy Invite Link
                    </button>
                    {isHost && (
                        <button
                            onClick={addMockUser}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
                        >
                            <UserPlus size={18} />
                            Add Bot (Dev)
                        </button>
                    )}
                    {isHost && (
                        <button
                            onClick={handleStart}
                            disabled={state.managers.length < 1}
                            className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-brand-accent/50 disabled:opacity-50"
                        >
                            <Play size={20} fill="currentColor" />
                            Start Formation
                        </button>
                    )}
                </div>
            </div>

            {isHost && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-5">
                        <Settings size={20} className="text-brand-accent" />
                        Room Settings
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Calendar size={16} />
                                World Cup Years
                            </label>
                            <p className="text-xs text-slate-500">
                                Only tournaments with SoFIFA OVR data (2014, 2018, 2022).
                            </p>
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.allTime}
                                    onChange={(e) => handleAllTime(e.target.checked)}
                                    className="rounded border-slate-600"
                                />
                                All available years
                            </label>
                            {!settings.allTime && (
                                <div className="flex gap-3 items-center">
                                    <select
                                        value={settings.yearStart}
                                        onChange={(e) =>
                                            applySettings({
                                                yearStart: Number(e.target.value),
                                                yearEnd: Math.max(Number(e.target.value), settings.yearEnd),
                                            })
                                        }
                                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                                    >
                                        {YEAR_OPTIONS.map((y) => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-slate-500">to</span>
                                    <select
                                        value={settings.yearEnd}
                                        onChange={(e) =>
                                            applySettings({
                                                yearEnd: Number(e.target.value),
                                                yearStart: Math.min(settings.yearStart, Number(e.target.value)),
                                            })
                                        }
                                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                                    >
                                        {YEAR_OPTIONS.filter((y) => y >= settings.yearStart).map((y) => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Timer size={16} />
                                Draft Time (seconds)
                            </label>
                            <input
                                type="number"
                                min={10}
                                max={300}
                                value={settings.draftTimeSeconds}
                                onChange={(e) =>
                                    applySettings({
                                        draftTimeSeconds: Math.max(10, Number(e.target.value) || 60),
                                    })
                                }
                                className="w-full max-w-[140px] bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            />
                            <p className="text-xs text-slate-500">Resets when you reroll.</p>
                        </div>

                        <div className="space-y-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Globe size={16} />
                                Continents
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={allContinents}
                                    onChange={(e) => handleAllContinents(e.target.checked)}
                                    className="rounded border-slate-600"
                                />
                                All
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ALL_CONTINENTS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        disabled={allContinents}
                                        onClick={() => toggleContinent(c)}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                                            ${allContinents || continentSelection.includes(c)
                                                ? 'bg-brand-accent/20 border-brand-accent/50 text-brand-accent'
                                                : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                                            }
                                            ${allContinents ? 'opacity-60 cursor-default' : ''}
                                        `}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Star size={16} />
                                Rating Scope
                            </label>
                            <p className="text-xs text-slate-500">
                                Player OVR from SoFIFA / EA FC data (position default when unmatched).
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {(
                                    [
                                        { id: 'year_rating' as RatingScope, label: 'Year Rating', desc: 'OVR for the drafted team year (or closest edition)' },
                                        { id: 'all_time_prime' as RatingScope, label: 'All Time Prime', desc: 'Peak OVR across all matched FIFA editions' },
                                    ] as const
                                ).map(({ id, label, desc }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => applySettings({ ratingScope: id })}
                                        className={`flex-1 min-w-[200px] p-4 rounded-xl border text-left transition-all
                                            ${settings.ratingScope === id
                                                ? 'border-brand-accent bg-brand-accent/10 ring-2 ring-brand-accent/40'
                                                : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="font-bold text-white mb-1">{label}</div>
                                        <p className="text-xs text-slate-400">{desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Film size={16} />
                                Simulation Style
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {(
                                    [
                                        { id: 'fast' as SimulationStyle, label: 'Fast', icon: Zap, desc: 'Instant full tournament; final ranks only' },
                                        { id: 'detailed' as SimulationStyle, label: 'Detailed', icon: Film, desc: 'Reveal groups strongest-first, then simulate each match with Next' },
                                    ] as const
                                ).map(({ id, label, icon: Icon, desc }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => applySettings({ simulationStyle: id })}
                                        className={`flex-1 min-w-[200px] p-4 rounded-xl border text-left transition-all
                                            ${settings.simulationStyle === id
                                                ? 'border-brand-accent bg-brand-accent/10 ring-2 ring-brand-accent/40'
                                                : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 font-bold text-white mb-1">
                                            <Icon size={18} className="text-brand-accent" />
                                            {label}
                                        </div>
                                        <p className="text-xs text-slate-400">{desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Eye size={16} />
                                Show OVR
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.showOverall}
                                    onChange={(e) => applySettings({ showOverall: e.target.checked })}
                                    className="rounded border-slate-600 w-4 h-4"
                                />
                                <span className="text-sm text-slate-400">
                                    {settings.showOverall
                                        ? 'OVR visible in draft'
                                        : 'Only names and positions are shown'}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {!isHost && (
                <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 text-sm text-slate-400">
                    <p>
                        Waiting for host to configure the room.
                        {settings.allTime
                            ? ' Teams: 2014, 2018, 2022.'
                            : ` Teams: ${settings.yearStart}–${settings.yearEnd}.`}
                        {' '}
                        Draft time: {settings.draftTimeSeconds}s.
                        {' '}
                        OVR: {settings.showOverall ? 'visible' : 'hidden'}.
                        {' '}
                        Rating scope: {formatRatingScope(settings.ratingScope)}.
                        {' '}
                        Simulation: {settings.simulationStyle === 'fast' ? 'Fast' : 'Detailed'}.
                    </p>
                </div>
            )}

            <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Managers ({state.managers.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {state.managers.map((m) => (
                        <div
                            key={m.id}
                            className="flex items-center gap-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700"
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                                    ${m.isHost ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-accent/20 text-brand-accent'}`}
                            >
                                {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-white">{m.name}</p>
                                {m.isHost && (
                                    <span className="text-xs text-amber-400 font-medium">Host</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

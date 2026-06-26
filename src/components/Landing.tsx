import React, { useEffect, useState } from 'react';
import { useDraft } from '../store';
import { LogIn, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { isFirebaseConfigured } from '../multiplayer/firebase';
import { readRoomCodeFromUrl } from '../multiplayer/session';

export const Landing: React.FC = () => {
    const { dispatch, isConnecting, roomError, clearRoomError } = useDraft();
    const [createName, setCreateName] = useState('');
    const [joinName, setJoinName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [fieldError, setFieldError] = useState<{ createName?: string; joinName?: string; roomCode?: string }>({});

    const multiplayerOnline = isFirebaseConfigured();

    useEffect(() => {
        const fromUrl = readRoomCodeFromUrl();
        if (fromUrl) setRoomCode(fromUrl);
    }, []);

    const handleCreate = () => {
        clearRoomError();
        setFieldError({});
        const name = createName.trim();
        if (!name) {
            setFieldError({ createName: 'Enter your manager name' });
            return;
        }
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        dispatch({
            type: 'CREATE_ROOM',
            payload: { roomCode: code, manager: { id: '', name, isHost: true } },
        });
    };

    const handleJoin = () => {
        clearRoomError();
        setFieldError({});
        const name = joinName.trim();
        const code = roomCode.trim().toUpperCase();

        const errors: typeof fieldError = {};
        if (!name) errors.joinName = 'Enter your manager name';
        if (!code) errors.roomCode = 'Enter the room code';
        if (errors.joinName || errors.roomCode) {
            setFieldError(errors);
            return;
        }

        dispatch({
            type: 'JOIN_ROOM',
            payload: {
                roomCode: code,
                manager: { id: '', name, isHost: false },
            },
        });
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-8 py-10">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Welcome to the Draft</h2>
                <p className="text-slate-400 max-w-md mx-auto">
                    Create a room, draft from 2014, 2018, or 2022 World Cup squads, choose your formation, and build
                    your team.
                </p>
            </div>

            <div
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border ${
                    multiplayerOnline
                        ? 'bg-green-500/10 border-green-500/30 text-green-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
            >
                {multiplayerOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                {multiplayerOnline
                    ? 'Multiplayer: connected'
                    : 'Multiplayer: offline — redeploy with Firebase env vars on Vercel'}
            </div>

            {roomError && (
                <div className="w-full max-w-lg bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg px-4 py-3 text-sm">
                    {roomError}
                </div>
            )}

            <div className="w-full max-w-lg grid gap-6 md:grid-cols-2">
                {/* Create room */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <UserPlus size={18} className="text-brand-accent" />
                        Create a room
                    </h3>
                    <div className="space-y-1">
                        <input
                            type="text"
                            placeholder="Your manager name"
                            className={`w-full bg-slate-900 border rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all ${
                                fieldError.createName ? 'border-red-500' : 'border-slate-700'
                            }`}
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            disabled={isConnecting}
                        />
                        {fieldError.createName && (
                            <p className="text-red-400 text-xs">{fieldError.createName}</p>
                        )}
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={isConnecting}
                        className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-white p-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                        <UserPlus size={20} />
                        {isConnecting ? 'Connecting…' : 'Create Room'}
                    </button>
                </div>

                {/* Join room */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <LogIn size={18} className="text-blue-400" />
                        Join a room
                    </h3>
                    <p className="text-xs text-slate-500">Enter your name and the code from the host&apos;s lobby.</p>
                    <div className="space-y-1">
                        <input
                            type="text"
                            placeholder="Your manager name"
                            className={`w-full bg-slate-900 border rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                fieldError.joinName ? 'border-red-500' : 'border-slate-700'
                            }`}
                            value={joinName}
                            onChange={(e) => setJoinName(e.target.value)}
                            disabled={isConnecting}
                        />
                        {fieldError.joinName && (
                            <p className="text-red-400 text-xs">{fieldError.joinName}</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <input
                            type="text"
                            placeholder="Room code (6 chars)"
                            className={`w-full bg-slate-900 border rounded-lg p-3 text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                fieldError.roomCode ? 'border-red-500' : 'border-slate-700'
                            }`}
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            maxLength={6}
                            disabled={isConnecting}
                        />
                        {fieldError.roomCode && (
                            <p className="text-red-400 text-xs">{fieldError.roomCode}</p>
                        )}
                    </div>
                    <button
                        onClick={handleJoin}
                        disabled={isConnecting}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                        <LogIn size={20} />
                        Join Room
                    </button>
                </div>
            </div>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { useDraft } from '../store';
import { LogIn, UserPlus } from 'lucide-react';

function readRoomFromUrl(): string {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') ?? '').toUpperCase().slice(0, 6);
}

export const Landing: React.FC = () => {
    const { dispatch, isConnecting, roomError, clearRoomError } = useDraft();
    const [managerName, setManagerName] = useState('');
    const [roomCode, setRoomCode] = useState('');

    useEffect(() => {
        const fromUrl = readRoomFromUrl();
        if (fromUrl) setRoomCode(fromUrl);
    }, []);

    const handleCreate = () => {
        clearRoomError();
        const name = managerName.trim();
        if (!name) return alert('Enter your manager name');
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        dispatch({
            type: 'CREATE_ROOM',
            payload: { roomCode: code, manager: { id: '', name, isHost: true } },
        });
    };

    const handleJoin = () => {
        clearRoomError();
        const name = managerName.trim();
        const code = roomCode.trim().toUpperCase();

        if (!name) return alert('Enter your manager name');
        if (!code) return alert('Enter the room code');

        dispatch({
            type: 'JOIN_ROOM',
            payload: {
                roomCode: code,
                manager: { id: '', name, isHost: false },
            },
        });
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-12 py-10">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Welcome to the Draft</h2>
                <p className="text-slate-400 max-w-md mx-auto">Create a room, draft from 2014, 2018, or 2022 World Cup squads, choose your formation, and build your team.</p>
            </div>

            <div className="w-full max-w-md space-y-4">
                {roomError && (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg px-4 py-3 text-sm">
                        {roomError}
                    </div>
                )}

                <input
                    type="text"
                    placeholder="Your name (required to create or join)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    disabled={isConnecting}
                />

                <div className="flex gap-4">
                    <button
                        onClick={handleCreate}
                        disabled={isConnecting}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-white p-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50"
                    >
                        <UserPlus size={20} />
                        {isConnecting ? 'Connecting…' : 'Create Room'}
                    </button>
                </div>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex flex-col items-center text-sm gap-1">
                        <span className="px-2 bg-slate-900/50 text-slate-400">OR</span>
                        <span className="text-slate-500 text-xs">Enter the code from the host&apos;s lobby</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Room Code (6 chars)"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                        maxLength={6}
                        disabled={isConnecting}
                    />
                    <button
                        onClick={handleJoin}
                        disabled={isConnecting}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors duration-200 px-6 disabled:opacity-50"
                    >
                        <LogIn size={20} />
                        Join
                    </button>
                </div>
            </div>
        </div>
    );
};

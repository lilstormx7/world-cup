import React, { useState } from 'react';
import { useDraft } from '../store';
import { LogIn, UserPlus } from 'lucide-react';

export const Landing: React.FC = () => {
    const { dispatch } = useDraft();
    const [managerName, setManagerName] = useState('');
    const [roomCode, setRoomCode] = useState('');

    const handleCreate = () => {
        if (!managerName) return alert('Enter your name');
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        dispatch({
            type: 'CREATE_ROOM',
            payload: { roomCode: code, manager: { id: Date.now().toString(), name: managerName, isHost: true } }
        });
    };

    const handleJoin = () => {
        if (!managerName || !roomCode) return alert('Enter name and room code');
        dispatch({
            type: 'JOIN_ROOM',
            payload: { roomCode, manager: { id: Date.now().toString(), name: managerName, isHost: false } }
        });
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-12 py-10">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Welcome to the Draft</h2>
                <p className="text-slate-400 max-w-md mx-auto">Create a room, draft from 2014, 2018, or 2022 World Cup squads, choose your formation, and build your team.</p>
            </div>

            <div className="w-full max-w-md space-y-4">
                <input
                    type="text"
                    placeholder="Your Manager Name"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                />

                <div className="flex gap-4">
                    <button
                        onClick={handleCreate}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-white p-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                        <UserPlus size={20} />
                        Create Room
                    </button>
                </div>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-900/50 text-slate-400">OR</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Room Code (6 chars)"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        maxLength={6}
                    />
                    <button
                        onClick={handleJoin}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors duration-200 px-6"
                    >
                        <LogIn size={20} />
                        Join
                    </button>
                </div>
            </div>
        </div>
    );
};

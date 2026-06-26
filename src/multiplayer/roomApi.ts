import {
    ref,
    get,
    set,
    onValue,
    runTransaction,
    type Unsubscribe,
} from 'firebase/database';
import type { ManagerInput, Manager } from '../types';
import { getFirebaseDatabase } from './firebase';
import {
    createInitialSharedRoom,
    type SharedRoomState,
} from './roomState';

function roomRef(roomCode: string) {
    return ref(getFirebaseDatabase(), `rooms/${roomCode.toUpperCase()}`);
}

function createManager(base: ManagerInput): Manager {
    return { ...base, formation: null, rerollsRemaining: 3 };
}

export function generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function findAvailableRoomCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const code = generateRoomCode();
        const snapshot = await get(roomRef(code));
        if (!snapshot.exists()) return code;
    }
    throw new Error('Could not generate a unique room code. Try again.');
}

export async function createRoom(
    hostInput: ManagerInput,
    roomCode?: string,
): Promise<{ roomCode: string; manager: Manager }> {
    const code = roomCode ?? (await findAvailableRoomCode());
    const manager = createManager(hostInput);
    const shared = createInitialSharedRoom(code, manager);
    await set(roomRef(code), shared);
    return { roomCode: code, manager };
}

export type JoinRoomResult =
    | { ok: true; manager: Manager; shared: SharedRoomState }
    | { ok: false; error: string };

export async function joinRoom(
    roomCode: string,
    joinerInput: ManagerInput,
): Promise<JoinRoomResult> {
    const code = roomCode.toUpperCase();
    const snapshot = await get(roomRef(code));

    if (!snapshot.exists()) {
        return { ok: false, error: 'Room not found' };
    }

    const existing = snapshot.val() as SharedRoomState;

    if (existing.status !== 'lobby') {
        return { ok: false, error: 'This room has already started' };
    }

    const existingManager = existing.managers.find((m) => m.id === joinerInput.id);
    if (existingManager) {
        return { ok: true, manager: existingManager, shared: existing };
    }

    const duplicateName = existing.managers.some(
        (m) => m.name.toLowerCase() === joinerInput.name.trim().toLowerCase(),
    );
    if (duplicateName) {
        return { ok: false, error: 'That manager name is already taken in this room' };
    }

    const manager = createManager(joinerInput);
    let resultShared: SharedRoomState | null = null;

    const txResult = await runTransaction(roomRef(code), (current) => {
        if (!current) return current;
        const room = current as SharedRoomState;
        if (room.status !== 'lobby') return current;
        if (room.managers.some((m) => m.id === manager.id)) {
            resultShared = room;
            return room;
        }
        const updated: SharedRoomState = {
            ...room,
            revision: room.revision + 1,
            managers: [...room.managers, manager],
            logs: [...room.logs, `${manager.name} joined the room.`],
        };
        resultShared = updated;
        return updated;
    });

    if (!txResult.committed || !resultShared) {
        return { ok: false, error: 'Could not join room. Try again.' };
    }

    return { ok: true, manager, shared: resultShared };
}

export async function updateRoom(shared: SharedRoomState): Promise<void> {
    await set(roomRef(shared.roomCode), shared);
}

/** Atomically merge `patch` onto the current room and bump revision. */
export async function commitRoomUpdate(
    roomCode: string,
    patch: SharedRoomState,
): Promise<SharedRoomState> {
    const code = roomCode.toUpperCase();
    let resultShared: SharedRoomState | null = null;

    const txResult = await runTransaction(roomRef(code), (current) => {
        if (!current) return current;
        const room = current as SharedRoomState;
        const { revision: _revision, roomCode: _roomCode, ...fields } = patch;
        const updated: SharedRoomState = {
            ...room,
            ...fields,
            roomCode: room.roomCode,
            revision: room.revision + 1,
        };
        resultShared = updated;
        return updated;
    });

    if (!txResult.committed || !resultShared) {
        throw new Error('Room update was not committed');
    }

    return resultShared;
}

export function subscribeRoom(
    roomCode: string,
    onUpdate: (shared: SharedRoomState) => void,
    onError?: (error: Error) => void,
): Unsubscribe {
    const dbRef = roomRef(roomCode);
    return onValue(
        dbRef,
        (snapshot) => {
            if (!snapshot.exists()) return;
            onUpdate(snapshot.val() as SharedRoomState);
        },
        (error) => onError?.(error),
    );
}

export async function fetchRoom(roomCode: string): Promise<SharedRoomState | null> {
    const snapshot = await get(roomRef(roomCode));
    if (!snapshot.exists()) return null;
    return snapshot.val() as SharedRoomState;
}

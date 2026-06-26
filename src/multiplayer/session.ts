const SESSION_KEY = 'wc-draft-session';

export interface LocalSession {
    roomCode: string;
    managerId: string;
}

export function saveSession(roomCode: string, managerId: string): void {
    const session: LocalSession = { roomCode, managerId };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): LocalSession | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LocalSession;
        if (parsed.roomCode && parsed.managerId) return parsed;
    } catch {
        /* ignore */
    }
    return null;
}

export function clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
}

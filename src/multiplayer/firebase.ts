import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

let app: FirebaseApp | null = null;
let database: Database | null = null;

export function isFirebaseConfigured(): boolean {
    return Boolean(
        import.meta.env.VITE_FIREBASE_API_KEY &&
            import.meta.env.VITE_FIREBASE_DATABASE_URL &&
            import.meta.env.VITE_FIREBASE_PROJECT_ID,
    );
}

export function getFirebaseDatabase(): Database {
    if (!isFirebaseConfigured()) {
        throw new Error(
            'Firebase is not configured. Add VITE_FIREBASE_* variables to your environment.',
        );
    }
    if (!database) {
        app = initializeApp({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
        });
        database = getDatabase(app);
    }
    return database;
}

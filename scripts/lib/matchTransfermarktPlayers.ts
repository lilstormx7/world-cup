import type { WcPlayerRef } from './types.js';

export interface TmPlayerRef {
    playerId: string;
    name: string;
    country: string;
    birthYear: number | null;
}

export function normalizeName(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const COUNTRY_ALIASES: Record<string, string> = {
    'germany fr': 'germany',
    'germany dr': 'germany',
    'korea republic': 'south korea',
    'republic of korea': 'south korea',
    'usa': 'united states',
    'u s a': 'united states',
    'cote d ivoire': 'ivory coast',
    "cote d'ivoire": 'ivory coast',
    'russia': 'russia',
    'soviet union': 'russia',
};

export function normalizeCountry(value: string): string {
    const normalized = normalizeName(value);
    return COUNTRY_ALIASES[normalized] ?? normalized;
}

function parseBirthYear(dateOfBirth: string | undefined): number | null {
    if (!dateOfBirth) return null;
    const match = dateOfBirth.match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
}

export function parseTmPlayers(csvRows: Record<string, string>[]): TmPlayerRef[] {
    return csvRows
        .map((row) => {
            const name =
                row.name?.trim() ||
                [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
            if (!name || !row.player_id) return null;

            return {
                playerId: row.player_id,
                name,
                country: normalizeCountry(row.country_of_citizenship ?? row.country ?? ''),
                birthYear: parseBirthYear(row.date_of_birth),
            };
        })
        .filter((p): p is TmPlayerRef => p !== null);
}

export function namesCompatible(wcName: string, externalName: string): boolean {
    const wc = normalizeName(wcName);
    const tm = normalizeName(externalName);
    if (wc === tm) return true;
    if (wc.includes(tm) || tm.includes(wc)) return true;

    const wcParts = wc.split(' ').filter(Boolean);
    const tmParts = tm.split(' ').filter(Boolean);
    if (wcParts.length === 0 || tmParts.length === 0) return false;

    const wcLast = wcParts[wcParts.length - 1];
    const tmLast = tmParts[tmParts.length - 1];
    if (wcLast !== tmLast) return false;

    const wcFirst = wcParts[0];
    const tmFirst = tmParts[0];
    return wcFirst.startsWith(tmFirst.slice(0, 2)) || tmFirst.startsWith(wcFirst.slice(0, 2));
}

export function matchTransfermarktPlayers(
    wcPlayers: WcPlayerRef[],
    tmPlayers: TmPlayerRef[],
): Map<string, string> {
    const byCountry = new Map<string, TmPlayerRef[]>();
    const byLastName = new Map<string, TmPlayerRef[]>();

    for (const tm of tmPlayers) {
        const countryList = byCountry.get(tm.country) ?? [];
        countryList.push(tm);
        byCountry.set(tm.country, countryList);

        const parts = normalizeName(tm.name).split(' ').filter(Boolean);
        const last = parts[parts.length - 1] ?? '';
        if (last) {
            const lastList = byLastName.get(last) ?? [];
            lastList.push(tm);
            byLastName.set(last, lastList);
        }
    }

    const matches = new Map<string, string>();
    let unmatched = 0;

    for (const wc of wcPlayers) {
        const country = normalizeCountry(wc.country);
        const candidates = byCountry.get(country) ?? [];
        let nameMatches = candidates.filter((tm) => namesCompatible(wc.name, tm.name));

        if (nameMatches.length === 0) {
            const wcParts = normalizeName(wc.name).split(' ').filter(Boolean);
            const last = wcParts[wcParts.length - 1] ?? '';
            const lastCandidates = last ? (byLastName.get(last) ?? []) : [];
            nameMatches = lastCandidates.filter((tm) => namesCompatible(wc.name, tm.name));
        }

        if (nameMatches.length === 1) {
            matches.set(wc.playerId, nameMatches[0].playerId);
            continue;
        }

        if (nameMatches.length > 1) {
            const exact = nameMatches.find(
                (tm) => normalizeName(tm.name) === normalizeName(wc.name),
            );
            if (exact) {
                matches.set(wc.playerId, exact.playerId);
                continue;
            }
        }

        unmatched += 1;
    }

    console.log(
        `Transfermarkt matching: ${matches.size} matched, ${unmatched} unmatched WC players.`,
    );
    return matches;
}

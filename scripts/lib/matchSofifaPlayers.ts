import type { WcPlayerRef } from './types.js';
import {
    namesCompatible,
    normalizeCountry,
    normalizeName,
} from './matchTransfermarktPlayers.js';

export interface SofifaPlayerRef {
    playerId: string;
    name: string;
    country: string;
    birthYear: number | null;
}

function parseBirthYear(dateOfBirth: string | undefined): number | null {
    if (!dateOfBirth) return null;
    const match = dateOfBirth.match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
}

export function buildSofifaPlayerIndex(
    legacyRows: Record<string, string>[],
    solideSpokeRows: Record<string, string>[],
): Map<string, SofifaPlayerRef> {
    const index = new Map<string, SofifaPlayerRef>();

    for (const row of legacyRows) {
        const playerId = row.player_id?.trim();
        const name = row.long_name?.trim();
        if (!playerId || !name) continue;

        if (!index.has(playerId)) {
            index.set(playerId, {
                playerId,
                name,
                country: normalizeCountry(row.nationality_name ?? ''),
                birthYear: parseBirthYear(row.dob),
            });
        }
    }

    for (const row of solideSpokeRows) {
        const playerId = row.player_id?.trim();
        const name = row.full_name?.trim() || row.name?.trim();
        if (!playerId || !name) continue;

        index.set(playerId, {
            playerId,
            name,
            country: normalizeCountry(row.country_name ?? ''),
            birthYear: parseBirthYear(row.dob),
        });
    }

    return index;
}

export function matchSofifaPlayers(
    wcPlayers: WcPlayerRef[],
    sofifaPlayers: SofifaPlayerRef[],
): Map<string, string> {
    const byCountry = new Map<string, SofifaPlayerRef[]>();
    const byLastName = new Map<string, SofifaPlayerRef[]>();

    for (const sf of sofifaPlayers) {
        const countryList = byCountry.get(sf.country) ?? [];
        countryList.push(sf);
        byCountry.set(sf.country, countryList);

        const parts = normalizeName(sf.name).split(' ').filter(Boolean);
        const last = parts[parts.length - 1] ?? '';
        if (last) {
            const lastList = byLastName.get(last) ?? [];
            lastList.push(sf);
            byLastName.set(last, lastList);
        }
    }

    const matches = new Map<string, string>();
    let unmatched = 0;

    for (const wc of wcPlayers) {
        const country = normalizeCountry(wc.country);
        const candidates = byCountry.get(country) ?? [];
        let nameMatches = candidates.filter((sf) => namesCompatible(wc.name, sf.name));

        if (nameMatches.length === 0) {
            const wcParts = normalizeName(wc.name).split(' ').filter(Boolean);
            const last = wcParts[wcParts.length - 1] ?? '';
            const lastCandidates = last ? (byLastName.get(last) ?? []) : [];
            nameMatches = lastCandidates.filter((sf) => namesCompatible(wc.name, sf.name));
        }

        if (nameMatches.length === 1) {
            matches.set(wc.playerId, nameMatches[0].playerId);
            continue;
        }

        if (nameMatches.length > 1) {
            const exact = nameMatches.find(
                (sf) => normalizeName(sf.name) === normalizeName(wc.name),
            );
            if (exact) {
                matches.set(wc.playerId, exact.playerId);
                continue;
            }
        }

        unmatched += 1;
    }

    console.log(`SoFIFA matching: ${matches.size} matched, ${unmatched} unmatched WC players.`);
    return matches;
}

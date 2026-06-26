import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSofifaOvrFromCsv } from './lib/buildSofifaOvr.js';
import { downloadAllSofifaCsvs } from './lib/downloadSofifa.js';
import { downloadAllCsvs } from './lib/downloadCsv.js';
import { transformSquads } from './lib/transformSquads.js';
import { ensureOvrForWorldCupSquads } from './lib/ensureSquadOvr.js';
import { OVR_WORLD_CUP_YEARS } from '../src/data/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_TEAMS = path.join(__dirname, '..', 'src', 'data', 'nationalTeams.json');
const OUTPUT_RATINGS = path.join(__dirname, '..', 'src', 'data', 'playerRatings.json');

async function main(): Promise<void> {
    console.log('Downloading Fjelstul World Cup CSVs...');
    const csvs = await downloadAllCsvs(process.argv.includes('--force-download'));

    console.log('Transforming squads (WC goals from Fjelstul)...');
    const { nationalTeams, playerRatings, wcPlayers } = transformSquads(csvs);

    if (nationalTeams.length === 0) {
        throw new Error('No national teams generated — check CSV parsing.');
    }

    let mergedRatings = playerRatings;

    try {
        console.log('Downloading SoFIFA player CSVs...');
        await downloadAllSofifaCsvs(process.argv.includes('--force-download'));
        console.log('Merging SoFIFA OVR ratings...');
        mergedRatings = await buildSofifaOvrFromCsv(undefined, wcPlayers, playerRatings);
    } catch (error) {
        console.warn('SoFIFA OVR data skipped:', error);
    }

    const sofifaCount = Object.values(mergedRatings).filter((e) => (e.ovrPrime ?? 0) > 0).length;

    const { ratings: withSquadOvr, defaultCount } = ensureOvrForWorldCupSquads(
        mergedRatings,
        nationalTeams,
        OVR_WORLD_CUP_YEARS,
    );
    mergedRatings = withSquadOvr;

    const years = nationalTeams.map((t) => t.year);
    const playerCount = nationalTeams.reduce((sum, t) => sum + t.players.length, 0);
    const ovrSquadPlayers = nationalTeams
        .filter((t) => (OVR_WORLD_CUP_YEARS as readonly number[]).includes(t.year))
        .reduce((sum, t) => sum + t.players.length, 0);

    console.log(`Generated ${nationalTeams.length} national teams, ${playerCount} players.`);
    console.log(`Year range: ${Math.min(...years)}–${Math.max(...years)}`);
    console.log(`Player ratings index: ${Object.keys(mergedRatings).length} entries.`);
    console.log(`Players with SoFIFA OVR: ${sofifaCount}.`);
    console.log(`Position-default OVR applied: ${defaultCount}.`);
    console.log(`OVR World Cup squad players (${OVR_WORLD_CUP_YEARS.join(', ')}): ${ovrSquadPlayers}.`);

    await mkdir(path.dirname(OUTPUT_TEAMS), { recursive: true });
    await writeFile(OUTPUT_TEAMS, JSON.stringify(nationalTeams, null, 2), 'utf-8');
    await writeFile(OUTPUT_RATINGS, JSON.stringify(mergedRatings), 'utf-8');
    console.log(`Wrote ${OUTPUT_TEAMS}`);
    console.log(`Wrote ${OUTPUT_RATINGS}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

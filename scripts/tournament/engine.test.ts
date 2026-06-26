import assert from 'node:assert/strict';
import { buildTournamentTeams, matchInvolvesUser } from '../../src/tournament/buildTeams.js';
import { simulateTournament } from '../../src/tournament/engine.js';
import { DEFAULT_ROOM_SETTINGS } from '../../src/types.js';
import type { Manager } from '../../src/types.js';

function testBuild48Teams(): void {
    const managers: Manager[] = [
        { id: 'm1', name: 'Alice', formation: '4-4-2', rerollsRemaining: 3, isHost: true },
        { id: 'm2', name: 'Bob', formation: '4-3-3', rerollsRemaining: 3 },
    ];
    const drafted = Array.from({ length: 22 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        positions: ['MID' as const],
        overall: 75 + (i % 10),
        pickedBy: i < 11 ? 'm1' : 'm2',
        pickNumber: i + 1,
        slotIndex: i % 11,
        assignedPosition: 'MID' as const,
    }));

    const teams = buildTournamentTeams(managers, drafted, DEFAULT_ROOM_SETTINGS, 42);
    assert.equal(teams.length, 48);
    assert.equal(teams.filter((t) => t.managerId).length, 2);
    assert.equal(new Set(teams.map((t) => t.group)).size, 12);
}

function testFullTournament(): void {
    const managers: Manager[] = [
        { id: 'm1', name: 'Alice', formation: '4-4-2', rerollsRemaining: 3, isHost: true },
    ];
    const drafted = Array.from({ length: 11 }, (_, i) => ({
        id: `p${i}`,
        name: `Star ${i}`,
        positions: ['FWD' as const],
        overall: 80,
        pickedBy: 'm1',
        pickNumber: i + 1,
        slotIndex: i,
        assignedPosition: (['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD'] as const)[i],
    }));

    const { tournament, managerResults } = simulateTournament(
        managers,
        drafted,
        DEFAULT_ROOM_SETTINGS,
        12345,
    );

    assert.equal(tournament.teams.length, 48);
    assert.equal(tournament.allMatches.length, 103);
    assert.ok(tournament.championTeamId);
    assert.equal(managerResults.length, 1);
    assert.ok(managerResults[0].rank >= 1);
}

function testUserMatchDetection(): void {
    const managers: Manager[] = [
        { id: 'm1', name: 'Alice', formation: '4-4-2', rerollsRemaining: 3 },
    ];
    const drafted = Array.from({ length: 11 }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        positions: ['MID' as const],
        overall: 70,
        pickedBy: 'm1',
        pickNumber: i + 1,
        slotIndex: i,
        assignedPosition: 'MID' as const,
    }));

    const teams = buildTournamentTeams(managers, drafted, DEFAULT_ROOM_SETTINGS, 99);
    const userIds = ['m1'];
    const managerTeam = teams.find((t) => t.managerId === 'm1')!;
    const botTeam = teams.find((t) => !t.managerId)!;

    assert.ok(
        matchInvolvesUser(
            { homeTeamId: managerTeam.id, awayTeamId: botTeam.id },
            teams,
            userIds,
        ),
    );
    assert.ok(
        !matchInvolvesUser(
            { homeTeamId: botTeam.id, awayTeamId: teams.find((t) => !t.managerId && t.id !== botTeam.id)!.id },
            teams,
            userIds,
        ),
    );
}

testBuild48Teams();
testFullTournament();
testUserMatchDetection();
console.log('Tournament engine tests passed.');

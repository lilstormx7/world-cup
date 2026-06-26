import assert from 'node:assert/strict';
import {
    applyOvrOverride,
    type OvrOverride,
} from './ovrOverrides.js';
import {
    clampOverall,
    computeOverall,
    findPlayerOverall,
    getPerformanceBonus,
    PERFORMANCE_BONUS,
} from './computeOverall.js';
import type { PlayerBuildStats } from './types.js';

function testPerformanceBonus(): void {
    assert.equal(getPerformanceBonus('Winner'), PERFORMANCE_BONUS.Winner);
    assert.equal(getPerformanceBonus('Runner-up'), 3);
    assert.equal(getPerformanceBonus('Group stage'), 0);
}

function testWinnerWhoDidNotPlayGetsNoTeamBonus(): void {
    const unusedWinner: PlayerBuildStats = {
        playerId: 'p1',
        name: 'Unused Sub',
        position: 'GK',
        shirtNumber: 22,
        year: 2006,
        country: 'Italy',
        wcGoals: 0,
        appearances: 0,
        starts: 0,
        teamPerformance: 'Winner',
        careerGoals: 0,
        careerApps: 0,
        careerStarts: 0,
        careerTournaments: 1,
        awardBonus: 0,
    };
    assert.ok(computeOverall(unusedWinner) < 72);
}

function testStarOutranksBenchRealistically(): void {
    const star: PlayerBuildStats = {
        playerId: 'p1',
        name: 'Star Striker',
        position: 'FWD',
        shirtNumber: 9,
        year: 2006,
        country: 'France',
        wcGoals: 4,
        appearances: 7,
        starts: 7,
        teamPerformance: 'Runner-up',
        careerGoals: 10,
        careerApps: 20,
        careerStarts: 18,
        careerTournaments: 2,
        awardBonus: 8,
    };
    const bench: PlayerBuildStats = {
        playerId: 'p2',
        name: 'Backup GK',
        position: 'GK',
        shirtNumber: 22,
        year: 2006,
        country: 'France',
        wcGoals: 0,
        appearances: 0,
        starts: 0,
        teamPerformance: 'Runner-up',
        careerGoals: 0,
        careerApps: 0,
        careerStarts: 0,
        careerTournaments: 1,
        awardBonus: 0,
    };

    const starOvr = computeOverall(star);
    const benchOvr = computeOverall(bench);
    assert.ok(starOvr > benchOvr + 10);
    assert.ok(starOvr >= 85);
    assert.ok(benchOvr <= 78);
}

function testOverrideSetsLegendRating(): void {
    const stats: PlayerBuildStats = {
        playerId: 'p38906',
        name: 'Pelé',
        position: 'FWD',
        shirtNumber: 10,
        year: 1970,
        country: 'Brazil',
        wcGoals: 4,
        appearances: 6,
        starts: 6,
        teamPerformance: 'Winner',
        careerGoals: 12,
        careerApps: 14,
        careerStarts: 12,
        careerTournaments: 4,
        awardBonus: 3,
    };

    const overrides: OvrOverride[] = [{ name: 'Pelé', year: 1970, overall: 96 }];
    const result = applyOvrOverride(computeOverall(stats), stats, overrides);
    assert.equal(result, 96);
}

function testAbsoluteScaleNotForcedSpread(): void {
    const weakSquadPlayer: PlayerBuildStats = {
        playerId: 'w1',
        name: 'Weak Player',
        position: 'DEF',
        shirtNumber: 18,
        year: 1930,
        country: 'Chile',
        wcGoals: 0,
        appearances: 1,
        starts: 0,
        teamPerformance: 'Group stage',
        careerGoals: 0,
        careerApps: 1,
        careerStarts: 0,
        careerTournaments: 1,
        awardBonus: 0,
    };
    const elite: PlayerBuildStats = {
        ...weakSquadPlayer,
        playerId: 'e1',
        name: 'Elite Player',
        wcGoals: 6,
        appearances: 7,
        starts: 7,
        teamPerformance: 'Winner',
        careerGoals: 14,
        careerApps: 21,
        careerStarts: 19,
        careerTournaments: 3,
        awardBonus: 8,
    };

    const weakOvr = computeOverall(weakSquadPlayer);
    const eliteOvr = computeOverall(elite);
    assert.ok(eliteOvr > weakOvr);
    assert.ok(weakOvr < 72, `expected weak player below 72, got ${weakOvr}`);
    assert.ok(eliteOvr > 85, `expected elite above 85, got ${eliteOvr}`);
}

function testClampOverall(): void {
    assert.equal(clampOverall(120), 96);
    assert.equal(clampOverall(40), 55);
}

testPerformanceBonus();
testWinnerWhoDidNotPlayGetsNoTeamBonus();
testStarOutranksBenchRealistically();
testOverrideSetsLegendRating();
testAbsoluteScaleNotForcedSpread();
testClampOverall();
console.log('computeOverall tests passed.');

import assert from 'node:assert/strict';
import {
    extractPlayerId,
    resolvePlayerRating,
    resolvePlayerSimValue,
} from '../../src/ratings/resolveOverall.js';
import { defaultOvrForPositions } from '../../src/ratings/positionOvr.js';
import { wcYearToFifaVersion, fifaVersionToCalendarYear } from './buildSofifaOvr.js';
import type { SquadPlayer } from '../../src/data/index.js';
import type { PlayerRatingsIndex } from '../../src/ratings/types.js';

const samplePlayer: SquadPlayer = {
    id: 'france-2006-P-38906',
    playerId: 'P-38906',
    name: 'Zinedine Zidane',
    positions: ['MID'],
    overall: 0,
};

const index: PlayerRatingsIndex = {
    'P-38906': {
        ovrByYear: { 2006: 91, 1998: 88 },
        ovrPrime: 91,
        sofifaPlayerId: '12345',
        wcGoalsByYear: { 1998: 2, 2006: 3 },
        wcGoalsPrime: 3,
    },
};

function testExtractPlayerId(): void {
    assert.equal(extractPlayerId('france-2006-P-38906'), 'P-38906');
}

function testOvrYearRating(): void {
    const rating = resolvePlayerRating(samplePlayer, 2006, { ratingScope: 'year_rating' }, index);
    assert.equal(rating.source, 'sofifa');
    assert.equal(rating.label, 'OVR 91');
    assert.equal(rating.simValue, 91);
}

function testOvrAllTimePrime(): void {
    const rating = resolvePlayerRating(samplePlayer, 1998, { ratingScope: 'all_time_prime' }, index);
    assert.equal(rating.label, 'OVR 91');
    assert.equal(rating.simValue, 91);
}

function testOvrClosestYear(): void {
    const player: SquadPlayer = {
        id: 'test-P-100',
        playerId: 'P-100',
        name: 'Test Player',
        positions: ['MID'],
        overall: 0,
    };
    const ovrIndex: PlayerRatingsIndex = {
        'P-100': {
            ovrByYear: { 2018: 85 },
            ovrPrime: 85,
            wcGoalsByYear: {},
            wcGoalsPrime: 0,
        },
    };
    const rating = resolvePlayerRating(player, 2019, { ratingScope: 'year_rating' }, ovrIndex);
    assert.equal(rating.label, 'OVR 85');
}

function testPositionDefaultOvr(): void {
    const player: SquadPlayer = {
        id: 'brazil-1970-P-99999',
        playerId: 'P-99999',
        name: 'Unknown',
        positions: ['FWD'],
        overall: 0,
    };
    const rating = resolvePlayerRating(player, 2018, { ratingScope: 'year_rating' }, {});
    assert.equal(rating.source, 'default');
    assert.equal(rating.label, 'OVR 70');
    assert.equal(rating.simValue, 70);
    assert.equal(defaultOvrForPositions(['FWD']), 70);
}

function testSimValue(): void {
    assert.equal(
        resolvePlayerSimValue(samplePlayer, 2006, { ratingScope: 'year_rating' }, index),
        91,
    );
}

function testWcYearToFifaVersion(): void {
    assert.equal(wcYearToFifaVersion(2014), 15);
    assert.equal(wcYearToFifaVersion(2018), 19);
    assert.equal(wcYearToFifaVersion(2022), 23);
    assert.equal(wcYearToFifaVersion(1930), 15);
    assert.equal(fifaVersionToCalendarYear(19), 2018);
}

testExtractPlayerId();
testOvrYearRating();
testOvrAllTimePrime();
testOvrClosestYear();
testPositionDefaultOvr();
testSimValue();
testWcYearToFifaVersion();
console.log('Ratings tests passed.');

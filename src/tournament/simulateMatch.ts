import type { GoalEvent, MatchResult, MatchStage, TournamentPlayer, TournamentTeam } from './types';
import { pickWeighted, type Rng } from './rng';

const POSITION_GOAL_WEIGHT: Record<string, number> = {
    FWD: 5,
    MID: 3,
    DEF: 1,
    GK: 0.05,
};

/** Outfield penalty-taking skill multiplier (pick order + conversion). */
const PENALTY_TAKER_WEIGHT: Record<string, number> = {
    FWD: 1.12,
    MID: 1.0,
    DEF: 0.88,
    GK: 0.5,
};

/** How strongly the opposing GK affects save probability. */
const GK_SAVE_INFLUENCE = 1.35;

const PENALTY_ROUNDS = 5;
const MAX_SUDDEN_DEATH_ROUNDS = 24;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function expectedGoals(home: TournamentTeam, away: TournamentTeam, rng: Rng): [number, number] {
    const homeExp = home.strength / 800 + rng() * 0.8;
    const awayExp = away.strength / 800 + rng() * 0.8;
    const diff = homeExp - awayExp;

    const homeGoals = samplePoisson(Math.max(0.3, 1.2 + diff * 0.9), rng);
    const awayGoals = samplePoisson(Math.max(0.3, 1.0 - diff * 0.7), rng);
    return [Math.min(homeGoals, 6), Math.min(awayGoals, 6)];
}

function samplePoisson(lambda: number, rng: Rng): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
        k++;
        p *= rng();
    } while (p > L);
    return k - 1;
}

function pickScorer(players: TournamentPlayer[], rng: Rng): TournamentPlayer {
    const weights = players.map((p) => POSITION_GOAL_WEIGHT[p.position] * p.overall);
    return pickWeighted(players, weights, rng);
}

function pickAssister(players: TournamentPlayer[], scorer: TournamentPlayer, rng: Rng): string | undefined {
    if (rng() > 0.6) return undefined;
    const candidates = players.filter(
        (p) => p.name !== scorer.name && p.position !== 'GK',
    );
    if (candidates.length === 0) return undefined;
    const weights = candidates.map((p) => (p.position === 'MID' ? 3 : 2) * p.overall);
    return pickWeighted(candidates, weights, rng).name;
}

function generateGoalEvents(
    team: TournamentTeam,
    count: number,
    rng: Rng,
): GoalEvent[] {
    const events: GoalEvent[] = [];
    for (let i = 0; i < count; i++) {
        const scorer = pickScorer(team.players, rng);
        events.push({
            minute: Math.max(1, Math.min(90, Math.floor(rng() * 90) + 1)),
            teamId: team.id,
            scorerName: scorer.name,
            assistName: pickAssister(team.players, scorer, rng),
        });
    }
    events.sort((a, b) => a.minute - b.minute);
    return events;
}

function penaltyTakerRating(player: TournamentPlayer): number {
    return player.overall * (PENALTY_TAKER_WEIGHT[player.position] ?? 1);
}

function getGoalkeeper(team: TournamentTeam): TournamentPlayer {
    const gks = team.players.filter((p) => p.position === 'GK');
    if (gks.length > 0) {
        return gks.reduce((best, p) => (p.overall > best.overall ? p : best));
    }
    const weakest = team.players.reduce((min, p) => (p.overall < min.overall ? p : min));
    return {
        name: weakest.name,
        overall: Math.round(weakest.overall * 0.75),
        position: 'GK',
    };
}

function pickPenaltyTakers(team: TournamentTeam, count: number): TournamentPlayer[] {
    const outfield = team.players.filter((p) => p.position !== 'GK');
    return [...outfield]
        .sort((a, b) => penaltyTakerRating(b) - penaltyTakerRating(a))
        .slice(0, count);
}

function penaltyScoreProbability(
    shooter: TournamentPlayer,
    goalkeeper: TournamentPlayer,
    rng: Rng,
): boolean {
    const attack = penaltyTakerRating(shooter);
    const defense = goalkeeper.overall * GK_SAVE_INFLUENCE;
    const diff = attack - defense;
    const prob = clamp(0.72 + diff * 0.018, 0.22, 0.94);
    return rng() < prob;
}

function simulatePenaltyShootout(
    home: TournamentTeam,
    away: TournamentTeam,
    rng: Rng,
): { homePenalties: number; awayPenalties: number; events: GoalEvent[] } {
    const homeGk = getGoalkeeper(home);
    const awayGk = getGoalkeeper(away);
    const homeTakers = pickPenaltyTakers(home, PENALTY_ROUNDS);
    const awayTakers = pickPenaltyTakers(away, PENALTY_ROUNDS);

    let homePenalties = 0;
    let awayPenalties = 0;
    const events: GoalEvent[] = [];
    let minute = 120;

    const recordKick = (
        teamId: string,
        taker: TournamentPlayer,
        goalkeeper: TournamentPlayer,
        scored: boolean,
    ) => {
        events.push({
            minute,
            teamId,
            scorerName: taker.name,
            penaltyShootout: true,
            scored,
            assistName: scored ? undefined : `saved by ${goalkeeper.name}`,
        });
        minute += 1;
        if (scored) {
            if (teamId === home.id) homePenalties += 1;
            else awayPenalties += 1;
        }
    };

    for (let round = 0; round < PENALTY_ROUNDS; round++) {
        const homeTaker = homeTakers[round];
        const awayTaker = awayTakers[round];
        if (homeTaker) {
            recordKick(
                home.id,
                homeTaker,
                awayGk,
                penaltyScoreProbability(homeTaker, awayGk, rng),
            );
        }
        if (awayTaker) {
            recordKick(
                away.id,
                awayTaker,
                homeGk,
                penaltyScoreProbability(awayTaker, homeGk, rng),
            );
        }
    }

    let suddenRound = 0;
    while (homePenalties === awayPenalties && suddenRound < MAX_SUDDEN_DEATH_ROUNDS) {
        const homeTaker = homeTakers[suddenRound % homeTakers.length] ?? homeTakers[0];
        const awayTaker = awayTakers[suddenRound % awayTakers.length] ?? awayTakers[0];
        if (!homeTaker || !awayTaker) break;

        recordKick(
            home.id,
            homeTaker,
            awayGk,
            penaltyScoreProbability(homeTaker, awayGk, rng),
        );
        recordKick(
            away.id,
            awayTaker,
            homeGk,
            penaltyScoreProbability(awayTaker, homeGk, rng),
        );
        suddenRound += 1;
    }

    if (homePenalties === awayPenalties) {
        const homeWins = rng() < home.strength / (home.strength + away.strength);
        if (homeWins) homePenalties += 1;
        else awayPenalties += 1;
    }

    return { homePenalties, awayPenalties, events };
}

/** Winner of a knockout fixture (regulation or penalties). */
export function knockoutWinnerTeamId(match: MatchResult): string {
    if (match.homePenalties !== undefined && match.awayPenalties !== undefined) {
        return match.homePenalties > match.awayPenalties
            ? match.homeTeamId
            : match.awayTeamId;
    }
    return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
}

export function formatMatchScore(match: MatchResult): string {
    const base = `${match.homeScore}–${match.awayScore}`;
    if (match.homePenalties !== undefined && match.awayPenalties !== undefined) {
        return `${base} (${match.homePenalties}–${match.awayPenalties} pens)`;
    }
    return base;
}

export function simulateMatch(
    home: TournamentTeam,
    away: TournamentTeam,
    stage: MatchStage,
    rng: Rng,
    id: string,
    group?: import('./types').GroupLetter,
): MatchResult {
    const [homeScore, awayScore] = expectedGoals(home, away, rng);
    const events = [
        ...generateGoalEvents(home, homeScore, rng),
        ...generateGoalEvents(away, awayScore, rng),
    ].sort((a, b) => a.minute - b.minute);

    return {
        id,
        stage,
        group,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore,
        awayScore,
        events,
    };
}

export function simulateKnockoutMatch(
    home: TournamentTeam,
    away: TournamentTeam,
    stage: MatchStage,
    rng: Rng,
    id: string,
): MatchResult {
    const result = simulateMatch(home, away, stage, rng, id);
    if (result.homeScore !== result.awayScore) {
        return result;
    }

    const shootout = simulatePenaltyShootout(home, away, rng);
    return {
        ...result,
        homePenalties: shootout.homePenalties,
        awayPenalties: shootout.awayPenalties,
        events: [...result.events, ...shootout.events],
    };
}

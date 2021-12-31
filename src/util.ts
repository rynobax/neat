import { v4 as uuid } from "uuid";
import { last, random, shuffle, sortBy, uniqBy } from "lodash";
import type Genome from "./Genome";
import type { ConnectionGene } from "./Genome";
import type { Specie } from "./Population";
import type { ModelParameters } from "./params";

export function takeRandom<T>(arr: Array<T>) {
  return shuffle(arr)[0];
}

export function takeRandomPair<T>(arr: Array<T>) {
  const shuffled = shuffle(arr);
  return [shuffled[0], shuffled[1]];
}

export const randomWeight = () => random(MIN_WEIGHT, MAX_WEIGHT, true);

export const percentChance = (percent: number) => random(0, 99) < percent;

const MAX_WEIGHT = 8;
const MIN_WEIGHT = -8;

const clampWeight = (w: number) =>
  Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, w));

export function getWeightTweaker() {
  const x = Math.random();
  const heads = Math.random() > 0.5;
  if (x < 0.7) {
    const amt = random(0.001, 0.25) * (heads ? 1 : -1);
    return (w: number) => clampWeight(w + amt);
  } else if (x < 0.95) {
    const amt = random(0.5, 2);
    return (w: number) => clampWeight(w * amt);
  } else {
    return (w: number) => clampWeight(w * -1);
  }
}

export function alignGenomes(a: Genome, b: Genome) {
  const matching: { a: ConnectionGene; b: ConnectionGene }[] = [];
  const aDisjoint: ConnectionGene[] = [];
  const bDisjoint: ConnectionGene[] = [];
  const aExcess: ConnectionGene[] = [];
  const bExcess: ConnectionGene[] = [];

  const aMax = last(a.connectionGenes).innovation;
  const bMax = last(b.connectionGenes).innovation;

  a.connectionGenes.forEach((con) => {
    const match = b.connectionGenes.find(
      (c) => con.innovation === c.innovation
    );
    if (match) {
      matching.push({ a: con, b: match });
    } else {
      if (con.innovation < bMax) {
        aDisjoint.push(con);
      } else {
        aExcess.push(con);
      }
    }
  });

  b.connectionGenes.forEach((con) => {
    // We already have all the matches so we can look at the smaller array
    const match = matching.find((c) => con.innovation === c.a.innovation);
    if (!match) {
      if (con.innovation < aMax) {
        bDisjoint.push(con);
      } else {
        bExcess.push(con);
      }
    }
  });

  return { matching, aDisjoint, bDisjoint, aExcess, bExcess };
}

type WhoIsMoreFit = "a" | "b" | "tie";

export function combineGenomeConnections(
  a: Genome,
  b: Genome,
  whoIsMoreFit: WhoIsMoreFit
) {
  const { aDisjoint, aExcess, bDisjoint, bExcess, matching } = alignGenomes(
    a,
    b
  );

  const strongerExtras: ConnectionGene[] = [];
  if (whoIsMoreFit === "a") {
    strongerExtras.push(...aDisjoint, ...aExcess);
  } else if (whoIsMoreFit === "b") {
    strongerExtras.push(...bDisjoint, ...bExcess);
  } else {
    for (const c of [...aDisjoint, ...aExcess, ...bDisjoint, ...bExcess]) {
      if (Math.random() > 0.5) strongerExtras.push(c);
    }
  }

  const randomizedMatches = matching.map((m) =>
    Math.random() > 0.5 ? m.a : m.b
  );

  const connectionGenes = sortBy(
    [...randomizedMatches, ...strongerExtras],
    (c) => c.innovation
  );

  const nodeGenes = uniqBy(
    [...a.nodeGenes, ...b.nodeGenes],
    (n) => n.id
  ).filter((e) => connectionGenes.some((c) => c.in === e.id || c.out === e.id));

  return {
    connectionGenes,
    nodeGenes,
  };
}

export function isInSpecie(
  genome: Genome,
  specie: Specie,
  { c1, c2, c3, speciesThreshold }: ModelParameters
) {
  const rep = specie.members[0];

  const { aDisjoint, aExcess, bDisjoint, bExcess, matching } = alignGenomes(
    genome,
    rep
  );

  let weightSum = 0;
  let weightCount = 0;
  matching.forEach((match) => {
    const diff = Math.abs(match.a.weight - match.b.weight);
    weightSum += diff;
    weightCount++;
  });

  // excess count
  const e = aExcess.length + bExcess.length;
  // disjoint count
  const d = aDisjoint.length + bDisjoint.length;
  // number of genes in larger genome
  let n = Math.max(genome.connectionGenes.length, rep.connectionGenes.length);
  if (n < 20) n = 1;
  // avg weight differences of matching genes
  const w = weightSum / weightCount;

  const delta = (c1 * e) / n + (c2 * d) / n + c3 * w;

  return delta <= speciesThreshold;
}

export function computeNextSpecies(
  prevSpecies: Specie[],
  genomes: Genome[],
  parameters: ModelParameters,
  measureFitness: (genome: Genome) => number
) {
  const nextSpecies = [...prevSpecies];

  const speciesGroups = prevSpecies.reduce<Record<string, Specie>>((p, c) => {
    p[c.id] = { id: c.id, members: [], numOfChildren: 0 };
    return p;
  }, {});

  for (const genome of genomes) {
    let found = false;
    for (const specie of nextSpecies) {
      if (isInSpecie(genome, specie, parameters)) {
        // add to group
        speciesGroups[specie.id].members.push(genome);
        found = true;
        break;
      }
    }

    if (!found) {
      // make new group
      const id = uuid();
      const newSpecie: Specie = {
        id,
        members: [genome],
        numOfChildren: 0,
      };
      speciesGroups[newSpecie.id] = newSpecie;
      nextSpecies.push(newSpecie);
    }
  }

  const groupFitnessValues: Record<string, number> = {};

  const sumOfAdjFitnessAvgs = Object.values(speciesGroups).reduce(
    (sum, specie) => {
      const groupAdjFitnessSum = specie.members.reduce((sum, genome) => {
        const rawFitness = measureFitness(genome);
        const adjFitness = rawFitness / specie.members.length;
        return sum + adjFitness;
      }, 0);
      groupFitnessValues[specie.id] = groupAdjFitnessSum;
      return sum + groupAdjFitnessSum;
    },
    0
  );

  Object.values(speciesGroups).forEach((specie) => {
    const fitness = groupFitnessValues[specie.id];
    if (fitness === 0) return;
    const pct = fitness / sumOfAdjFitnessAvgs;
    // TODO: Sometimes this does not match population size but it seems to
    // still cluster around populationSize
    specie.numOfChildren = Math.round(pct * parameters.populationSize);
  });

  return Object.values(speciesGroups)
    .map((e) => ({
      ...e,
      // rep is just first member so make sure to shuffle
      members: shuffle(e.members),
    }))
    .filter((e) => e.members.length > 0);
}

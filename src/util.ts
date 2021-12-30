import { last, random, shuffle, sortBy, uniqBy } from "lodash";
import type Genome from "./Genome";
import type { ConnectionGene } from "./Genome";
import type { ModelParameters, Specie } from "./Trainer";

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

let nodeId = 10000;
export function newNodeId() {
  nodeId++;
  return nodeId;
}

export function isInSpecie(
  genome: Genome,
  specie: Specie,
  { c1, c2, c3, speciesThreshold }: ModelParameters
) {
  const { rep } = specie;

  const repMax = last(rep.connectionGenes).innovation;

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

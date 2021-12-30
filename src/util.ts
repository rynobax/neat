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

type WhoIsMoreFit = "a" | "b" | "tie";

export function combineGenomeConnections(
  a: Genome,
  b: Genome,
  whoIsMoreFit: WhoIsMoreFit
) {
  const matching: ConnectionGene[] = [];
  const disjoint: ConnectionGene[] = [];
  a.connectionGenes.forEach((con) => {
    const match = b.connectionGenes.find(
      (c) => con.in === c.in && con.out === c.out
    );
    if (match) {
      const toTake = Math.random() > 0.5 ? con : match;
      matching.push(toTake);
    } else {
      if (whoIsMoreFit === "a") {
        disjoint.push(con);
      } else if (whoIsMoreFit === "tie") {
        if (Math.random() > 0.5) disjoint.push(con);
      }
    }
  });

  b.connectionGenes.forEach((con) => {
    // We already have all the matches so we can look at the smaller array
    const match = matching.find((c) => con.in === c.in && con.out === c.out);
    if (!match) {
      if (whoIsMoreFit === "b") {
        disjoint.push(con);
      } else if (whoIsMoreFit === "tie") {
        if (Math.random() > 0.5) disjoint.push(con);
      }
    }
  });

  const connectionGenes = sortBy(
    [...matching, ...disjoint],
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

  let disjointCount = 0;
  let excessCount = 0;
  let weightSum = 0;
  let weightCount = 0;
  genome.connectionGenes.forEach((con) => {
    const match = rep.connectionGenes.find(
      (c) => c.in === con.in && c.out === con.out
    );
    if (match) {
      // TODO: Unclear if this weight should be absolute
      const diff = Math.abs(match.weight - con.weight);
      weightSum += diff;
      weightCount++;
    } else {
      if (con.innovation < repMax) {
        disjointCount++;
      } else {
        excessCount++;
      }
    }
  });

  // excess count
  const e = excessCount;
  // disjoint count
  const d = disjointCount;
  // number of genes in larger genome
  const n = Math.max(genome.connectionGenes.length, rep.connectionGenes.length);
  // avg weight differences of matching genes
  const w = weightSum / weightCount;

  const delta = (c1 * e) / n + (c2 * d) / n + c3 * w;

  return delta <= speciesThreshold;
}

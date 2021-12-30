import { last, random, shuffle, sortBy } from "lodash";
import type Genome from "./Genome";
import type { ConnectionGene } from "./Genome";

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

  return sortBy([...matching, ...disjoint], (c) => c.innovation);
}

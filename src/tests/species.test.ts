import Population, { Specie } from "../Population";
import Genome, { ConnectionGene, NodeGene, NodeType } from "../Genome";
import {
  alignGenomes,
  combineGenomeConnections,
  computeNextSpecies,
  isInSpecie,
} from "../util";
import { getInnovationNumber } from "./testUtil";
import { DEFAULT_MODEL_PARAMETERS } from "../params";

const getPopulation = () => new Population(1, 1, () => 1, {});

const nodeGenes: NodeGene[] = [
  { id: 1, type: NodeType.input, ndx: 0 },
  { id: 2, type: NodeType.output, ndx: 0 },
];
const connectionGenes: ConnectionGene[] = [
  { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
];

describe("isInSpecie", () => {
  test("same species returns true", () => {
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    expect(
      isInSpecie(
        genome,
        { id: "1", members: [genome], numOfChildren: 1 },
        DEFAULT_MODEL_PARAMETERS
      )
    ).toEqual(true);
  });

  test("many excess genome returns false", () => {
    const genome = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 2, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 3, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 4, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 5, out: 2, weight: 1 },
    ]);
    const rep = new Genome(getPopulation, nodeGenes, connectionGenes);
    expect(
      isInSpecie(
        genome,
        { id: "1", members: [rep], numOfChildren: 1 },
        DEFAULT_MODEL_PARAMETERS
      )
    ).toEqual(false);
  });

  test("many excess rep returns false", () => {
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const rep = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 2, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 3, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 4, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 5, out: 2, weight: 1 },
    ]);
    expect(
      isInSpecie(
        genome,
        { id: "1", members: [rep], numOfChildren: 1 },
        DEFAULT_MODEL_PARAMETERS
      )
    ).toEqual(false);
  });

  test("weight differences returns false", () => {
    const genome = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: -8 },
    ]);
    const rep = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 8 },
    ]);
    expect(
      isInSpecie(
        genome,
        { id: "1", members: [rep], numOfChildren: 1 },
        DEFAULT_MODEL_PARAMETERS
      )
    ).toEqual(false);
  });
});

describe("alignGenomes", () => {
  test("works", () => {
    const genomeA = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 2, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 3, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 6, out: 2, weight: 1 },
    ]);
    const genomeB = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 2 },
      { enabled: true, in: 1, innovation: 3, out: 2, weight: 2 },
      { enabled: true, in: 1, innovation: 4, out: 2, weight: 2 },
      { enabled: true, in: 1, innovation: 7, out: 2, weight: 2 },
      { enabled: true, in: 1, innovation: 8, out: 2, weight: 2 },
    ]);
    const { aDisjoint, aExcess, bDisjoint, bExcess, matching } = alignGenomes(
      genomeA,
      genomeB
    );
    expect(matching).toEqual([
      {
        a: { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
        b: { enabled: true, in: 1, innovation: 1, out: 2, weight: 2 },
      },
      {
        a: { enabled: true, in: 1, innovation: 3, out: 2, weight: 1 },
        b: { enabled: true, in: 1, innovation: 3, out: 2, weight: 2 },
      },
    ]);
    expect(aDisjoint).toEqual([
      { enabled: true, in: 1, innovation: 2, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 6, out: 2, weight: 1 },
    ]);
    expect(bDisjoint).toEqual([
      { enabled: true, in: 1, innovation: 4, out: 2, weight: 2 },
    ]);
    expect(aExcess).toEqual([]);
    expect(bExcess).toEqual([
      { enabled: true, in: 1, innovation: 7, out: 2, weight: 2 },
      { enabled: true, in: 1, innovation: 8, out: 2, weight: 2 },
    ]);
  });
});

describe("combineGenomeConnections", () => {
  it("takes from the stronger", () => {
    const genomeA = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
    ]);
    const genomeB = new Genome(getPopulation, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 2, innovation: 2, out: 2, weight: 2 },
    ]);
    expect(
      combineGenomeConnections(genomeA, genomeB, "b").connectionGenes
    ).toEqual([
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 2, innovation: 2, out: 2, weight: 2 },
    ]);
  });
});

describe("computeNextSpecies", () => {
  const measureFitness = () => 1;

  const nGenomes = (n: number) => {
    const pop = getPopulation();
    return new Array(n)
      .fill(null)
      .map(() => new Genome(() => pop, nodeGenes, connectionGenes));
  };

  describe("initial species", () => {
    it("only one species to start", () => {
      const prev: Specie[] = [];
      const popSize = 100;
      const genomes = nGenomes(popSize);
      expect(
        computeNextSpecies(
          prev,
          genomes,
          { ...DEFAULT_MODEL_PARAMETERS, populationSize: popSize },
          measureFitness
        )
      ).toHaveLength(1);
    });

    it("should keep number of genomes the same", () => {
      const prev: Specie[] = [];
      const popSize = 100;
      const genomes = nGenomes(popSize);
      const next = computeNextSpecies(
        prev,
        genomes,
        { ...DEFAULT_MODEL_PARAMETERS, populationSize: popSize },
        measureFitness
      );
      const numNextGenomes = next.reduce((p, c) => p + c.numOfChildren, 0);
      expect(numNextGenomes).toEqual(popSize);
    });
  });
});

import Genome, { ConnectionGene, NodeGene, NodeType } from "../Genome";
import { alignGenomes, combineGenomeConnections, isInSpecie } from "../util";
import { getInnovationNumber } from "./testUtil";
import { DEFAULT_MODEL_PARAMETERS } from "../params";

const nodeGenes: NodeGene[] = [
  { id: 1, type: NodeType.input },
  { id: 2, type: NodeType.output },
];
const connectionGenes: ConnectionGene[] = [
  { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
];

describe("isInSpecie", () => {
  test("same species returns true", () => {
    const genome = new Genome(
      1,
      1,
      getInnovationNumber,
      nodeGenes,
      connectionGenes
    );
    expect(
      isInSpecie(genome, { id: "1", rep: genome }, DEFAULT_MODEL_PARAMETERS)
    ).toEqual(true);
  });

  test("many excess genome returns false", () => {
    const genome = new Genome(1, 1, getInnovationNumber, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 2, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 3, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 4, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 5, out: 2, weight: 1 },
    ]);
    const rep = new Genome(
      1,
      1,
      getInnovationNumber,
      nodeGenes,
      connectionGenes
    );
    expect(
      isInSpecie(genome, { id: "1", rep }, DEFAULT_MODEL_PARAMETERS)
    ).toEqual(false);
  });

  test("many excess rep returns false", () => {
    const genome = new Genome(
      1,
      1,
      getInnovationNumber,
      nodeGenes,
      connectionGenes
    );
    const rep = new Genome(1, 1, getInnovationNumber, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 2, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 3, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 4, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 5, out: 2, weight: 1 },
    ]);
    expect(
      isInSpecie(genome, { id: "1", rep }, DEFAULT_MODEL_PARAMETERS)
    ).toEqual(false);
  });

  test("weight differences returns false", () => {
    const genome = new Genome(1, 1, getInnovationNumber, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: -8 },
    ]);
    const rep = new Genome(1, 1, getInnovationNumber, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 8 },
    ]);
    expect(
      isInSpecie(genome, { id: "1", rep }, DEFAULT_MODEL_PARAMETERS)
    ).toEqual(false);
  });
});

describe("alignGenomes", () => {
  test("works", () => {
    const genomeA = new Genome(1, 1, getInnovationNumber, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 2, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 3, out: 2, weight: 1 },
      { enabled: true, in: 1, innovation: 6, out: 2, weight: 1 },
    ]);
    const genomeB = new Genome(1, 1, getInnovationNumber, nodeGenes, [
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
    const genomeA = new Genome(1, 1, getInnovationNumber, nodeGenes, [
      { enabled: true, in: 1, innovation: 1, out: 2, weight: 1 },
    ]);
    const genomeB = new Genome(1, 1, getInnovationNumber, nodeGenes, [
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

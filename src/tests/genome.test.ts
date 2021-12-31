import { uniqBy } from "lodash";
import Genome, { ConnectionGene, NodeGene, NodeType } from "../Genome";
import Population from "../Population";

describe("initialization", () => {
  const getPopulation = () => new Population(3, 2, () => 1, {});
  test("generates correct initial nodes", () => {
    const genome = new Genome(getPopulation);
    expect(genome.nodeGenes).toEqual([
      {
        type: NodeType.input,
        id: 10001,
        ndx: 0,
      },
      {
        type: NodeType.input,
        id: 10002,
        ndx: 1,
      },
      {
        type: NodeType.input,
        id: 10003,
        ndx: 2,
      },
      {
        type: NodeType.output,
        id: 10004,
        ndx: 0,
      },
      {
        type: NodeType.output,
        id: 10005,
        ndx: 1,
      },
    ]);
  });

  test("generates correct initial connections", () => {
    const genome = new Genome(getPopulation);
    const expected = [
      {
        in: 10001,
        out: 10004,
      },
      {
        in: 10002,
        out: 10004,
      },
      {
        in: 10003,
        out: 10004,
      },
      {
        in: 10001,
        out: 10005,
      },
      {
        in: 10002,
        out: 10005,
      },
      {
        in: 10003,
        out: 10005,
      },
    ];
    expect(genome.connectionGenes).toHaveLength(expected.length);
    expect(genome.connectionGenes).toEqual(
      expect.arrayContaining(expected.map((e) => expect.objectContaining(e)))
    );
    expect(genome.connectionGenes.length).toEqual(
      uniqBy(genome.connectionGenes, (c) => c.innovation).length
    );
  });
});

describe("addNewNode", () => {
  it("adds a new node", () => {
    const getPopulation = () => new Population(1, 1, () => 1, {});
    const genome = new Genome(getPopulation);
    genome.addNewNode();
    expect(genome.nodeGenes).toHaveLength(3);
    expect(genome.connectionGenes).toHaveLength(2);
    expect(genome.nodeGenes).toContainEqual(
      expect.objectContaining({
        id: 10003,
        type: NodeType.hidden,
      })
    );
    expect(genome.connectionGenes).toContainEqual(
      expect.objectContaining({
        enabled: true,
        in: 10001,
        out: 10003,
      })
    );
    expect(genome.connectionGenes).toContainEqual(
      expect.objectContaining({
        enabled: true,
        in: 10003,
        out: 10002,
      })
    );
  });
});

describe("connectNewNodes", () => {
  it("adds a new connection", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.input, ndx: 1 },
      { id: 3, type: NodeType.output, ndx: 0 },
      { id: 4, type: NodeType.hidden },
    ];
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 3, weight: 1, innovation: 1, enabled: true },
      { in: 2, out: 3, weight: 1, innovation: 1, enabled: true },
      { in: 4, out: 3, weight: 1, innovation: 1, enabled: true },
      { in: 1, out: 4, weight: 1, innovation: 1, enabled: true },
    ];

    const getPopulation = () => new Population(1, 1, () => 1, {});
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    genome.addConnection();
    expect(genome.nodeGenes).toHaveLength(4);
    expect(genome.connectionGenes).toHaveLength(5);
    expect(genome.connectionGenes).toContainEqual(
      expect.objectContaining({
        enabled: true,
        in: 2,
        out: 4,
      })
    );
  });
});

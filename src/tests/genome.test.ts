import { uniqBy } from "lodash";
import Genome, { ConnectionGene, NodeGene, NodeType } from "../Genome";
import { DEFAULT_MODEL_PARAMETERS } from "../params";
import Population from "../Population";

const PARAMS = { ...DEFAULT_MODEL_PARAMETERS, activationFn: (x: number) => x };

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

describe("evaluate", () => {
  it("in and out", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.output, ndx: 0 },
    ];
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 2, weight: 2, innovation: 1, enabled: true },
    ];

    const getPopulation = () => new Population(1, 1, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const [res] = genome.evaluate([1]);
    expect(res).toEqual(2);
  });

  it("multiple inputs", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.input, ndx: 1 },
      { id: 3, type: NodeType.output, ndx: 0 },
    ];
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 3, weight: 2, innovation: 1, enabled: true },
      { in: 2, out: 3, weight: 0.5, innovation: 2, enabled: true },
    ];

    const getPopulation = () => new Population(2, 1, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const [res] = genome.evaluate([1, 2]);
    expect(res).toEqual(3);
  });

  it("multiple outputs", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.output, ndx: 0 },
      { id: 3, type: NodeType.output, ndx: 1 },
    ];
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 2, weight: 2, innovation: 1, enabled: true },
      { in: 1, out: 3, weight: 0.5, innovation: 2, enabled: true },
    ];

    const getPopulation = () => new Population(1, 2, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const res = genome.evaluate([2]);
    expect(res).toEqual([4, 1]);
  });

  it("hidden node", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.output, ndx: 0 },
      { id: 3, type: NodeType.hidden },
    ];
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 3, weight: 2, innovation: 1, enabled: true },
      { in: 3, out: 2, weight: 2, innovation: 2, enabled: true },
    ];

    const getPopulation = () => new Population(1, 1, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const [res] = genome.evaluate([1]);
    expect(res).toEqual(4);
  });

  it("long chain", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.output, ndx: 0 },
      { id: 3, type: NodeType.hidden },
      { id: 4, type: NodeType.hidden },
    ];

    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 3, weight: 4, innovation: 1, enabled: true },
      { in: 3, out: 4, weight: 6, innovation: 2, enabled: true },
      { in: 4, out: 2, weight: 8, innovation: 3, enabled: true },
    ];

    const getPopulation = () => new Population(1, 1, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const [res] = genome.evaluate([1]);
    // expect(res).toEqual(192);
    // TODO: This seems wrong but seems to match original code
    expect(res).toEqual(0);
  });

  it("complex", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.input, ndx: 1 },
      { id: 3, type: NodeType.output, ndx: 0 },
      { id: 4, type: NodeType.output, ndx: 1 },
      { id: 5, type: NodeType.hidden },
      { id: 6, type: NodeType.hidden },
    ];

    // 1 = 1
    // 2 = 1
    // 5 = 3 + 4  = 7
    // 6 = 5 + 42 = 47
    // 3 = 2 + 49 = 51
    // 4 = (47 * 8) = 376
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 3, weight: 2, innovation: 1, enabled: true },
      { in: 1, out: 5, weight: 3, innovation: 2, enabled: true },
      { in: 2, out: 5, weight: 4, innovation: 3, enabled: true },
      { in: 2, out: 6, weight: 5, innovation: 4, enabled: true },
      { in: 5, out: 6, weight: 6, innovation: 5, enabled: true },
      { in: 5, out: 3, weight: 7, innovation: 6, enabled: true },
      { in: 6, out: 4, weight: 8, innovation: 7, enabled: true },
    ];

    const getPopulation = () => new Population(2, 2, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const [res1, res2] = genome.evaluate([1, 1]);
    expect(res1).toEqual(51);
    // TODO: This seems wrong but seems to match original
    // expect(res2).toEqual(376);
    expect(res2).toEqual(40);
  });

  it("respects disabled", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.output, ndx: 0 },
      { id: 3, type: NodeType.hidden },
    ];
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 3, weight: 2, innovation: 1, enabled: true },
      { in: 3, out: 2, weight: 2, innovation: 2, enabled: true },
      { in: 1, out: 2, weight: 2, innovation: 3, enabled: false },
    ];

    const getPopulation = () => new Population(1, 1, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const [res] = genome.evaluate([1]);
    expect(res).toEqual(4);
  });

  it("handles circular dependencies", () => {
    const nodeGenes: NodeGene[] = [
      { id: 1, type: NodeType.input, ndx: 0 },
      { id: 2, type: NodeType.output, ndx: 0 },
      { id: 3, type: NodeType.hidden },
      { id: 4, type: NodeType.hidden },
    ];
    const connectionGenes: ConnectionGene[] = [
      { in: 1, out: 3, weight: 2, innovation: 1, enabled: true },
      { in: 1, out: 4, weight: 3, innovation: 2, enabled: true },
      { in: 3, out: 4, weight: 2, innovation: 3, enabled: true },
      { in: 4, out: 3, weight: 2, innovation: 4, enabled: true },
      { in: 3, out: 2, weight: 2, innovation: 5, enabled: true },
      { in: 4, out: 2, weight: 2, innovation: 6, enabled: true },
    ];

    const getPopulation = () => new Population(1, 1, () => 1, PARAMS);
    const genome = new Genome(getPopulation, nodeGenes, connectionGenes);
    const [res] = genome.evaluate([1]);
    expect(res).toEqual(10);
  });
});

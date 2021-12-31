import { uniqBy } from "lodash";
import Genome, { NodeType } from "../Genome";
import Population from "../Population";

const getPopulation = () => new Population(3, 2, () => 1, {});

describe("initialization", () => {
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

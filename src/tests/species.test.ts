import Genome, { ConnectionGene, NodeGene, NodeType } from "../Genome";
import { isInSpecie } from "../util";
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
  it("same species returns true", () => {
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
});

import { random } from "lodash";
import {
  combineGenomeConnections,
  getWeightTweaker,
  newNodeId,
  percentChance,
  randomWeight,
  takeRandom,
  takeRandomPair,
} from "./util";

export enum NodeType {
  input,
  output,
  hidden,
}

export interface NodeGene {
  type: NodeType;
  id: number;
}

export interface ConnectionGene {
  in: number;
  out: number;
  weight: number;
  enabled: boolean;
  innovation: number;
}

class Genome {
  public nodeGenes: NodeGene[];

  public connectionGenes: ConnectionGene[];

  constructor(
    private inputLength: number,
    private outputLength: number,
    private getInnovationNumber: () => number,
    nodeGenes?: NodeGene[],
    connectionGenes?: ConnectionGene[]
  ) {
    this.nodeGenes = nodeGenes || this.initialNodeGenes();
    this.connectionGenes = connectionGenes || this.initialConnectionGenes();
  }

  private initialNodeGenes() {
    const nodeGenes: NodeGene[] = [];
    for (let i = 0; i < this.inputLength; i++) {
      nodeGenes.push({ id: newNodeId(), type: NodeType.input });
    }
    for (let i = 0; i < this.outputLength; i++) {
      nodeGenes.push({ id: newNodeId(), type: NodeType.output });
    }
    return nodeGenes;
  }

  private initialConnectionGenes() {
    const connectionGenes: ConnectionGene[] = [];
    for (let i = 0; i < this.inputLength; i++) {
      for (let j = 0; j < this.outputLength; j++) {
        this.connectionGenes.push({
          enabled: true,
          in: i,
          out: i,
          innovation: 1,
          weight: randomWeight(),
        });
      }
    }
    return connectionGenes;
  }

  public evaluate(input: number[]): number[] {
    return null;
  }

  public copy() {
    return new Genome(
      this.inputLength,
      this.outputLength,
      this.getInnovationNumber,
      this.nodeGenes,
      this.connectionGenes
    );
  }

  public mutate(): Genome {
    const newGenome = this.copy();
    if (percentChance(80)) {
      // mutate weights
      const tweakWeight = getWeightTweaker();
      const randomize = percentChance(10);
      this.connectionGenes.forEach((gene) => {
        if (randomize) {
          gene.weight = randomWeight();
        } else {
          gene.weight = tweakWeight(gene.weight);
        }
      });
    }

    if (percentChance(3)) {
      // add new node (break connection in two)
      this.addNewNode();
    } else if (percentChance(5)) {
      // add new link (connect two nodes)
      this.connectNewNodes();
    }

    return newGenome;
  }

  // TODO: Find a better way to do this, maybe check source code
  private connectNewNodes() {
    let attempts = 0;
    const n = this.nodeGenes.length;
    const maxAttempts = (n * (n - 1)) / 2 + 50;
    while (attempts < maxAttempts) {
      const [start, end] = takeRandomPair(this.nodeGenes);
      const exists = this.connectionGenes.some(
        (c) => c.in === start.id && c.out === end.id
      );
      if (!exists) {
        // TODO: Handle identical innovation in same generation
        this.connectionGenes.push({
          enabled: true,
          in: start.id,
          innovation: this.getInnovationNumber(),
          out: end.id,
          weight: randomWeight(),
        });
        return;
      }
      attempts++;
    }
    throw Error("Too many attempts trying to find unconnected nodes");
  }

  private addNewNode() {
    const oldCon = takeRandom(this.connectionGenes);
    // Remove old connection
    this.connectionGenes = this.connectionGenes.filter(
      (c) => c.in === oldCon.in && c.out === oldCon.out
    );
    // Add new node
    const newNode = { id: newNodeId(), type: NodeType.hidden };
    this.nodeGenes.push(newNode);
    // Add new connections
    this.connectionGenes.push(
      {
        in: oldCon.in,
        out: newNode.id,
        enabled: true,
        innovation: this.getInnovationNumber(),
        weight: 1,
      },
      {
        in: newNode.id,
        out: oldCon.out,
        enabled: true,
        innovation: this.getInnovationNumber(),
        weight: oldCon.weight,
      }
    );
  }

  public mate(other: Genome, whoIsMoreFit: "a" | "b" | "tie"): Genome {
    const { connectionGenes, nodeGenes } = combineGenomeConnections(
      this,
      other,
      whoIsMoreFit
    );
    return new Genome(
      this.inputLength,
      this.outputLength,
      this.getInnovationNumber,
      nodeGenes,
      connectionGenes
    );
  }
}

export default Genome;

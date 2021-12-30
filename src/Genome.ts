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
  input = "in",
  output = "out",
  hidden = "hid",
}

type HiddenNodeGene = {
  type: NodeType.hidden;
  id: number;
};

type InputNodeGene = {
  type: NodeType.input;
  id: number;
  ndx: number;
};

type OutputNodeGene = {
  type: NodeType.output;
  id: number;
  ndx: number;
};

export type NodeGene = HiddenNodeGene | InputNodeGene | OutputNodeGene;

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

  private initialNodeGenes = () => {
    const nodeGenes: NodeGene[] = [];
    for (let i = 0; i < this.inputLength; i++) {
      nodeGenes.push({ id: newNodeId(), type: NodeType.input, ndx: i });
    }
    for (let i = 0; i < this.outputLength; i++) {
      nodeGenes.push({ id: newNodeId(), type: NodeType.output, ndx: i });
    }
    return nodeGenes;
  };

  private initialConnectionGenes = () => {
    const connectionGenes: ConnectionGene[] = [];
    for (let i = 0; i < this.inputLength; i++) {
      const inId = this.nodeGenes.find(
        (n) => n.type === NodeType.input && n.ndx === i
      ).id;
      for (let j = 0; j < this.outputLength; j++) {
        const outId = this.nodeGenes.find(
          (n) => n.type === NodeType.output && n.ndx === j
        ).id;
        connectionGenes.push({
          enabled: true,
          in: inId,
          out: outId,
          innovation: this.getInnovationNumber(),
          weight: randomWeight(),
        });
      }
    }
    return connectionGenes;
  };

  // TODO: Handle disabled
  // TODO: Unclear if this is best way, look at his code
  public evaluate = (input: number[]): number[] => {
    let depth = 0;
    let complete = false;

    const results: Record<number, { sum: number; left: number }> = {};

    // Determine how many inputs each output node expects
    this.connectionGenes.forEach((con) => {
      if (!results[con.out]) results[con.out] = { sum: 0, left: 0 };
      results[con.out].left++;
    });

    let remainingConnections = [...this.connectionGenes];

    while (remainingConnections.length > 0) {
      if (depth > 100) throw Error("Evaluate depth overflow");
      [...remainingConnections].forEach((con) => {
        const inNode = this.nodeGenes.find((n) => n.id === con.in);
        if (!inNode)
          throw Error(
            `Could not find node for connection ${JSON.stringify(con)}`
          );

        let processed = false;

        switch (inNode.type) {
          case NodeType.input: {
            const v = input[inNode.ndx] * con.weight;
            results[con.out].sum += v;
            results[con.out].left -= 1;
            processed = true;
            break;
          }
          case NodeType.hidden: {
            const inputInfo = results[inNode.id];
            if (inputInfo.left > 0) {
              // Previous nodes still need to run
              break;
            }
            const v = inputInfo.sum * con.weight;
            results[con.out].sum += v;
            results[con.out].left -= 1;
            processed = true;
            break;
          }
        }

        if (processed) {
          remainingConnections = remainingConnections.filter(
            (n) => n.innovation !== con.innovation
          );
        }
      });
      depth++;
    }

    const output: number[] = new Array(this.outputLength);
    for (const node of this.nodeGenes) {
      if (node.type === NodeType.output) {
        output[node.ndx] = results[node.id].sum;
      }
    }

    return output;
  };

  public copy = () => {
    return new Genome(
      this.inputLength,
      this.outputLength,
      this.getInnovationNumber,
      this.nodeGenes,
      this.connectionGenes
    );
  };

  public mutate = (): Genome => {
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
  };

  // TODO: Find a better way to do this, maybe check source code
  private connectNewNodes = () => {
    let attempts = 0;
    const n = this.nodeGenes.length;
    const maxAttempts = (n * (n - 1)) / 2 + 50;
    while (attempts < maxAttempts) {
      const [start, end] = takeRandomPair(this.nodeGenes);
      // output nodes cannot be inputs
      if (start.type === NodeType.output) continue;
      // input nodes cannot be outputs
      if (end.type === NodeType.input) continue;
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
    // TODO: Better solution
    // throw Error("Too many attempts trying to find unconnected nodes");
  };

  private addNewNode = () => {
    const oldCon = takeRandom(this.connectionGenes);
    // Remove old connection
    this.connectionGenes = this.connectionGenes.filter(
      (c) => c.in === oldCon.in && c.out === oldCon.out
    );
    // Add new node
    const newNode = { id: newNodeId(), type: NodeType.hidden } as const;
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
  };

  // TODO: Chance for things to be disabled
  public mate = (other: Genome, whoIsMoreFit: "a" | "b" | "tie"): Genome => {
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
  };
}

export default Genome;

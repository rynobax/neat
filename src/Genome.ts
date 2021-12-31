import { cloneDeep, fill, random } from "lodash";
import type Population from "./Population";
import {
  combineGenomeConnections,
  getWeightTweaker,
  isInputNode,
  isOutputNode,
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

export type HiddenNodeGene = {
  type: NodeType.hidden;
  id: number;
};

export type InputNodeGene = {
  type: NodeType.input;
  id: number;
  ndx: number;
};

export type OutputNodeGene = {
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
    // this is fn because jest did not like circular reference
    private population: () => Population,
    nodeGenes?: NodeGene[],
    connectionGenes?: ConnectionGene[]
  ) {
    this.nodeGenes = nodeGenes || this.initialNodeGenes();
    this.connectionGenes = connectionGenes || this.initialConnectionGenes();
  }

  private initialNodeGenes = () => {
    const nodeGenes: NodeGene[] = [];
    for (let i = 0; i < this.population().inputLength; i++) {
      nodeGenes.push({
        id: this.population().getNodeId({ in: i, out: null }),
        type: NodeType.input,
        ndx: i,
      });
    }
    for (let i = 0; i < this.population().outputLength; i++) {
      nodeGenes.push({
        id: this.population().getNodeId({ in: null, out: i }),
        type: NodeType.output,
        ndx: i,
      });
    }
    return nodeGenes;
  };

  private initialConnectionGenes = () => {
    const connectionGenes: ConnectionGene[] = [];
    for (let i = 0; i < this.population().inputLength; i++) {
      const inId = this.nodeGenes.find(
        (n) => n.type === NodeType.input && n.ndx === i
      ).id;
      for (let j = 0; j < this.population().outputLength; j++) {
        const outId = this.nodeGenes.find(
          (n) => n.type === NodeType.output && n.ndx === j
        ).id;
        connectionGenes.push({
          enabled: true,
          in: inId,
          out: outId,
          innovation: this.population().getInnovationNumber({
            in: inId,
            out: outId,
          }),
          weight: randomWeight(),
        });
      }
    }
    return connectionGenes;
  };

  public evaluate = (input: number[]): number[] => {
    const { activationFn } = this.population().parameters;
    let depth = 0;

    const inputActivations: Record<number, number> = {};
    this.nodeGenes.filter(isInputNode).forEach((node) => {
      inputActivations[node.id] = input[node.ndx];
    });

    const enabledConnections = this.connectionGenes.filter((c) => c.enabled);

    // TODO: Better heuristic?
    const maxLoopDepth = enabledConnections.length * 2;

    const outputNodes = this.nodeGenes.filter(isOutputNode);
    const nonInputNodes = this.nodeGenes.filter(
      (n) => n.type !== NodeType.input
    );

    const activationSums: Record<number, number> = {};
    const activationResults: Record<number, number> = { ...inputActivations };
    let done = false;
    while (!done) {
      for (const node of nonInputNodes) {
        const activeInputConnections = enabledConnections.filter(
          (c) =>
            c.out === node.id &&
            (c.in in activationSums || c.in in inputActivations)
        );
        if (activeInputConnections.length === 0) continue;
        activationSums[node.id] = activeInputConnections.reduce(
          (sum, c) => sum + (activationResults[c.in] || 0) * c.weight,
          0
        );
      }

      Object.entries(activationSums).forEach(([nodeId, sum]) => {
        activationResults[nodeId] = activationFn(sum);
      });

      done = outputNodes.every((n) => n.id in activationResults);

      depth++;
      if (depth > maxLoopDepth) throw Error("Evaluate depth overflow");
    }

    const output: number[] = new Array(this.population().outputLength);
    for (const node of outputNodes) {
      output[node.ndx] = activationResults[node.id];
    }

    return output;
  };

  public copy = () => {
    return new Genome(this.population, this.nodeGenes, this.connectionGenes);
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
      this.addConnection();
    }

    return newGenome;
  };

  // TODO: Find a better way to do this, maybe check source code
  // TODO: Can this generate circular dependencies?
  addConnection = () => {
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
        this.connectionGenes.push({
          enabled: true,
          in: start.id,
          innovation: this.population().getInnovationNumber({
            in: start.id,
            out: end.id,
          }),
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

  addNewNode = () => {
    const oldCon = takeRandom(this.connectionGenes);
    // Remove old connection
    this.connectionGenes = this.connectionGenes.filter(
      (c) => c.innovation !== oldCon.innovation
    );
    // Add new node
    const newNode = {
      id: this.population().getNodeId({ in: oldCon.in, out: oldCon.out }),
      type: NodeType.hidden,
    } as const;
    this.nodeGenes.push(newNode);
    // Add new connections
    this.connectionGenes.push(
      {
        in: oldCon.in,
        out: newNode.id,
        enabled: true,
        innovation: this.population().getInnovationNumber({
          in: oldCon.in,
          out: newNode.id,
        }),
        weight: 1,
      },
      {
        in: newNode.id,
        out: oldCon.out,
        enabled: true,
        innovation: this.population().getInnovationNumber({
          in: newNode.id,
          out: oldCon.out,
        }),
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
    return new Genome(this.population, nodeGenes, connectionGenes);
  };
}

export default Genome;

import { random } from "lodash";
import type Population from "./Population";
import {
  combineGenomeConnections,
  getWeightTweaker,
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

  // TODO: Handle disabled
  // TODO: Unclear if this is best way, look at his code
  public evaluate = (input: number[]): number[] => {
    let depth = 0;

    const results: Record<number, { sum: number; left: number }> = {};

    // Determine how many inputs each output node expects
    this.connectionGenes.forEach((con) => {
      if (!results[con.out]) results[con.out] = { sum: 0, left: 0 };
      results[con.out].left++;
    });

    let remainingConnections = [...this.connectionGenes];

    while (remainingConnections.length > 0) {
      // TODO: Base off age
      if (depth > 10000) throw Error("Evaluate depth overflow");
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
            if (!inputInfo) {
              // TODO: Multiple identical nodes are getting added
              // TODO: Hidden nodes aren't connected to rest of graph
              console.log(inNode);
              console.log(results);
              console.log(this.nodeGenes);
              console.log(this.connectionGenes);
              throw Error(`Missing results for ${JSON.stringify(inNode)}`);
            }
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

    const output: number[] = new Array(this.population().outputLength);
    for (const node of this.nodeGenes) {
      if (node.type === NodeType.output) {
        output[node.ndx] = results[node.id].sum;
      }
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

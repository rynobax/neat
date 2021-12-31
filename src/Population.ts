import Genome from "./Genome";
import { DEFAULT_MODEL_PARAMETERS, ModelParameters } from "./params";
import {
  percentChance,
  takeRandomPair,
  takeRandom,
  computeNextSpecies,
} from "./util";

export interface Specie {
  id: string;
  members: Genome[];
  numOfChildren: number;
}

class Trainer {
  genomes: Genome[];

  species: Specie[] = [];

  parameters: ModelParameters;

  constructor(
    public inputLength: number,
    public outputLength: number,
    public measureFitness: (genome: Genome) => number,
    parameters: Partial<ModelParameters> | undefined
  ) {
    this.parameters = { ...DEFAULT_MODEL_PARAMETERS, ...parameters };

    const initialGenomes: Genome[] = [];
    for (let i = 0; i < this.parameters.populationSize; i++) {
      initialGenomes.push(new Genome(() => this));
    }
    this.genomes = initialGenomes;
  }

  public run = () => {
    for (let i = 0; i < this.parameters.generations; i++) {
      console.log("evolution ", i, this.genomes.length, this.species.length);
      this.evolve();
    }

    let best;
    let bestScore = 0;

    for (const g of this.genomes) {
      const score = this.measureFitness(g);
      if (score > bestScore) {
        best = g;
        bestScore = score;
      }
    }
    return best;
  };

  // TODO: Handle champion
  // TODO: Handle population failing to increase over time (only take top 2)
  // TODO: Interspecies mating
  private evolve = () => {
    this.startNewGenerationInnovation();
    const nextSpecies = computeNextSpecies(
      this.species,
      this.genomes,
      this.parameters,
      this.measureFitness
    );
    this.species = nextSpecies;
    const newGenomes: Genome[] = [];

    for (const species of nextSpecies) {
      for (let i = 0; i < species.numOfChildren; i++) {
        // TODO: What to do if only 1 child
        const shouldMate = percentChance(75) && species.members.length >= 2;
        if (shouldMate) {
          // mating
          const [a, b] = takeRandomPair(species.members);
          const aFitness = this.measureFitness(a);
          const bFitness = this.measureFitness(b);
          let whoIsMoreFit: "a" | "b" | "tie" = "tie";
          if (aFitness > bFitness) whoIsMoreFit = "a";
          if (bFitness > aFitness) whoIsMoreFit = "b";
          newGenomes.push(a.mate(b, whoIsMoreFit));
        } else {
          const parent = takeRandom(species.members);
          newGenomes.push(parent.copy().mutate());
        }
      }
    }

    this.genomes = newGenomes;
  };

  startNewGenerationInnovation() {
    this.generationalInnovations = [];
    this.generationalNodes = [];
  }

  private generationalInnovations: {
    in: number;
    out: number;
    innovation: number;
  }[] = [];
  private innovation = 0;

  public getInnovationNumber = (newConnection: { in: number; out: number }) => {
    const existingInnovation = this.generationalInnovations.find(
      (i) => i.in === newConnection.in && i.out === newConnection.out
    );
    if (existingInnovation) return existingInnovation.innovation;
    this.innovation++;
    this.generationalInnovations.push({
      ...newConnection,
      innovation: this.innovation,
    });
    return this.innovation;
  };

  private generationalNodes: {
    in: number | null;
    out: number | null;
    id: number;
  }[] = [];
  private nodeId = 10000;

  public getNodeId = (newNode: { in: number | null; out: number | null }) => {
    const existingNode = this.generationalNodes.find(
      (i) => i.in === newNode.in && i.out === newNode.out
    );
    if (existingNode) return existingNode.id;
    this.nodeId++;
    this.generationalNodes.push({
      ...newNode,
      id: this.nodeId,
    });
    return this.nodeId;
  };
}

export default Trainer;

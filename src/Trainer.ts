import { at, random } from "lodash";
import { v4 as uuid } from "uuid";
import Genome from "./Genome";
import { DEFAULT_MODEL_PARAMETERS } from "./params";
import {
  percentChance,
  takeRandomPair,
  takeRandom,
  randomWeight,
  getWeightTweaker,
  isInSpecie,
} from "./util";

export type ModelParameters = typeof DEFAULT_MODEL_PARAMETERS;

export interface Specie {
  id: string;
  rep: Genome;
}

interface SpeciesGroup {
  id: string;
  members: Genome[];
  numOfChildren: number;
}

class Trainer {
  genomes: Genome[];

  species: Specie[];

  parameters: ModelParameters;

  innovation = 1;

  constructor(
    private inputLength: number,
    private outputLength: number,
    private measureFitness: (genome: Genome) => number,
    parameters: Partial<ModelParameters> | undefined
  ) {
    this.parameters = { ...DEFAULT_MODEL_PARAMETERS, ...parameters };

    const initialGenomes: Genome[] = [];
    for (let i = 0; i < this.parameters.populationSize; i++) {
      initialGenomes.push(
        new Genome(
          this.inputLength,
          this.outputLength,
          this.getInnovationNumber
        )
      );
    }
    this.genomes = initialGenomes;
  }

  public run() {
    for (let i = 0; i < 10; i++) {
      this.evolve();
    }
  }

  // TODO: Handle champion
  // TODO: Handle population failing to increase over time
  // TODO: Interspecies mating
  private evolve() {
    const speciesGroups = this.computeSpeciesGroups();
    const newGenomes: Genome[] = [];

    for (const species of speciesGroups) {
      for (let i = 0; i < species.numOfChildren; i++) {
        // TODO: Make genomes do something

        const shouldMate = percentChance(75);
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
  }

  private computeSpeciesGroups() {
    const speciesGroups = this.species.reduce<Record<string, SpeciesGroup>>(
      (p, c) => {
        p[c.id] = { id: c.id, members: [], numOfChildren: 0 };
        return p;
      },
      {}
    );
    for (const genome of this.genomes) {
      let found = false;
      for (const specie of this.species) {
        if (isInSpecie(genome, specie, this.parameters)) {
          // add to group
          speciesGroups[specie.id];
          found = true;
          break;
        }
      }

      if (!found) {
        // make new group
        const newSpecie: SpeciesGroup = {
          id: uuid(),
          members: [genome],
          numOfChildren: 0,
        };
        speciesGroups[newSpecie.id] = newSpecie;
      }
    }

    const groupFitnessValues: Record<string, number> = {};

    const sumOfAdjFitnessAvgs = Object.values(speciesGroups).reduce(
      (sum, specie) => {
        const groupAdjFitnessSum = specie.members.reduce((sum, genome) => {
          const rawFitness = this.measureFitness(genome);
          const adjFitness = rawFitness / specie.members.length;
          return sum + adjFitness;
        }, 0);
        groupFitnessValues[specie.id] = groupAdjFitnessSum;
        return sum + groupAdjFitnessSum;
      },
      0
    );

    Object.values(speciesGroups).forEach((specie) => {
      const fitness = groupFitnessValues[specie.id];
      const pct = fitness / sumOfAdjFitnessAvgs;
      specie.numOfChildren = Math.round(pct * this.parameters.populationSize);
    });

    return Object.values(speciesGroups);
  }

  // TODO: Implement

  private getInnovationNumber() {
    this.innovation++;
    return this.innovation;
  }
}

export default Trainer;

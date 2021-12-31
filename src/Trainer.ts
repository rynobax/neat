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

  species: Specie[] = [];

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

  public run = () => {
    for (let i = 0; i < 3; i++) {
      console.log("evolution ", i, this.genomes.length);
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
    const speciesGroups = this.computeSpeciesGroups();
    console.log("after evolution x species: ", speciesGroups.length);
    this.species = speciesGroups.map((s) => ({
      id: s.id,
      rep: takeRandom(s.members),
    }));
    const newGenomes: Genome[] = [];

    for (const species of speciesGroups) {
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

  // TODO: Keeping around old species is causing everything to go to 0
  // TODO: May need to remove old species at some point
  private computeSpeciesGroups = () => {
    const speciesToLookThrough = [...this.species];

    const speciesGroups = this.species.reduce<Record<string, SpeciesGroup>>(
      (p, c) => {
        p[c.id] = { id: c.id, members: [], numOfChildren: 0 };
        return p;
      },
      {}
    );
    for (const genome of this.genomes) {
      let found = false;
      for (const specie of speciesToLookThrough) {
        if (isInSpecie(genome, specie, this.parameters)) {
          // add to group
          speciesGroups[specie.id];
          found = true;
          break;
        }
      }

      if (!found) {
        // make new group
        const id = uuid();
        const newSpecie: SpeciesGroup = {
          id,
          members: [genome],
          numOfChildren: 0,
        };
        speciesGroups[newSpecie.id] = newSpecie;
        speciesToLookThrough.push({ id, rep: genome });
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
      if (fitness === 0) return;
      const pct = fitness / sumOfAdjFitnessAvgs;
      specie.numOfChildren = Math.round(pct * this.parameters.populationSize);
    });

    return Object.values(speciesGroups);
  };

  // TODO: Implement

  private getInnovationNumber = () => {
    this.innovation++;
    return this.innovation;
  };
}

export default Trainer;

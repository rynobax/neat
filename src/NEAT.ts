import Genome from "./Genome";
import Population, { ModelParameters } from "./Population";

interface NEATOptions {
  inputLength: number;
  measureFitness: (genome: Genome) => number;
  outputLength: number;
  parameters?: Partial<ModelParameters>;
}

class NEAT {
  inputLength: number;

  private measureFitness: (genome: Genome) => number;

  outputLength: number;

  private parameters: Partial<ModelParameters> | undefined;

  constructor({
    inputLength,
    measureFitness,
    outputLength,
    parameters,
  }: NEATOptions) {
    this.inputLength = inputLength;
    this.measureFitness = measureFitness;
    this.outputLength = outputLength;
    this.parameters = parameters;
  }

  private topGenome: Genome;

  public evaluateWithBestModel = (input: number[]): number[] => {
    if (!this.topGenome) throw Error("Model has not been trained");
    return this.topGenome.evaluate(input);
  };

  public train = () => {
    const population = new Population(
      this.inputLength,
      this.outputLength,
      this.measureFitness,
      this.parameters
    );

    const best = population.run();

    this.topGenome = best;
  };
}

export default NEAT;

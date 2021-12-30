import Genome from "./Genome";
import Trainer, { ModelParameters } from "./Trainer";

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
    const trainer = new Trainer(
      this.inputLength,
      this.outputLength,
      this.measureFitness,
      this.parameters
    );

    const best = trainer.run();

    this.topGenome = best;
  };
}

export default NEAT;

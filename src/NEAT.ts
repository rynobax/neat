type FitnessScore = number;

interface NEATOptions<Input, Output> {
  measureFitness: (genome: Genome<Input, Output>) => FitnessScore;
}

class NEAT<Input, Output> {
  private measureFitness: (genome: Genome<Input, Output>) => number;

  constructor({ measureFitness }: NEATOptions<Input, Output>) {
    this.measureFitness = measureFitness;
  }

  private topGenome: Genome<Input, Output>;

  public train() {
    this.topGenome = new Genome();
  }

  public evaluateWithBestModel(input: Input): Output {
    if (!this.topGenome) throw Error("Model has not been trained");
    return this.topGenome.evaluate(input);
  }
}

class Genome<Input, Output> {
  public evaluate(input: Input): Output {
    return null;
  }
}

export default NEAT;

import NEAT from "../src";

const TRAINING_INPUT: Array<[number, number]> = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

const TRAINING_OUTPUT: Array<[number]> = [[0], [0], [0], [1]];

async function main() {
  const neat = new NEAT<[number, number], [number]>({
    measureFitness: (genome) => {
      let score = 0;
      for (let i = 0; i < TRAINING_INPUT.length; i++) {
        const input = TRAINING_INPUT[i];
        const [expectedOutput] = TRAINING_OUTPUT[i];
        const [neatOutput] = genome.evaluate(input);
        const diff = expectedOutput - neatOutput;
        // we did good, diff is 0.1
        // we did bad, diff is 0.8
        score += diff;
      }
      score = 4 - score;
      score = Math.pow(score, 2);
      return score;
    },
  });

  neat.train();

  for (let i = 0; i < TRAINING_INPUT.length; i++) {
    const input = TRAINING_INPUT[i];
    const expectedOutput = TRAINING_OUTPUT[i];
    const neatOutput = neat.evaluateWithBestModel(input);
    console.log(
      `${input} - expected: ${expectedOutput} - result: ${neatOutput}`
    );
  }
}

main();

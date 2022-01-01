import { shuffle } from "lodash";
import NEAT from "../src";

const AND_TRAINING_INPUT: Array<[number, number]> = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

const AND_TRAINING_OUTPUT: Array<[number]> = [[0], [0], [0], [1]];

const XOR_TRAINING_INPUT: Array<[number, number]> = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

const XOR_TRAINING_OUTPUT: Array<[number]> = [[0], [1], [1], [0]];

const TRAINING_DATA = () =>
  shuffle(
    AND_TRAINING_INPUT.map((_, i) => ({
      input: AND_TRAINING_INPUT[i],
      output: AND_TRAINING_OUTPUT[i],
    }))
  );

async function main() {
  const neat = new NEAT({
    measureFitness: (genome) => {
      let score = 0;
      for (const { input, output } of TRAINING_DATA()) {
        const [expectedOutput] = output;
        const [neatOutput] = genome.evaluate(input);
        const diff = Math.abs(expectedOutput - neatOutput);
        // we did good, diff is 0.1
        // we did bad, diff is 0.8
        score += diff;
      }
      score = 4 - score;
      score = Math.pow(score, 2);
      return score;
    },
    inputLength: 2,
    outputLength: 1,
    parameters: {
      populationSize: 100,
      generations: 200,
    },
  });

  neat.train();

  for (const { input, output } of TRAINING_DATA()) {
    const neatOutput = neat.evaluateWithBestModel(input);
    console.log(`${input} - expected: ${output[0]} - result: ${neatOutput[0]}`);
  }
}

main();

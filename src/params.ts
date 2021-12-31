const SIGMOID = (x: number) => 1 / (1 + Math.E ** (-4.9 * x));

export const DEFAULT_MODEL_PARAMETERS = {
  // 1
  c1: 1,
  // 1
  c2: 1,
  // 0.4
  c3: 0.4,
  // 150
  populationSize: 150,
  // 3
  speciesThreshold: 3,
  // ?
  generations: 50,
  // SIGMOID
  activationFn: SIGMOID,
};

export type ModelParameters = typeof DEFAULT_MODEL_PARAMETERS;

import Population from "../Population";

describe("getInnovationNumber", () => {
  test("returns bigger number each time", () => {
    const population = new Population(1, 1, () => 1, {});
    population.startNewGenerationInnovation();

    const a = population.getInnovationNumber({ in: 1, out: 2 });
    const b = population.getInnovationNumber({ in: 3, out: 4 });
    const c = population.getInnovationNumber({ in: 5, out: 6 });

    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  test("same innovation gets same number", () => {
    const population = new Population(1, 1, () => 1, {});
    population.startNewGenerationInnovation();

    const a = population.getInnovationNumber({ in: 1, out: 2 });
    const b = population.getInnovationNumber({ in: 1, out: 2 });

    expect(a).toEqual(b);
  });

  test("same innovation on different generation gets different number", () => {
    const population = new Population(1, 1, () => 1, {});
    population.startNewGenerationInnovation();

    const a = population.getInnovationNumber({ in: 1, out: 2 });

    population.startNewGenerationInnovation();

    const b = population.getInnovationNumber({ in: 1, out: 2 });

    expect(b).toBeGreaterThan(a);
  });
});

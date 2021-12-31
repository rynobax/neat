import Trainer from "../Trainer";

describe("getInnovationNumber", () => {
  test("returns bigger number each time", () => {
    const trainer = new Trainer(1, 1, () => 1, {});
    trainer.startNewGenerationInnovation();

    const a = trainer.getInnovationNumber({ in: 1, out: 2 });
    const b = trainer.getInnovationNumber({ in: 3, out: 4 });
    const c = trainer.getInnovationNumber({ in: 5, out: 6 });

    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  test("same innovation gets same number", () => {
    const trainer = new Trainer(1, 1, () => 1, {});
    trainer.startNewGenerationInnovation();

    const a = trainer.getInnovationNumber({ in: 1, out: 2 });
    const b = trainer.getInnovationNumber({ in: 1, out: 2 });

    expect(a).toEqual(b);
  });

  test("same innovation on different generation gets different number", () => {
    const trainer = new Trainer(1, 1, () => 1, {});
    trainer.startNewGenerationInnovation();

    const a = trainer.getInnovationNumber({ in: 1, out: 2 });

    trainer.startNewGenerationInnovation();

    const b = trainer.getInnovationNumber({ in: 1, out: 2 });

    expect(b).toBeGreaterThan(a);
  });
});

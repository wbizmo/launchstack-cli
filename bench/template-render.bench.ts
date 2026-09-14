import { bench, describe } from "vitest";
import { renderTemplate } from "../src/generator/template";

const variables = Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => [
    `VALUE_${index}`,
    `replacement-${index}`
  ])
);

const mediumTemplate = Array.from(
  { length: 2_000 },
  (_, index) => `line-${index}: {{VALUE_${index % 100}}}`
).join("\n");

const largeTemplate = mediumTemplate.repeat(20);

describe("template renderer", () => {
  bench("medium template / 100 variables", () => {
    renderTemplate(mediumTemplate, variables);
  });

  bench("large template / 100 variables", () => {
    renderTemplate(largeTemplate, variables);
  });
});

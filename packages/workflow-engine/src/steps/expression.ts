import jsonata from "jsonata";
import type { NodeHandler } from "../types";

/**
 * `condition`/`transform` nodes use JSONata (a sandboxed expression
 * language, no `eval`) so workflows built in the visual builder stay safe
 * to author without engineering review.
 */
export const transformStepHandler: NodeHandler = async (node, input, state) => {
  if (node.type !== "transform") throw new Error("transformStepHandler received a non-transform node");
  const expression = jsonata(node.expression as string);
  const output = await expression.evaluate({ input, state });
  return { type: "ok", output };
};

/** Evaluates a condition's boolean expression; used by the engine to pick an outgoing edge, not as a standalone step output. */
export async function evaluateCondition(expressionText: string, input: unknown, state: Record<string, unknown>): Promise<boolean> {
  const expression = jsonata(expressionText);
  const result = await expression.evaluate({ input, state });
  return Boolean(result);
}

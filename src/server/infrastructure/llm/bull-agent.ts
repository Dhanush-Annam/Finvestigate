import { callGeminiStructuredJSONWithStats, type LLMCallResult } from "./provider.js";
import { BULL_AGENT_SYSTEM_PROMPT } from "./prompts.js";
import { BullAgentOutputSchema, type BullAgentOutput, type EvidencePack } from "./types.js";

export interface AgentRunResult<T> {
  output: T | null;
  rawJson: unknown | null;
  schemaValid: boolean;
  grounded: boolean;
  ungroundedRefs: string[];
  stats: LLMCallResult<unknown>["stats"];
  selfCorrected?: boolean;
  error?: string;
}

export async function runBullAgent(
  evidencePack: EvidencePack,
  overrideModel?: string
): Promise<BullAgentOutput | null> {
  const res = await runBullAgentWithDetails(evidencePack, overrideModel);
  return res.output;
}

export async function runBullAgentWithDetails(
  evidencePack: EvidencePack,
  overrideModel?: string
): Promise<AgentRunResult<BullAgentOutput>> {
  const userPrompt = JSON.stringify({
    company: evidencePack.company,
    availableEvidence: evidencePack.evidenceCatalog,
  }, null, 2);

  const callResult = await callGeminiStructuredJSONWithStats<unknown>(
    BULL_AGENT_SYSTEM_PROMPT,
    userPrompt,
    8000,
    overrideModel
  );

  if (!callResult.data) {
    return {
      output: null,
      rawJson: null,
      schemaValid: false,
      grounded: false,
      ungroundedRefs: [],
      stats: callResult.stats,
      error: callResult.error || "LLM call returned null",
    };
  }

  const parseResult = BullAgentOutputSchema.safeParse(callResult.data);
  if (!parseResult.success) {
    console.warn("[Bull Agent Validation Error]", parseResult.error.format());
    return {
      output: null,
      rawJson: callResult.data,
      schemaValid: false,
      grounded: false,
      ungroundedRefs: [],
      stats: callResult.stats,
      error: "Zod Schema Validation Failed",
    };
  }

  const output = parseResult.data;
  const ungroundedRefs: string[] = [];

  // Validate every evidenceRef against EvidenceRegistry
  for (const arg of output.arguments) {
    for (const refId of arg.evidenceRefs) {
      if (!evidencePack.evidenceRegistry[refId]) {
        ungroundedRefs.push(refId);
      }
    }
  }

  // 1-Turn Automated Citation Self-Correction Loop
  if (ungroundedRefs.length > 0) {
    console.warn(`[Bull Agent Registry Rejection] Un-grounded refs: ${ungroundedRefs.join(", ")}. Initiating 1-turn automated self-correction.`);

    const correctionPrompt = `Citation verification gate rejected your response due to ${ungroundedRefs.length} ungrounded citation reference(s):
${ungroundedRefs.map((r) => `  - Ref "${r}" does not exist in the Evidence Pack.`).join("\n")}

CRITICAL CORRECTION INSTRUCTION:
Revise your arguments. You MUST ONLY cite exact reference IDs that exist in the following availableEvidence catalog:
${JSON.stringify(evidencePack.evidenceCatalog, null, 2)}
Respond with corrected JSON conforming to the exact schema.`;

    const retryResult = await callGeminiStructuredJSONWithStats<unknown>(
      BULL_AGENT_SYSTEM_PROMPT,
      correctionPrompt,
      8000,
      overrideModel
    );

    if (retryResult.data) {
      const retryParsed = BullAgentOutputSchema.safeParse(retryResult.data);
      if (retryParsed.success) {
        const retryUngrounded: string[] = [];
        for (const arg of retryParsed.data.arguments) {
          for (const refId of arg.evidenceRefs) {
            if (!evidencePack.evidenceRegistry[refId]) {
              retryUngrounded.push(refId);
            }
          }
        }
        if (retryUngrounded.length === 0) {
          console.log("[Bull Agent Self-Correction] Successfully corrected citations on turn 2.");
          return {
            output: retryParsed.data,
            rawJson: retryResult.data,
            schemaValid: true,
            grounded: true,
            ungroundedRefs: [],
            stats: retryResult.stats,
            selfCorrected: true,
          };
        }
      }
    }

    return {
      output: null,
      rawJson: callResult.data,
      schemaValid: true,
      grounded: false,
      ungroundedRefs,
      stats: callResult.stats,
      error: `Ungrounded evidence reference IDs: ${ungroundedRefs.join(", ")}`,
    };
  }

  return {
    output,
    rawJson: callResult.data,
    schemaValid: true,
    grounded: true,
    ungroundedRefs: [],
    stats: callResult.stats,
  };
}

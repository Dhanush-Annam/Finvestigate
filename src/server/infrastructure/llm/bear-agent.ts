import { callGeminiStructuredJSONWithStats, type LLMCallResult } from "./provider.js";
import { BEAR_AGENT_SYSTEM_PROMPT } from "./prompts.js";
import { BearAgentOutputSchema, type BearAgentOutput, type BullAgentOutput, type EvidencePack } from "./types.js";
import type { AgentRunResult } from "./bull-agent.js";

function validateBearArgumentsGrounding(
  args: BearAgentOutput["arguments"],
  evidenceRegistry: EvidencePack["evidenceRegistry"]
): { ungroundedRefs: string[]; periodMismatches: string[] } {
  const ungroundedRefs: string[] = [];
  const periodMismatches: string[] = [];

  for (const arg of args) {
    const claimFys = Array.from(`${arg.claim} ${arg.reasoning}`.matchAll(/\bFY(20\d{2})\b/gi), (m) => m[1]);

    for (const refId of arg.evidenceRefs) {
      const entry = evidenceRegistry[refId];
      if (!entry) {
        ungroundedRefs.push(refId);
      } else if (claimFys.length > 0 && entry.periodLabel) {
        const entryFyMatch = entry.periodLabel.match(/\bFY(20\d{2})\b/i);
        if (entryFyMatch && !claimFys.includes(entryFyMatch[1])) {
          periodMismatches.push(
            `Claim refers to period FY${claimFys[0]}, but cited reference "${refId}" is for period ${entry.periodLabel}`
          );
        }
      }
    }
  }

  return { ungroundedRefs, periodMismatches };
}

export async function runBearAgent(
  evidencePack: EvidencePack,
  validatedBullOutput?: BullAgentOutput,
  overrideModel?: string
): Promise<BearAgentOutput | null> {
  const res = await runBearAgentWithDetails(evidencePack, validatedBullOutput, overrideModel);
  return res.output;
}

export async function runBearAgentWithDetails(
  evidencePack: EvidencePack,
  validatedBullOutput?: BullAgentOutput,
  overrideModel?: string
): Promise<AgentRunResult<BearAgentOutput>> {
  const userPrompt = JSON.stringify({
    company: evidencePack.company,
    availableEvidence: evidencePack.evidenceCatalog,
    bullCaseToChallenge: validatedBullOutput ? validatedBullOutput.arguments : undefined,
  }, null, 2);

  const callResult = await callGeminiStructuredJSONWithStats<unknown>(
    BEAR_AGENT_SYSTEM_PROMPT,
    userPrompt,
    20000,
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

  const parseResult = BearAgentOutputSchema.safeParse(callResult.data);
  if (!parseResult.success) {
    console.warn("[Bear Agent Validation Error]", parseResult.error.format());
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
  const initialCheck = validateBearArgumentsGrounding(output.arguments, evidencePack.evidenceRegistry);

  // 1-Turn Automated Citation & Temporal Self-Correction Loop
  if (initialCheck.ungroundedRefs.length > 0 || initialCheck.periodMismatches.length > 0) {
    const errorDetails: string[] = [];
    if (initialCheck.ungroundedRefs.length > 0) {
      errorDetails.push(...initialCheck.ungroundedRefs.map((r) => `  - Ref "${r}" does not exist in the Evidence Pack.`));
    }
    if (initialCheck.periodMismatches.length > 0) {
      errorDetails.push(...initialCheck.periodMismatches.map((m) => `  - Temporal mismatch: ${m}. You must cite matching period evidence.`));
    }

    console.warn(`[Bear Agent Registry Rejection] Issues found:\n${errorDetails.join("\n")}. Initiating 1-turn automated self-correction.`);

    const correctionPrompt = `Citation verification gate rejected your response due to ${errorDetails.length} citation error(s):
${errorDetails.join("\n")}

CRITICAL CORRECTION INSTRUCTION:
Revise your counter-arguments.
1. You MUST ONLY cite exact reference IDs that exist in the following availableEvidence catalog:
${JSON.stringify(evidencePack.evidenceCatalog, null, 2)}
2. Every cited reference ID MUST match the fiscal period discussed in your claim (e.g. if discussing FY2025, cite evidence for FY2025, not FY2024).
Respond with corrected JSON conforming to the exact schema.`;

    const retryResult = await callGeminiStructuredJSONWithStats<unknown>(
      BEAR_AGENT_SYSTEM_PROMPT,
      correctionPrompt,
      20000,
      overrideModel
    );

    if (retryResult.data) {
      const retryParsed = BearAgentOutputSchema.safeParse(retryResult.data);
      if (retryParsed.success) {
        const retryCheck = validateBearArgumentsGrounding(retryParsed.data.arguments, evidencePack.evidenceRegistry);
        if (retryCheck.ungroundedRefs.length === 0 && retryCheck.periodMismatches.length === 0) {
          console.log("[Bear Agent Self-Correction] Successfully corrected citations on turn 2.");
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
      ungroundedRefs: [...initialCheck.ungroundedRefs, ...initialCheck.periodMismatches],
      stats: callResult.stats,
      error: `Citation errors: ${errorDetails.join("; ")}`,
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

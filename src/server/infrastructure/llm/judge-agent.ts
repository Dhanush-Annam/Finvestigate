import { callGeminiStructuredJSONWithStats, type LLMCallResult } from "./provider.js";
import { JUDGE_AGENT_SYSTEM_PROMPT } from "./prompts.js";
import { JudgeAgentOutputSchema, type BullAgentOutput, type BearAgentOutput, type EvidencePack, type JudgeAgentOutput } from "./types.js";
import type { AgentRunResult } from "./bull-agent.js";

export async function runJudgeAgent(
  evidencePack: EvidencePack,
  bullOutput: BullAgentOutput,
  bearOutput: BearAgentOutput,
  overrideModel?: string
): Promise<JudgeAgentOutput | null> {
  const res = await runJudgeAgentWithDetails(evidencePack, bullOutput, bearOutput, overrideModel);
  return res.output;
}

export async function runJudgeAgentWithDetails(
  evidencePack: EvidencePack,
  bullOutput: BullAgentOutput,
  bearOutput: BearAgentOutput,
  overrideModel?: string
): Promise<AgentRunResult<JudgeAgentOutput>> {
  const userPrompt = JSON.stringify({
    company: evidencePack.company,
    availableEvidence: evidencePack.evidenceCatalog,
    bullCase: bullOutput.arguments,
    bearCase: bearOutput.arguments,
  }, null, 2);

  const callResult = await callGeminiStructuredJSONWithStats<unknown>(
    JUDGE_AGENT_SYSTEM_PROMPT,
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

  const parseResult = JudgeAgentOutputSchema.safeParse(callResult.data);
  if (!parseResult.success) {
    console.warn("[Judge Agent Validation Error]", parseResult.error.format());
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

  // 1. Verify unresolvedQuestionEvidenceRefs against EvidenceRegistry
  for (const refId of output.unresolvedQuestionEvidenceRefs) {
    if (!evidencePack.evidenceRegistry[refId]) {
      ungroundedRefs.push(refId);
    }
  }

  // 2. Verify all other referenced evidence IDs
  for (const refId of output.evidenceRefs) {
    if (!evidencePack.evidenceRegistry[refId]) {
      ungroundedRefs.push(refId);
    }
  }

  if (ungroundedRefs.length > 0) {
    console.warn(`[Judge Agent Registry Rejection] Un-grounded refs: ${ungroundedRefs.join(", ")}. Initiating 1-turn automated self-correction.`);

    const correctionPrompt = `Citation verification gate rejected your verdict due to ${ungroundedRefs.length} ungrounded citation reference(s):
${ungroundedRefs.map((r) => `  - Ref "${r}" does not exist in the Evidence Pack.`).join("\n")}

CRITICAL CORRECTION INSTRUCTION:
Revise your adjudication. In "unresolvedQuestionEvidenceRefs" and "evidenceRefs", you MUST ONLY cite exact reference IDs that exist in the following availableEvidence catalog:
${JSON.stringify(evidencePack.evidenceCatalog, null, 2)}
Respond with corrected JSON conforming to the exact schema.`;

    const retryResult = await callGeminiStructuredJSONWithStats<unknown>(
      JUDGE_AGENT_SYSTEM_PROMPT,
      correctionPrompt,
      20000,
      overrideModel
    );

    if (retryResult.data) {
      const retryParsed = JudgeAgentOutputSchema.safeParse(retryResult.data);
      if (retryParsed.success) {
        const retryUngrounded: string[] = [];
        for (const refId of retryParsed.data.unresolvedQuestionEvidenceRefs) {
          if (!evidencePack.evidenceRegistry[refId]) {
            retryUngrounded.push(refId);
          }
        }
        for (const refId of retryParsed.data.evidenceRefs) {
          if (!evidencePack.evidenceRegistry[refId]) {
            retryUngrounded.push(refId);
          }
        }
        if (retryUngrounded.length === 0) {
          console.log("[Judge Agent Self-Correction] Successfully corrected citations on turn 2.");
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

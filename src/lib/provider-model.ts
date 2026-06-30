import type { Model } from "~/services/copilot/get-models"

export interface ProviderModelAlias {
  model: string
  provider: string
}

const OPENAI_RESPONSES_MODEL_PATTERN = /^gpt-(\d+)(?:\.(\d+))?(?:[-._].*)?$/iu
const OPENAI_RESPONSES_ENDPOINT = "/responses"
const OPENAI_RESPONSES_ENDPOINTS = [OPENAI_RESPONSES_ENDPOINT, "/v1/responses"]

export const parseProviderModelAlias = (
  model: string,
): ProviderModelAlias | null => {
  const separatorIndex = model.indexOf("/")
  if (separatorIndex <= 0 || separatorIndex === model.length - 1) {
    return null
  }

  const provider = model.slice(0, separatorIndex).trim()
  const providerModel = model.slice(separatorIndex + 1).trim()
  if (!provider || !providerModel) {
    return null
  }

  return {
    model: providerModel,
    provider,
  }
}

export const createFallbackModel = (modelId: string): Model => ({
  capabilities: {
    family: "provider",
    limits: {},
    object: "model_capabilities",
    supports: {},
    tokenizer: "o200k_base",
    type: "chat",
  },
  id: modelId,
  model_picker_enabled: false,
  name: modelId,
  object: "model",
  preview: false,
  vendor: "provider",
  version: "unknown",
})

export const isOpenAIResponsesBridgeModel = (modelId: string): boolean => {
  const match = OPENAI_RESPONSES_MODEL_PATTERN.exec(modelId.trim())
  if (!match) {
    return false
  }

  const major = Number.parseInt(match[1], 10)
  const minor = match[2] ? Number.parseInt(match[2], 10) : 0
  return major > 5 || (major === 5 && minor >= 4)
}

export const createOpenAIResponsesBridgeModel = (modelId: string): Model => {
  const model = createFallbackModel(modelId)

  return {
    ...model,
    capabilities: {
      ...model.capabilities,
      family: "gpt",
      limits: {
        ...model.capabilities.limits,
        max_context_window_tokens: 272_000,
        max_output_tokens: 128_000,
        max_prompt_tokens: 272_000,
      },
      supports: {
        ...model.capabilities.supports,
        adaptive_thinking: true,
        parallel_tool_calls: true,
        reasoning_effort: ["minimal", "low", "medium", "high", "xhigh"],
        streaming: true,
        tool_calls: true,
        vision: true,
      },
    },
    model_picker_enabled: true,
    preview: false,
    supported_endpoints: [OPENAI_RESPONSES_ENDPOINT],
    vendor: "openai",
    version: "responses-bridge",
  }
}

export const ensureOpenAIResponsesBridgeModel = (
  modelId: string,
  selectedModel: Model | undefined,
): Model | undefined => {
  if (!isOpenAIResponsesBridgeModel(modelId)) {
    return selectedModel
  }

  if (!selectedModel) {
    return createOpenAIResponsesBridgeModel(modelId)
  }

  const supportedEndpoints = selectedModel.supported_endpoints ?? []
  if (
    OPENAI_RESPONSES_ENDPOINTS.some((endpoint) =>
      supportedEndpoints.includes(endpoint),
    )
  ) {
    return selectedModel
  }

  return {
    ...selectedModel,
    supported_endpoints: [...supportedEndpoints, OPENAI_RESPONSES_ENDPOINT],
  }
}

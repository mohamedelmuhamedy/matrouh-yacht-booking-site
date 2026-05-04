const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const WORKING_MODEL_TTL_MS = 60 * 60 * 1000;

export const DEFAULT_FREE_OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";

export type FreeOpenRouterModel = {
  id: string;
  name: string;
  contextLength?: number;
};

type OpenRouterModelResponse = {
  data?: Array<{
    id?: unknown;
    name?: unknown;
    context_length?: unknown;
    pricing?: { prompt?: unknown };
  }>;
};

const FALLBACK_FREE_MODELS: FreeOpenRouterModel[] = [
  { id: DEFAULT_FREE_OPENROUTER_MODEL, name: "Gemini 2.0 Flash Exp (free)" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (free)" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B Instruct (free)" },
];

let workingModelCache: { id: string; expiresAt: number } | null = null;

function authHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

function isFreePromptPrice(prompt: unknown): boolean {
  if (prompt === null || prompt === undefined) return false;
  return String(prompt) === "0" || Number(prompt) === 0;
}

function dedupeModels(models: FreeOpenRouterModel[]): FreeOpenRouterModel[] {
  const seen = new Set<string>();
  const out: FreeOpenRouterModel[] = [];
  for (const model of models) {
    if (!model.id || seen.has(model.id)) continue;
    seen.add(model.id);
    out.push(model);
  }
  return out;
}

export function clearOpenRouterWorkingModelCache() {
  workingModelCache = null;
}

export async function fetchFreeOpenRouterModels(apiKey?: string): Promise<FreeOpenRouterModel[]> {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        ...authHeaders(apiKey),
        Accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`OpenRouter models HTTP ${response.status}`);
    const data = (await response.json()) as OpenRouterModelResponse;
    const models = (Array.isArray(data.data) ? data.data : [])
      .filter(model => isFreePromptPrice(model.pricing?.prompt))
      .map(model => ({
        id: String(model.id ?? "").trim(),
        name: String(model.name ?? model.id ?? "").trim(),
        contextLength: typeof model.context_length === "number" ? model.context_length : undefined,
      }))
      .filter(model => model.id.length > 0);
    return dedupeModels(models.length > 0 ? models : FALLBACK_FREE_MODELS);
  } catch (err) {
    console.error("[openrouter] failed to fetch free models:", err instanceof Error ? err.message : String(err));
    return FALLBACK_FREE_MODELS;
  }
}

function orderedCandidates(models: FreeOpenRouterModel[], preferredModel?: string): FreeOpenRouterModel[] {
  const preferred = (preferredModel || "").trim();
  const cached = workingModelCache && workingModelCache.expiresAt > Date.now()
    ? workingModelCache.id
    : "";
  if (workingModelCache && !cached) workingModelCache = null;

  const byId = new Map(models.map(model => [model.id, model]));
  if (preferred.endsWith(":free") && !byId.has(preferred)) byId.set(preferred, { id: preferred, name: preferred });
  if (cached && !byId.has(cached)) byId.set(cached, { id: cached, name: cached });
  const ordered: FreeOpenRouterModel[] = [];
  if (preferred && byId.has(preferred)) ordered.push(byId.get(preferred)!);
  if (cached && cached !== preferred && byId.has(cached)) ordered.push(byId.get(cached)!);
  ordered.push(...models.filter(model => model.id !== preferred && model.id !== cached));
  return dedupeModels(ordered);
}

async function pingModel(apiKey: string, model: string, referer: string): Promise<boolean> {
  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        ...authHeaders(apiKey),
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": "DR Travel Assistant",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        temperature: 0,
        max_tokens: 1,
      }),
    });
    if (response.ok) return true;
    const errText = await response.text().catch(() => "");
    console.warn("[openrouter] model ping failed:", model, response.status, errText.slice(0, 160));
    return false;
  } catch (err) {
    console.warn("[openrouter] model ping error:", model, err instanceof Error ? err.message : String(err));
    return false;
  }
}

export async function fetchOpenRouterChatWithFallback(args: {
  apiKey: string;
  preferredModel?: string;
  referer: string;
  body: Record<string, unknown>;
  stream?: boolean;
}): Promise<{ response: Response; model: string }> {
  const models = await fetchFreeOpenRouterModels(args.apiKey);
  const candidates = orderedCandidates(models, args.preferredModel);
  let lastError = "No free models returned by OpenRouter.";

  for (const candidate of candidates) {
    const isCached = workingModelCache?.id === candidate.id && workingModelCache.expiresAt > Date.now();
    if (!isCached) {
      const pingOk = await pingModel(args.apiKey, candidate.id, args.referer);
      if (!pingOk) {
        lastError = `${candidate.id} ping failed`;
        continue;
      }
    }

    try {
      const response = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          ...authHeaders(args.apiKey),
          "Content-Type": "application/json",
          "HTTP-Referer": args.referer,
          "X-Title": "DR Travel Assistant",
          ...(args.stream ? { Accept: "text/event-stream" } : {}),
        },
        body: JSON.stringify({
          ...args.body,
          model: candidate.id,
          ...(args.stream ? { stream: true } : {}),
        }),
      });

      if (response.ok && (!args.stream || response.body)) {
        workingModelCache = { id: candidate.id, expiresAt: Date.now() + WORKING_MODEL_TTL_MS };
        return { response, model: candidate.id };
      }

      const errText = await response.text().catch(() => "");
      lastError = `${candidate.id} HTTP ${response.status}: ${errText.slice(0, 220)}`;
      console.warn("[openrouter] model completion failed:", lastError);
      if (isCached) clearOpenRouterWorkingModelCache();
    } catch (err) {
      lastError = `${candidate.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.warn("[openrouter] model completion error:", lastError);
      if (isCached) clearOpenRouterWorkingModelCache();
    }
  }

  throw new Error(lastError);
}

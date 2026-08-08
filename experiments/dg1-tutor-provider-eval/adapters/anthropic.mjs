// Adapter EXPERIMENTAL para el harness de DG-1 -- NO es la frontera de
// ejecución AI de producción (AI domain -> provider abstraction -> provider
// adapter -> external provider, todavía sin ADR ni implementación real).
// No importar desde apps/backend/src. Sin dependencia de ningún SDK --
// HTTPS crudo vía fetch nativo de Node, deliberadamente, para no instalar
// nada hasta que DG-1 esté resuelto.

/**
 * @param {{model: string, apiBaseUrl: string, apiVersion: string}} candidate
 * @param {{systemText: string, userText: string, maxOutputTokens: number}} req
 * @param {string} apiKey
 * @returns {Promise<{text: string, inputTokens: number, outputTokens: number, finishReason: string, raw: unknown}>}
 */
export async function callAnthropic(candidate, req, apiKey) {
  const response = await fetch(candidate.apiBaseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': candidate.apiVersion,
    },
    body: JSON.stringify({
      model: candidate.model,
      max_tokens: req.maxOutputTokens,
      system: req.systemText,
      messages: [{ role: 'user', content: req.userText }],
    }),
  });

  const raw = await response.json();
  if (!response.ok) {
    const err = new Error(`Anthropic API error ${response.status}: ${raw?.error?.message ?? 'unknown'}`);
    err.providerErrorType = raw?.error?.type ?? null;
    err.httpStatus = response.status;
    throw err;
  }

  const textBlock = (raw.content ?? []).find((b) => b.type === 'text');
  return {
    text: textBlock?.text ?? '',
    inputTokens: raw.usage?.input_tokens ?? null,
    outputTokens: raw.usage?.output_tokens ?? null,
    finishReason: raw.stop_reason ?? null,
    raw,
  };
}

// Adapter EXPERIMENTAL para el harness de DG-1 -- ver nota en anthropic.mjs.
// No es la frontera de ejecución AI de producción. Sin SDK, HTTPS crudo.

/**
 * @param {{model: string, apiBaseUrl: string}} candidate
 * @param {{systemText: string, userText: string, maxOutputTokens: number}} req
 * @param {string} apiKey
 * @returns {Promise<{text: string, inputTokens: number, outputTokens: number, finishReason: string, raw: unknown}>}
 */
export async function callOpenAi(candidate, req, apiKey) {
  const response = await fetch(candidate.apiBaseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: candidate.model,
      max_completion_tokens: req.maxOutputTokens,
      messages: [
        { role: 'system', content: req.systemText },
        { role: 'user', content: req.userText },
      ],
    }),
  });

  const raw = await response.json();
  if (!response.ok) {
    const err = new Error(`OpenAI API error ${response.status}: ${raw?.error?.message ?? 'unknown'}`);
    err.providerErrorType = raw?.error?.type ?? null;
    err.httpStatus = response.status;
    throw err;
  }

  const choice = raw.choices?.[0];
  return {
    text: choice?.message?.content ?? '',
    inputTokens: raw.usage?.prompt_tokens ?? null,
    outputTokens: raw.usage?.completion_tokens ?? null,
    finishReason: choice?.finish_reason ?? null,
    raw,
  };
}

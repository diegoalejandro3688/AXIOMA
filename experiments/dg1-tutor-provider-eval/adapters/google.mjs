// Adapter EXPERIMENTAL para el harness de DG-1 -- ver nota en anthropic.mjs.
// No es la frontera de ejecución AI de producción. Sin SDK, HTTPS crudo.
//
// Recordatorio de privacidad (ver DG-1 Evaluation Brief §6): este adapter
// SOLO debe usarse contra el nivel de PAGO de la API de Gemini -- el API
// key en DG1_GOOGLE_API_KEY debe pertenecer a un proyecto con facturación
// habilitada. El nivel gratuito usa el contenido para entrenar productos de
// Google (ver ai.google.dev/gemini-api/terms), lo cual es inaceptable
// incluso para contenido sintético en este experimento.

/**
 * @param {{model: string, apiBaseUrl: string}} candidate
 * @param {{systemText: string, userText: string, maxOutputTokens: number}} req
 * @param {string} apiKey
 * @returns {Promise<{text: string, inputTokens: number, outputTokens: number, finishReason: string, raw: unknown}>}
 */
export async function callGoogle(candidate, req, apiKey) {
  const url = `${candidate.apiBaseUrl}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.systemText }] },
      contents: [{ role: 'user', parts: [{ text: req.userText }] }],
      generationConfig: req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : undefined,
    }),
  });

  const raw = await response.json();
  if (!response.ok) {
    const err = new Error(`Google API error ${response.status}: ${raw?.error?.message ?? 'unknown'}`);
    err.providerErrorType = raw?.error?.status ?? null;
    err.httpStatus = response.status;
    throw err;
  }

  const candidateResp = raw.candidates?.[0];
  const text = (candidateResp?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  return {
    text,
    inputTokens: raw.usageMetadata?.promptTokenCount ?? null,
    outputTokens: raw.usageMetadata?.candidatesTokenCount ?? null,
    finishReason: candidateResp?.finishReason ?? null,
    raw,
  };
}

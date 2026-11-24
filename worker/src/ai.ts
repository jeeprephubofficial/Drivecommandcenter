import type { DocumentInsight, Env } from "./types";

const FALLBACK_MODEL = "fallback";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_INPUT = 120_000;

function fallback(input: { name: string; mimeType?: string; text?: string }): DocumentInsight {
  const title = input.name || "Untitled document";
  const mime = input.mimeType || "";
  const wordCount = input.text?.trim() ? input.text.trim().split(/\s+/).length : 0;
  const summary = input.text?.trim()
    ? `AI enrichment is not configured. The supplied document excerpt contains approximately ${wordCount.toLocaleString()} words.`
    : `AI enrichment is not configured. This ${mime === "application/pdf" ? "PDF" : "Drive document"} is named “${title}”.`;
  return {
    language: "unknown",
    document_type: mime === "application/pdf" ? "pdf" : "drive_document",
    title,
    summary,
    key_points: [],
    topics: [],
    entities: [],
    action_items: [],
    confidence: 0
  };
}

function list(value: unknown, max: number) {
  return Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean).slice(0, max) : [];
}

export async function createInsight(
  env: Env,
  input: { name: string; mimeType?: string; modifiedTime?: string | null; text?: string }
): Promise<{ insight: DocumentInsight; model: string; configured: boolean }> {
  const apiKey = env.GROQ_API_KEY?.trim();
  if (!apiKey) return { insight: fallback(input), model: FALLBACK_MODEL, configured: false };

  const model = env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  const excerpt = (input.text || "").slice(0, MAX_INPUT);
  const prompt = [
    "Analyze the private Google Drive document metadata and optional extracted text below.",
    "Return only valid JSON with exactly these keys: language, document_type, title, summary, key_points, topics, entities, action_items, confidence.",
    "Do not invent facts. If no text is supplied, classify conservatively from metadata and use a low confidence.",
    `Name: ${input.name}`,
    `MIME type: ${input.mimeType || "unknown"}`,
    `Modified time: ${input.modifiedTime || "unknown"}`,
    excerpt ? `Extracted text:\n${excerpt}` : "No text was provided."
  ].join("\n\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1400,
      messages: [
        { role: "system", content: "You are a careful private document librarian. Never expose secrets or claim to have read content that was not supplied." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Groq request failed (${response.status}).`);

  const payload = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no structured content.");
  const parsed = JSON.parse(content) as Partial<DocumentInsight>;
  const insight: DocumentInsight = {
    language: String(parsed.language || "unknown").slice(0, 40),
    document_type: String(parsed.document_type || "other").slice(0, 80),
    title: String(parsed.title || input.name).slice(0, 300),
    summary: String(parsed.summary || "No summary returned.").slice(0, 3000),
    key_points: list(parsed.key_points, 12),
    topics: list(parsed.topics, 20),
    entities: list(parsed.entities, 20),
    action_items: list(parsed.action_items, 12),
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0) || 0))
  };
  return { insight, model, configured: true };
}

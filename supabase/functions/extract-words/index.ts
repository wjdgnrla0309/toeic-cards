// Supabase Edge Function: reads a photo of a vocabulary list and returns word/meaning pairs.
// Deploy: supabase functions deploy extract-words
// Secret:  supabase secrets set ANTHROPIC_API_KEY=...
// JWT verification is on (Supabase default), so only signed-in users of this app can call it.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Claude image limit per image
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  properties: {
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string", description: "English word or phrase, as printed" },
          definition: { type: "string", description: "Korean meaning(s), comma-separated" },
          guessed: { type: "boolean", description: "true if the meaning was not printed and you supplied it" },
        },
        required: ["term", "definition", "guessed"],
        additionalProperties: false,
      },
    },
  },
  required: ["words"],
  additionalProperties: false,
};

const PROMPT = `This photo is from a TOEIC vocabulary book, worksheet, or handwritten list.
List every English vocabulary entry you can read, in the order it appears, with its Korean meaning.

- term: the English word or phrase exactly as printed (keep phrasal verbs and collocations together). Skip example sentences, page numbers, headings, and part-of-speech labels.
- definition: the Korean meaning printed next to it. If several meanings are printed, join them with ", ".
- If no Korean meaning is printed for a word, give its most common meaning in a TOEIC business context and set guessed to true. Otherwise guessed is false.
- If the photo contains no vocabulary entries, return an empty list.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let image: string, mediaType: MediaType;
  try {
    const body = await req.json();
    image = String(body.image ?? "");
    mediaType = body.mediaType;
  } catch {
    return json({ error: "잘못된 요청이에요." }, 400);
  }
  if (!MEDIA_TYPES.includes(mediaType)) return json({ error: "JPG, PNG, WEBP, GIF 사진만 올릴 수 있어요." }, 400);
  if (!image || (image.length * 3) / 4 > MAX_IMAGE_BYTES) return json({ error: "사진이 비어 있거나 5MB보다 커요." }, 400);

  const client = new Anthropic(); // ANTHROPIC_API_KEY from function secrets
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return json({ error: "이 사진은 인식할 수 없어요." }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "단어가 너무 많아요. 사진을 나눠서 찍어 주세요." }, 422);

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "인식 결과가 비어 있어요." }, 502);
    const parsed = JSON.parse(text.text) as { words: { term: string; definition: string; guessed: boolean }[] };
    const words = parsed.words
      .map((w) => ({ term: w.term.trim(), definition: w.definition.trim(), guessed: !!w.guessed }))
      .filter((w) => w.term);
    return json({ words, model: response.model });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "요청이 많아요. 잠시 후 다시 시도해 주세요." }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "서버의 API 키 설정을 확인해 주세요." }, 500);
    if (e instanceof Anthropic.BadRequestError) return json({ error: "사진을 처리하지 못했어요.", detail: e.message }, 400);
    if (e instanceof Anthropic.APIError) return json({ error: "AI 서버 오류예요. 다시 시도해 주세요.", status: e.status }, 502);
    if (e instanceof SyntaxError) return json({ error: "인식 결과를 읽지 못했어요. 다시 시도해 주세요." }, 502);
    return json({ error: "알 수 없는 오류예요." }, 500);
  }
});

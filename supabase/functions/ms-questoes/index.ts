// Supabase Edge Function: ms-questoes
// Deploy with JWT verification disabled only if participant PINs are configured as secrets.
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SANDRO_PIN, MARTA_PIN.
// This endpoint returns only the active challenge for the server-calculated local date.
// Photos are stored in a private bucket and sent to VisionSter for scoring.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function localDate(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function fileExt(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Backend ainda não configurado." }, 503);
    const db = createClient(url, key);

    if (req.method === "GET") {
      const { data: challenges, error } = await db.from("ms_challenges").select("challenge_date,title,prompt,timezone").order("challenge_date");
      if (error) throw error;
      const active = (challenges || []).find((c) => localDate(c.timezone) === c.challenge_date);
      const { data: rows, error: scoreError } = await db.from("ms_submissions").select("participant,challenge_date,score").order("challenge_date");
      if (scoreError) throw scoreError;
      const totals = { sandro: 0, marta: 0 };
      for (const row of rows || []) totals[row.participant as "sandro" | "marta"] += row.score;
      return json({ challenge: active ? { date: active.challenge_date, title: active.title, prompt: active.prompt } : null, totals });
    }

    if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
    const body = await req.json();
    const participant = body.participant;
    const pin = String(body.pin || "");
    if (!["sandro", "marta"].includes(participant)) return json({ error: "Participante inválido." }, 400);
    const expected = Deno.env.get(participant === "sandro" ? "SANDRO_PIN" : "MARTA_PIN");
    if (!expected || pin.length < 4 || pin !== expected) return json({ error: "PIN incorrecto ou não configurado." }, 401);

    const { data: challenges, error: challengeError } = await db.from("ms_challenges").select("challenge_date,title,prompt,timezone").order("challenge_date");
    if (challengeError) throw challengeError;
    const active = (challenges || []).find((c) => localDate(c.timezone) === c.challenge_date);
    if (!active) return json({ error: "Não há desafio activo nesta data." }, 409);

    if (body.action === "submit") {
      const dataUrl = String(body.image || "");
      const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ error: "Imagem inválida. Usa JPG, PNG, WEBP ou GIF." }, 400);
      if (dataUrl.length > 13_500_000) return json({ error: "A imagem é demasiado grande. Escolhe uma imagem com menos de 8 MB." }, 413);
      const mime = match[1];
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      const path = `${active.challenge_date}/${participant}-${crypto.randomUUID()}.${fileExt(mime)}`;
      const { error: uploadError } = await db.storage.from("ms-questoes-photos").upload(path, bytes, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;

      const rubric = `És avaliador imparcial de um jogo de desafios fotográficos de viagem.\nDesafio: ${active.title}.\nEnunciado: ${active.prompt}\nPontuação: 3 = todos os critérios visíveis e cumpridos; 1 = cumprimento parcial ou dúvida relevante; 0 = desafio não cumprido. Usa apenas elementos visíveis; não infiras localização, data ou contexto. Se a imagem não permitir decidir, atribui 1 ponto e explica a incerteza. Responde em português de Portugal, começa obrigatoriamente com "PONTOS: 0", "PONTOS: 1" ou "PONTOS: 3", e depois justifica brevemente.`;
      const visionResponse = await fetch("https://www.ahm7xmakki.com/api/imgchat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, userPrompt: rubric }),
      });
      if (!visionResponse.ok) {
        await db.storage.from("ms-questoes-photos").remove([path]);
        return json({ error: visionResponse.status === 429 ? "O avaliador está temporariamente ocupado. Tenta novamente mais tarde." : "O serviço de avaliação não respondeu. A fotografia não foi pontuada." }, 502);
      }
      const vision = await visionResponse.json();
      const evaluation = String(vision.response || "");
      const scoreMatch = evaluation.match(/PONTOS:\s*(0|1|3)\b/i);
      if (!vision.success || !scoreMatch) {
        await db.storage.from("ms-questoes-photos").remove([path]);
        return json({ error: "A resposta da IA não continha uma pontuação válida. Não foram atribuídos pontos.", evaluation }, 502);
      }
      const score = Number(scoreMatch[1]);
      const { error: saveError } = await db.from("ms_submissions").upsert({
        challenge_date: active.challenge_date, participant, storage_path: path,
        photo_name: String(body.photoName || "").slice(0, 180), score, evaluation,
      }, { onConflict: "challenge_date,participant" });
      if (saveError) throw saveError;
      return json({ date: active.challenge_date, title: active.title, participant, score, evaluation });
    }

    return json({ error: "Acção desconhecida." }, 400);
  } catch (error) {
    console.error("ms-questoes error", error);
    return json({ error: "Erro interno do serviço. Verifica a configuração e tenta novamente." }, 500);
  }
});

// Integração com o Bird (API oficial do WhatsApp).
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Env, FetchLike } from "./db";

const BIRD_API = "https://us1.platform.bird.com/v1/whatsapp/messages";
const LIMITE_TEXTO = 4096;

type HeadersLike = Headers | Record<string, string | undefined>;

/**
 * Verifica a assinatura Standard Webhooks enviada pelo Bird:
 * HMAC-SHA256 de "{id}.{timestamp}.{corpo bruto}" com o segredo (sem "whsec_", em base64).
 */
export function verificarAssinatura(
  rawBody: string,
  headers: HeadersLike,
  secret: string | undefined,
  agoraSeg = Date.now() / 1000,
): boolean {
  const get = (k: string) =>
    headers instanceof Headers ? headers.get(k) : (headers as Record<string, string | undefined>)[k];
  const id = get("webhook-id");
  const ts = get("webhook-timestamp");
  const sigHeader = get("webhook-signature");
  if (!id || !ts || !sigHeader || !secret) return false;
  if (Math.abs(agoraSeg - Number(ts)) > 300) return false;
  const chave = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const esperado = createHmac("sha256", chave).update(`${id}.${ts}.${rawBody}`).digest();
  return sigHeader.split(" ").some((parte) => {
    const sig = Buffer.from(parte.replace(/^v1,/, ""), "base64");
    return sig.length === esperado.length && timingSafeEqual(sig, esperado);
  });
}

/** Divide textos longos em partes de até 4096 caracteres, quebrando em parágrafos quando possível. */
export function dividirTexto(texto: string, limite = LIMITE_TEXTO): string[] {
  const partes: string[] = [];
  let resto = String(texto || "").trim();
  while (resto.length > limite) {
    let corte = resto.lastIndexOf("\n", limite);
    if (corte < limite / 2) corte = resto.lastIndexOf(" ", limite);
    if (corte < limite / 2) corte = limite;
    partes.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) partes.push(resto);
  return partes;
}

export function createBird(env: Env = process.env, fetchImpl: FetchLike = fetch) {
  async function enviarTexto(para: string, texto: string): Promise<string[]> {
    if (!env["BIRD_API_KEY"] || !env["BIRD_WHATSAPP_FROM"])
      throw new Error("Faltam BIRD_API_KEY ou BIRD_WHATSAPP_FROM.");
    const ids: string[] = [];
    for (const parte of dividirTexto(texto)) {
      const res = await fetchImpl(BIRD_API, {
        method: "POST",
        headers: { Authorization: `Bearer ${env["BIRD_API_KEY"]}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: para, from: env["BIRD_WHATSAPP_FROM"], text: { body: parte } }),
      });
      const corpo = (await res.json().catch(() => ({}))) as { id?: string };
      if (!res.ok) throw new Error(`Bird recusou o envio (${res.status}): ${JSON.stringify(corpo).slice(0, 300)}`);
      if (corpo.id) ids.push(corpo.id);
    }
    return ids;
  }
  return { enviarTexto };
}
export type Bird = ReturnType<typeof createBird>;

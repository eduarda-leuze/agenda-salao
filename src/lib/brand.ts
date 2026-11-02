import { z } from "zod";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createAnonClient } from "@/integrations/supabase/client";

// Dados de marca expostos publicamente (tela de entrada e /agendar, sem login).
export const brandSchema = z.object({
  nome: z.string(),
  slogan: z.string().nullable(),
  logo: z.string().nullable(),
  imagem: z.string().nullable(),
  subtitulo: z.string().nullable(),
  cor: z.string().nullable(),
});
export type Brand = z.infer<typeof brandSchema>;

/** Converte o caminho salvo no banco em URL pública servida pela rota /api/public/marca. */
export const brandUrl = (path: string | null | undefined) =>
  path ? `/api/public/marca/${path}` : null;

export const publicBrand = createServerFn({ method: "GET" }).handler(async (): Promise<Brand> => {
  const { data } = await createAnonClient().rpc("publico_marca");
  const m = (data ?? {}) as Record<string, string | null | undefined>;
  return brandSchema.parse({
    nome: m["nome"] ?? "Studio Rosé",
    slogan: m["slogan"] ?? null,
    logo: brandUrl(m["logo_url"]),
    imagem: brandUrl(m["imagem_entrada_url"]),
    subtitulo: m["agendamento_subtitulo"] ?? null,
    cor: m["cor_principal"] ?? null,
  });
});

export const brandQuery = queryOptions({
  queryKey: ["brand"],
  queryFn: () => publicBrand(),
  staleTime: 60_000,
});

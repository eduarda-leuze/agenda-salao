import { createFileRoute } from "@tanstack/react-router";
import { createAnonClient } from "@/integrations/supabase/client";

// Serve as imagens de marca (logo, foto da tela de entrada) publicamente:
// só arquivos do bucket "marca" com nome seguro.
export const Route = createFileRoute("/api/public/marca/$path")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params.path;
        if (!/^[a-zA-Z0-9._-]{1,120}$/.test(path))
          return new Response("Não encontrado", { status: 404 });
        const { data, error } = await createAnonClient().storage.from("marca").download(path);
        if (error || !data) return new Response("Não encontrado", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/png",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});

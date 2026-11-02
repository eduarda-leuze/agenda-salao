// A configuração base (TanStack Start, React, Tailwind, alias "@") vem do pacote
// @lovable.dev/vite-tanstack-config, que o projeto já usava. Aqui só mudamos o
// destino da publicação: Vercel por padrão (ou NITRO_PRESET=node-server para testar no computador).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const nitro = {
  preset: process.env["NITRO_PRESET"] || "vercel",
  // O robô do WhatsApp pode levar alguns segundos para pensar e responder.
  vercel: { functions: { maxDuration: 60 } },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: nitro as { preset: string },
});

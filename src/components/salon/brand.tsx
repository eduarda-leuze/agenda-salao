import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Flower2, Copy, ExternalLink, Download, Trash2, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "./common";
import { brandQuery, brandUrl } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { erroMsg } from "@/lib/br";
import type { Tables } from "@/integrations/supabase/types";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Aplica a cor principal escolhida como variáveis CSS no documento inteiro. */
export function BrandTheme() {
  const { data } = useQuery(brandQuery);
  const cor = data?.cor && HEX.test(data.cor) ? data.cor : null;
  useEffect(() => {
    const s = document.documentElement.style;
    const vars = ["--primary", "--sidebar-primary", "--ring", "--rose", "--sidebar-ring"];
    if (cor) vars.forEach((v) => s.setProperty(v, cor));
    else vars.forEach((v) => s.removeProperty(v));
  }, [cor]);
  return null;
}

/** Logo enviado pela administradora ou a flor padrão. */
export function BrandLogo({ className = "size-8" }: { className?: string }) {
  const { data } = useQuery(brandQuery);
  if (data?.logo)
    return (
      <img
        src={data.logo}
        alt={`Logo ${data.nome}`}
        className={`${className} shrink-0 rounded object-contain`}
      />
    );
  return <Flower2 className={`${className} shrink-0 text-rose`} />;
}

export function useBrandName() {
  return useQuery(brandQuery).data?.nome ?? "Studio Rosé";
}

export function BookingLinkCard() {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  useEffect(() => {
    const u = `${window.location.origin}/agendar`;
    setUrl(u);
    void QRCode.toDataURL(u, { width: 512, margin: 2 }).then(setQr);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de agendamento copiado!");
    } catch {
      toast.error(`Não foi possível copiar. Link: ${url}`);
    }
  }
  return (
    <section className="mb-7 grid gap-5 rounded-lg border bg-card p-5 shadow-soft sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <h2 className="text-2xl">Link de agendamento online</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie para suas clientes ou imprima o QR code para o balcão.
        </p>
        <p className="mt-3 break-all rounded bg-muted px-3 py-2 text-sm">{url || "…"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button className="h-11" onClick={copy}>
            <Copy />
            Copiar
          </Button>
          <Button asChild variant="outline" className="h-11">
            <a href="/agendar" target="_blank" rel="noreferrer">
              <ExternalLink />
              Abrir
            </a>
          </Button>
          {qr && (
            <Button asChild variant="outline" className="h-11">
              <a href={qr} download="qrcode-agendamento.png">
                <Download />
                Baixar QR code
              </a>
            </Button>
          )}
        </div>
      </div>
      {qr && (
        <img
          src={qr}
          alt="QR code do link de agendamento"
          className="size-32 justify-self-center rounded border bg-card"
        />
      )}
    </section>
  );
}

function ImageField({
  label,
  path,
  onChange,
}: {
  label: string;
  path: string | null;
  onChange: (p: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter até 5 MB.");
      return;
    }
    setBusy(true);
    const ext = (file.name.split(".").pop() || "png").replace(/[^a-z0-9]/gi, "").slice(0, 5);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("marca")
      .upload(name, file, { contentType: file.type });
    setBusy(false);
    if (error) {
      toast.error(erroMsg(error));
      return;
    }
    onChange(name);
  }
  const src = brandUrl(path);
  return (
    <div className="grid gap-2 text-sm font-medium">
      {label}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">Padrão</span>
          )}
        </div>
        <Button asChild variant="outline" className="h-11" disabled={busy}>
          <label className="cursor-pointer">
            <Upload />
            {busy ? "Enviando…" : "Enviar imagem"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
        {path && (
          <Button type="button" variant="ghost" className="h-11" onClick={() => onChange(null)}>
            <Trash2 />
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}

export function BrandSettings({ config }: { config: Tables<"salao_config"> | null | undefined }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(config?.nome ?? ""),
    [slogan, setSlogan] = useState(config?.slogan ?? ""),
    [subtitulo, setSubtitulo] = useState(config?.agendamento_subtitulo ?? ""),
    [cor, setCor] = useState(config?.cor_principal ?? ""),
    [logo, setLogo] = useState(config?.logo_url ?? null),
    [imagem, setImagem] = useState(config?.imagem_entrada_url ?? null),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (cor && !HEX.test(cor)) {
      toast.error("Cor inválida.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("salao_config")
      .update({
        nome: nome.trim() || "Studio Rosé",
        slogan: slogan.trim() || null,
        agendamento_subtitulo: subtitulo.trim() || null,
        cor_principal: cor || null,
        logo_url: logo,
        imagem_entrada_url: imagem,
      })
      .eq("id", 1);
    setBusy(false);
    if (error) {
      toast.error(erroMsg(error));
      return;
    }
    toast.success("Aparência salva.");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["brand"] }),
      qc.invalidateQueries({ queryKey: ["salon"] }),
      qc.invalidateQueries({ queryKey: ["online-catalog"] }),
    ]);
  }
  return (
    <form onSubmit={submit} className="mb-10 grid max-w-2xl gap-6 border-b pb-10">
      <h2 className="text-2xl">Aparência e marca</h2>
      <ImageField label="Logo (tela de entrada, menu e agendamento)" path={logo} onChange={setLogo} />
      <Field
        label="Nome do salão"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={60}
        required
      />
      <Field
        label="Frase da tela de entrada"
        value={slogan}
        onChange={(e) => setSlogan(e.target.value)}
        maxLength={120}
        placeholder="Beleza nos detalhes. Leveza no seu dia."
      />
      <ImageField label="Imagem lateral da tela de entrada" path={imagem} onChange={setImagem} />
      <Field
        label="Subtítulo da página de agendamento"
        value={subtitulo}
        onChange={(e) => setSubtitulo(e.target.value)}
        maxLength={140}
        placeholder="Escolha seu cuidado e encontre o melhor horário."
      />
      <div className="grid gap-2 text-sm font-medium">
        Cor principal (opcional)
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            aria-label="Cor principal"
            value={cor || "#5a3a40"}
            onChange={(e) => setCor(e.target.value)}
            className="h-11 w-16 cursor-pointer rounded border bg-card"
          />
          <span
            className="flex h-11 items-center rounded px-4 text-xs text-primary-foreground"
            style={{ background: cor || "var(--primary)" }}
          >
            Prévia do botão
          </span>
          {cor && (
            <Button type="button" variant="ghost" className="h-11" onClick={() => setCor("")}>
              <RotateCcw />
              Voltar ao padrão
            </Button>
          )}
        </div>
      </div>
      <Button disabled={busy} className="h-11 w-fit">
        Salvar aparência
      </Button>
    </form>
  );
}

import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      {label}
      <input {...props} />
    </label>
  );
}
export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="field">
      {label}
      <select {...props}>{children}</select>
    </label>
  );
}
export function Modal({
  title,
  open,
  close,
  children,
}: {
  title: string;
  open: boolean;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-24px)] max-w-xl overflow-y-auto">
        <DialogTitle className="font-display text-3xl font-medium">{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function PageTitle({
  title,
  subtitle,
  action,
  label = "Adicionar",
}: {
  title: string;
  subtitle: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && (
        <Button size="lg" onClick={action}>
          <Plus />
          {label}
        </Button>
      )}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{children}</div>;
}
export function Metric({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <p className="mt-2">{note}</p>}
    </div>
  );
}

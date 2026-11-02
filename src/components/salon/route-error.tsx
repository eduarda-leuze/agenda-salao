import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
export function SalonError() {
  const router = useRouter();
  return (
    <div role="alert" className="py-16 text-center">
      <h1 className="text-3xl">Não foi possível carregar o salão.</h1>
      <p className="my-4 text-sm text-muted-foreground">Confira sua conexão e tente novamente.</p>
      <Button onClick={() => void router.invalidate()}>Tentar novamente</Button>
    </div>
  );
}
export function SalonNotFound() {
  return <p className="py-12 text-center">Cadastro não encontrado.</p>;
}

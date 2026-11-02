import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  userId: string;
  email: string;
  isAdmin: boolean;
  profissionalId: string | null;
  nome: string;
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("profissionais").select("id, nome").eq("user_id", u.user.id).maybeSingle(),
    ]);
    const isAdmin = !!roles?.some((r) => r.role === "admin");
    return {
      userId: u.user.id,
      email: u.user.email ?? "",
      isAdmin,
      profissionalId: prof?.id ?? null,
      nome: prof?.nome ?? (isAdmin ? "Administradora" : (u.user.email ?? "")),
    };
  },
  staleTime: 60_000,
});

export function useMe() {
  return useQuery(meQuery);
}

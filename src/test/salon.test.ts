import { describe, it, expect } from "vitest";
import { allowedSections, serviceTotals, paymentValid, returningClients } from "@/lib/salon";
describe("regras do salão", () => {
  it("profissional só acessa agenda e comissões", () => {
    expect(allowedSections(false)).toEqual(["agenda", "comissoes"]);
  });
  it("soma duração de múltiplos serviços", () => {
    expect(serviceTotals([{ preco: 90, duracao_min: 60 }, { preco: 60, duracao_min: 45 }]).minutes).toBe(105);
  });
  it("soma preço de múltiplos serviços", () => {
    expect(serviceTotals([{ preco: 90, duracao_min: 60 }, { preco: 60, duracao_min: 45 }]).price).toBe(150);
  });
  it("pagamento dividido precisa totalizar o valor", () => {
    expect(paymentValid(150, [100, 50])).toBe(true);
    expect(paymentValid(150, [100, 40])).toBe(false);
  });
  it("pagamento não pode ter valores negativos", () => {
    expect(paymentValid(150, [160, -10])).toBe(false);
  });
  it("retorno é apenas após mais de 60 dias", () => {
    const clients = [
      { id: "a", created_at: "2026-01-01T12:00:00Z" },
      { id: "b", created_at: "2026-01-01T12:00:00Z" },
    ];
    const visits = [
      { cliente_id: "a", inicio: "2026-08-24T12:00:00Z", status: "concluido" },
      { cliente_id: "b", inicio: "2026-08-23T12:00:00Z", status: "concluido" },
    ];
    expect(returningClients(clients, visits, "2026-10-23").map((c) => c.id)).toEqual(["b"]);
  });
});

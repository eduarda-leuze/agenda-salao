import { describe, it, expect } from "vitest";
import { localParaISO, horaLocal, dataLocal, telefoneValido, fmtData, mascaraTelefone } from "@/lib/br";

describe("fuso America/Sao_Paulo", () => {
  it("converte 10:00 local para 13:00 UTC", () => {
    expect(localParaISO("2026-10-22", "10:00")).toBe("2026-10-22T13:00:00.000Z");
  });
  it("22:30 UTC ainda é o mesmo dia em São Paulo (19:30)", () => {
    expect(dataLocal("2026-10-22T22:30:00Z")).toBe("2026-10-22");
    expect(horaLocal("2026-10-22T22:30:00Z")).toBe("19:30");
  });
});

describe("formatos brasileiros", () => {
  it("data em dd/mm/aaaa", () => {
    expect(fmtData("2026-03-05")).toBe("05/03/2026");
  });
  it("telefone celular com 9 dígitos é válido", () => {
    expect(telefoneValido("(11) 91234-5678")).toBe(true);
  });
  it("telefone incompleto é inválido", () => {
    expect(telefoneValido("(11) 9123")).toBe(false);
  });
  it("máscara de celular", () => {
    expect(mascaraTelefone("11912345678")).toBe("(11) 91234-5678");
  });
});

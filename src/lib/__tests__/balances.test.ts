import { describe, expect, it } from "vitest";
import { computeBalance, debtSentence } from "@/lib/balances";

const A = "a";
const B = "b";
const exp = (amount: number, paid_by: string, payer_share = 50, is_settlement = false) => ({
  amount,
  paid_by,
  payer_share,
  is_settlement,
});

describe("computeBalance", () => {
  it("partage moitié-moitié", () => {
    const r = computeBalance([exp(100, A)], [A, B]);
    expect(r.total).toBe(100);
    expect(r.debt).toEqual({ from: B, to: A, amount: 50 });
  });

  it("compense les dépenses croisées", () => {
    const r = computeBalance([exp(100, A), exp(60, B)], [A, B]);
    expect(r.debt).toEqual({ from: B, to: A, amount: 20 });
    expect(r.paid).toEqual({ [A]: 100, [B]: 60 });
    expect(r.consumed).toEqual({ [A]: 80, [B]: 80 });
  });

  it("gère un cadeau (tout pour l'autre) et un partage personnalisé", () => {
    const r = computeBalance([exp(30, A, 0), exp(100, B, 70)], [A, B]);
    // A a avancé 30 pour B ; B a avancé 30 pour A
    expect(r.debt).toBeNull();
  });

  it("un remboursement remet à zéro sans compter dans le total", () => {
    const r = computeBalance([exp(100, A), exp(50, B, 0, true)], [A, B]);
    expect(r.debt).toBeNull();
    expect(r.total).toBe(100);
  });

  it("arrondit au centime", () => {
    const r = computeBalance([exp(10, A), exp(10, A), exp(10.01, A)], [A, B]);
    expect(r.debt?.amount).toBe(15.01);
  });

  it("fonctionne avant l'arrivée du partenaire", () => {
    const r = computeBalance([exp(42, A)], [A]);
    expect(r.debt).toBeNull();
    expect(r.total).toBe(42);
  });
});

describe("debtSentence", () => {
  const name = (id: string) => (id === A ? "Léa" : "Tom");
  const money = (n: number) => `${n} €`;
  it("tutoie la personne connectée", () => {
    expect(debtSentence({ from: A, to: B, amount: 5 }, A, name, money)).toBe("Tu dois 5 € à Tom");
    expect(debtSentence({ from: B, to: A, amount: 5 }, A, name, money)).toBe("Tom te doit 5 €");
    expect(debtSentence(null, A, name, money)).toBe("Vous êtes quittes");
  });
});

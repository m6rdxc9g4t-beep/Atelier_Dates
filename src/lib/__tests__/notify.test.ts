import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, emailHtml, escapeHtml, smsRecipient, smsText } from "@/lib/notify/format";
import { sendEmail, sendSms } from "@/lib/notify/channels";

const GSM = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà]*$/;

describe("SMS", () => {
  it("reste dans l'alphabet GSM (pas d'emoji, accents remplacés)", () => {
    const text = smsText("Aurélia a dit oui ❤️", "« Fête à la forêt » — samedi… c'est validé !");
    expect(text).toMatch(GSM);
    expect(text).toBe(`Notre Petit Monde : Aurélia a dit oui. "Fete à la foret" - samedi... c'est validé!`);
  });

  it("ne dépasse pas 160 caractères", () => {
    const text = smsText("Titre", "x".repeat(400));
    expect(text.length).toBe(160);
    expect(text.endsWith("...")).toBe(true);
  });

  it("formate le numéro pour Brevo", () => {
    expect(smsRecipient("+33612345678")).toBe("33612345678");
  });
});

describe("e-mail", () => {
  it("échappe le contenu saisi", () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
    const html = emailHtml({ title: "<b>Coucou</b>", body: "a & b", link: "/rendez-vous" });
    expect(html).not.toContain("<b>Coucou</b>");
    expect(html).toContain("a &amp; b");
    expect(html).toContain("https://atelier-dates.vercel.app/rendez-vous");
  });

  it("ne produit que des liens vers l'app", () => {
    expect(absoluteUrl("//pirate.com")).toBe("https://atelier-dates.vercel.app//pirate.com");
    expect(absoluteUrl("https://pirate.com")).toBe("https://atelier-dates.vercel.app/accueil");
    expect(absoluteUrl(null)).toBe("https://atelier-dates.vercel.app/accueil");
  });
});

describe("appels Brevo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function mockFetch(status = 201) {
    const fetchMock = vi.fn(async () => new Response("{}", { status }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
    vi.stubEnv("BREVO_SENDER_EMAIL", "expediteur@exemple.fr");
    return fetchMock;
  }

  it("envoie l'e-mail avec la clé et l'expéditeur", async () => {
    const fetchMock = mockFetch();
    await sendEmail({ email: "lea@exemple.fr", name: "Léa" }, { title: "Bonjour", body: "Corps", link: "/accueil", tag: "test" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("xkeysib-test");
    const body = JSON.parse(init.body as string);
    expect(body.sender).toEqual({ name: "Notre Petit Monde", email: "expediteur@exemple.fr" });
    expect(body.to).toEqual([{ email: "lea@exemple.fr", name: "Léa" }]);
    expect(body.subject).toBe("Bonjour");
  });

  it("envoie le SMS au bon format", async () => {
    const fetchMock = mockFetch();
    await sendSms("+33612345678", { title: "Rdv", body: "Ciné" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/transactionalSMS/send");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ sender: "PetitMonde", recipient: "33612345678", type: "transactional" });
    expect(body.content).toBe("Notre Petit Monde : Rdv. Ciné");
  });

  it("remonte une erreur lisible si Brevo refuse", async () => {
    mockFetch(401);
    await expect(sendSms("+33612345678", { title: "x" })).rejects.toThrow(/Brevo .* 401/);
  });
});

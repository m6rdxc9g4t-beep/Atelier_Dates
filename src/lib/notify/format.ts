/** Mise en forme des notifications (fonctions pures, testées) */

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atelier-dates.vercel.app").replace(/\/$/, "");
}

export function absoluteUrl(link: string | null | undefined) {
  return `${siteUrl()}${link && link.startsWith("/") ? link : "/accueil"}`;
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Caractères absents de l'alphabet SMS standard (GSM 03.38) : un seul d'entre eux
// ferait passer le SMS en Unicode (70 caractères au lieu de 160, donc plus cher).
const GSM_REPLACEMENTS: Record<string, string> = {
  "â": "a", "ê": "e", "ë": "e", "î": "i", "ï": "i", "ô": "o", "û": "u", "ç": "c", "œ": "oe",
  "Â": "A", "Ê": "E", "Ë": "E", "Î": "I", "Ï": "I", "Ô": "O", "Û": "U", "Œ": "OE", "À": "A", "È": "E", "Ù": "U",
  "\u2019": "'", "\u2018": "'", "\u201c": '"', "\u201d": '"', "\u00ab": '"', "\u00bb": '"',
  "\u2014": "-", "\u2013": "-", "\u2026": "...", "\u00a0": " ", "\u202f": " ",
};

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/** Texte SMS : alphabet GSM uniquement (pas d'emoji), 160 caractères maximum */
export function smsText(title: string, body?: string | null, max = 160) {
  const raw = `Notre Petit Monde : ${title}${body ? `. ${body}` : ""}`
    // guillemets français : on retire les espaces intérieures avant de les convertir
    .replace(/\u00ab\s*/g, '"')
    .replace(/\s*\u00bb/g, '"');
  let out = "";
  for (const char of raw) {
    const mapped = GSM_REPLACEMENTS[char] ?? char;
    for (const c of mapped) if (GSM_BASIC.includes(c)) out += c;
  }
  out = out.replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  return out.length > max ? `${out.slice(0, max - 3).trimEnd()}...` : out;
}

/** Numéro au format attendu par Brevo : chiffres seulement, indicatif compris */
export function smsRecipient(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

/** E-mail HTML sobre, aux couleurs de l'app (fond teinté de rouge, carte blanche, bouton rouge de Dates ;
 *  valeurs du thème clair de l'app, en dur : les messageries ignorent les variables CSS) */
export function emailHtml({ title, body, link }: { title: string; body?: string | null; link?: string | null }) {
  const url = absoluteUrl(link);
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#fbf2f3;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#321f21;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e8cccd;border-radius:10px;padding:28px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:500;color:#6f585f;">Notre Petit Monde</p>
      <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
      ${body ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.5;">${escapeHtml(body)}</p>` : ""}
      <a href="${escapeHtml(url)}" style="display:inline-block;background:#db373a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:7px;font-size:14px;font-weight:600;">Ouvrir Notre Petit Monde</a>
    </div>
    <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#6f585f;text-align:center;">
      Pour ne plus recevoir ces e-mails : Paramètres → Ton profil dans l'app.
    </p>
  </body>
</html>`;
}

export function emailText({ title, body, link }: { title: string; body?: string | null; link?: string | null }) {
  return [title, body, "", `Ouvrir Notre Petit Monde : ${absoluteUrl(link)}`].filter((l) => l !== undefined && l !== null).join("\n");
}

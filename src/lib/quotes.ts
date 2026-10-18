/** Petites phrases du jour — une par jour, la même pour vous deux. */
export const QUOTES = [
  "Le bonheur, c'est d'avoir quelqu'un à qui raconter sa journée.",
  "Ce soir, on ne fait rien. Mais ensemble.",
  "On se reconnaît à la façon dont on se fait rire.",
  "Chaque jour avec toi devient une petite histoire à garder.",
  "Tu es mon endroit préféré.",
  "Les meilleurs plans sont ceux qu'on improvise à deux.",
  "Un café, un regard, et la journée commence bien.",
  "On n'a pas besoin d'aller loin pour partir ensemble.",
  "Notre petit monde tient dans un sourire.",
  "Je choisirais encore ce chemin, s'il mène à toi.",
  "Aimer, c'est aussi garder la dernière part pour l'autre.",
  "Les souvenirs se fabriquent à la main, un jour à la fois.",
  "Avec toi, même le dimanche pluvieux a du charme.",
  "On a encore tellement de premières fois devant nous.",
] as const;

/** Phrase déterministe pour une date AAAA-MM-JJ */
export function quoteOfTheDay(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return QUOTES[((dayNumber % QUOTES.length) + QUOTES.length) % QUOTES.length];
}

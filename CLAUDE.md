# Instructions pour Claude CLI - Notre Petit Monde

@AGENTS.md

## Objectif
Aider au développement, à la structuration et à la maintenance du projet **Notre Petit Monde** sur GitHub, configuré pour Vercel et Supabase. Spécifications fonctionnelles : `specifications.md`.

## Bonnes pratiques de développement
1. **Sécurité & RLS :** Toujours vérifier que les politiques de sécurité Supabase (Row Level Security) garantissent que seules les données du couple concerné sont accessibles.
2. **Composants Réutilisables :** Privilégier des composants React modulaires, propres et typés en TypeScript.
3. **Design System :** Respecter la charte Atelier v2 « Linear » (règles : `Atelier_Deploy/DESIGN.md` ; kit commun dans `src/styles/atelier-brand/` : `atelier-brand.css`, `atelier-theme.js`, police Inter — copies exactes des fichiers de la suite, à ne jamais modifier ici). Structure neutre gris froid commune à la suite, en clair comme en sombre ; le rouge signature de Dates (#db373a) ne sert qu'à l'accent : bouton principal plein, sélection, focus, liens, cœurs d'envie, icône de l'app. Plat au repos, traits de 1 px, pas de halo, de lueur ni de grille. La chaleur vient du contenu (photos, mots doux, dates), pas de la décoration. Tailwind CSS, rayons 5 / 7 / 10 px.
4. **Gestion des erreurs :** Assurer une gestion robuste des formulaires (validation avec Zod) et des retours d'API.

## Conventions du code
- **Next.js 16** : `src/proxy.ts` remplace `middleware.ts` ; `cacheComponents` est activé. Toute lecture de session/données utilisateur se fait dans un composant async placé sous `<Suspense>` (voir n'importe quelle `page.tsx` de `src/app/(app)`). Les `params`/`searchParams` sont des Promises.
- **Accès aux données** : toujours via `getCoupleContext()` (`src/lib/dal.ts`), qui renvoie un client Supabase agissant avec la session (donc soumis à RLS). Jamais de clé `service_role` côté app.
- **Server Actions** : un `actions.ts` par onglet ; signature `(prev: ActionState, formData) => Promise<ActionState>` ; validation Zod (`src/lib/validation/schemas.ts`) ; erreurs Postgres traduites par `fromDbError`. Côté client : `useFormAction` (garde les saisies en cas d'erreur) ou `<ActionForm>` pour les actions en un clic.
- **Base de données** : toute évolution = nouvelle migration dans `supabase/migrations/` + mise à jour de `src/lib/supabase/database.types.ts` + scénarios dans `supabase/tests/rls.mjs`. Les tables enfants référencent leur parent par `(id, couple_id)`.
- **Design tokens** dans `src/app/globals.css`, branchés sur les jetons `--atelier-*` du kit (qui changent de valeur sous `.dark`) : `bg-paper` (fond), `bg-sidebar` (barre latérale, barre d'onglets), `bg-surface` (cartes), `bg-sunken` (survol, pastilles, squelettes), `bg-selected` (entrée courante, segment pressé), `bg-field`, `text-ink`, `text-ink-2` (libellés), `text-muted` (= `text-ink-soft`, texte secondaire), `text-faint` (icônes au repos, méta), `border-edge` (contour des cartes), `border-edge-soft` (champs, boutons secondaires), `border-line` / `divide-line` (séparateurs), `bg-accent` / `text-accent-ink`, `bg-accent-soft` (sélection, tag), `text-accent-strong` (accent en texte ou icône). `accent` = `var(--atelier-signature)` (posée par `data-atelier-app="dates"` sur `<html>`) ; les accents Lavande / Menthe / Ciel des Paramètres remplacent `--atelier-signature`. Couleurs à part (sens) : `yes` / `maybe` / `no` (votes), `good` / `bad` (réussite / erreur). Tailles : `text-meta`, `text-small`, `text-ui` (base : 13 px sur ordinateur, 15 px sur téléphone), `text-strong`, `text-title`, `text-page`, `text-display`, `text-input` (16 px sur téléphone, contre le zoom d'iOS). Composants : cartes et panneaux `rounded-lg border border-edge bg-surface` sans ombre, contrôle segmenté `seg` + `seg-item`, bouton principal `atelier-btn-primary` (via `buttonClasses`), navigation courante `atelier-nav-active`, champs `focus:border-accent focus:focus-ring`. Une seule police : Inter (`font-sans` = `--atelier-font`). Coquille : barre latérale 232 px, barre haute 44 px, barre d'onglets en bas sur téléphone.
- **Thème** : préférence commune à la suite (Système / Clair / Sombre) via `window.atelierTheme` (`atelier-theme.js`, posé en ligne dans `<head>` par `ThemeScript`, `localStorage["atelier:theme"]` hors VPS). L'accent reste propre à Dates (`localStorage["npm-accent"]`).
- Textes de l'interface en français, tutoiement.

## Commandes utiles
- Lancer le serveur de développement : `npm run dev`
- Lancer les tests : `npm test` (unitaires) et `npm run test:rls` (sécurité de la base)
- Vérifier : `npm run typecheck && npm run lint`
- Déploiement : Automatique via push sur la branche principale connectée à Vercel.

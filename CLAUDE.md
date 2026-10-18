# Instructions pour Claude CLI - Notre Petit Monde

@AGENTS.md

## Objectif
Aider au développement, à la structuration et à la maintenance du projet **Notre Petit Monde** sur GitHub, configuré pour Vercel et Supabase. Spécifications fonctionnelles : `specifications.md`.

## Bonnes pratiques de développement
1. **Sécurité & RLS :** Toujours vérifier que les politiques de sécurité Supabase (Row Level Security) garantissent que seules les données du couple concerné sont accessibles.
2. **Composants Réutilisables :** Privilégier des composants React modulaires, propres et typés en TypeScript.
3. **Design System :** Respecter l'identité visuelle chaleureuse et moderne (utilisation de Tailwind CSS, arrondis doux, palette pastel/romantique).
4. **Gestion des erreurs :** Assurer une gestion robuste des formulaires (validation avec Zod) et des retours d'API.

## Conventions du code
- **Next.js 16** : `src/proxy.ts` remplace `middleware.ts` ; `cacheComponents` est activé. Toute lecture de session/données utilisateur se fait dans un composant async placé sous `<Suspense>` (voir n'importe quelle `page.tsx` de `src/app/(app)`). Les `params`/`searchParams` sont des Promises.
- **Accès aux données** : toujours via `getCoupleContext()` (`src/lib/dal.ts`), qui renvoie un client Supabase agissant avec la session (donc soumis à RLS). Jamais de clé `service_role` côté app.
- **Server Actions** : un `actions.ts` par onglet ; signature `(prev: ActionState, formData) => Promise<ActionState>` ; validation Zod (`src/lib/validation/schemas.ts`) ; erreurs Postgres traduites par `fromDbError`. Côté client : `useFormAction` (garde les saisies en cas d'erreur) ou `<ActionForm>` pour les actions en un clic.
- **Base de données** : toute évolution = nouvelle migration dans `supabase/migrations/` + mise à jour de `src/lib/supabase/database.types.ts` + scénarios dans `supabase/tests/rls.mjs`. Les tables enfants référencent leur parent par `(id, couple_id)`.
- **Design tokens** dans `src/app/globals.css` (`bg-paper`, `bg-surface`, `text-ink`, `text-ink-soft`, `border-line`, `bg-accent`, `bg-accent-soft`…). Polices : `font-display` (Young Serif, titres), `font-sans` (Figtree), `font-hand` (Caveat, réservée aux mots doux). Pas d'ombres ; grands arrondis (`rounded-[1.75rem]`) pour les cartes, `rounded-full` pour les boutons.
- Textes de l'interface en français, tutoiement.

## Commandes utiles
- Lancer le serveur de développement : `npm run dev`
- Lancer les tests : `npm test` (unitaires) et `npm run test:rls` (sécurité de la base)
- Vérifier : `npm run typecheck && npm run lint`
- Déploiement : Automatique via push sur la branche principale connectée à Vercel.

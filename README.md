# Notre Petit Monde

Application web intime pour deux : rendez-vous à valider ensemble, cagnottes façon Tricount, album souvenirs, envies & scénarios, surprises à révélation programmée.

**Stack :** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · Zod · Lucide · Vercel.

---

## 1. Installation locale

Prérequis : Node.js ≥ 20.9 et un compte [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env.local   # puis renseigne les valeurs (étape 2)
npm run dev                   # http://localhost:3000
```

## 2. Préparer Supabase

1. **Créer un projet** sur supabase.com (région Europe — Paris ou Francfort).
2. **Appliquer le schéma** — au choix :
   - *SQL Editor* : coller le contenu de `supabase/migrations/20261018000000_init.sql` et l'exécuter ;
   - *CLI* : `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`.
3. **Clés** : *Project Settings → API* → copier l'URL et la clé `publishable` dans `.env.local`.
4. **Auth → URL Configuration**
   - *Site URL* : `http://localhost:3000` (puis l'URL Vercel de production)
   - *Redirect URLs* : `http://localhost:3000/**` et `https://<ton-projet>.vercel.app/**`
5. **Auth → Email Templates → Magic Link** (recommandé, pour que le lien marche même ouvert sur un autre appareil) :
   ```html
   <h2>Ton lien pour Notre Petit Monde</h2>
   <p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Entrer dans notre petit monde</a></p>
   ```
6. **Auth → SMTP** : le service d'e-mail intégré de Supabase est limité à quelques envois par heure. Branche un SMTP (Resend, Brevo…) avant de vraiment l'utiliser.

Le bucket Storage `memories` (privé) et ses politiques sont créés par la migration.

## 3. Déployer sur Vercel

1. Pousser le dépôt sur GitHub.
2. Vercel → *Add New Project* → importer le dépôt (framework détecté automatiquement).
3. *Environment Variables* : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (URL de prod), `NEXT_PUBLIC_APP_TIMEZONE=Europe/Paris`.
4. Déployer. Chaque push sur `main` redéploie ; chaque PR obtient une préversion.
5. Reporter l'URL de prod dans Supabase (*Site URL* + *Redirect URLs*).

## 4. Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Types de routes + TypeScript |
| `npm test` | Tests unitaires (Vitest) : équilibres Tricount, schémas Zod, dates |
| `npm run test:rls` | Applique la migration dans un Postgres embarqué (PGlite) et vérifie 41 scénarios d'isolation RLS |

## 5. Arborescence

```
src/
├── proxy.ts                         # (ex-middleware) rafraîchit la session, protège les routes
├── app/
│   ├── layout.tsx                   # polices, thème, métadonnées
│   ├── connexion/                   # lien magique (page, formulaire, actions, déconnexion)
│   ├── auth/callback/route.ts       # retour du lien magique (code PKCE ou token_hash)
│   ├── onboarding/                  # créer le couple ou le rejoindre avec un code
│   └── (app)/                       # zone connectée : navigation + 7 onglets
│       ├── layout.tsx  loading.tsx  error.tsx
│       ├── accueil/                 # compteur de jours, citation du jour, prochain rdv…
│       ├── rendez-vous/             # propositions + votes "on fait ça ?"
│       ├── cagnottes/  [id]/        # cagnottes, dépenses, qui doit combien à qui
│       ├── souvenirs/               # timeline, photos (Storage), filtres date/lieu/album
│       ├── envies/                  # wishlist & scénarios classés par envie commune
│       ├── surprises/               # teaser + indices + révélation programmée
│       └── parametres/              # profil, couple, code d'invitation, thème
├── components/
│   ├── ui/                          # Button, Field/Input, SubmitButton, ActionForm, Panel…
│   ├── nav/                         # navigation latérale / barre d'onglets mobile
│   └── theme/                       # script anti-flash, sélecteur clair/sombre + accent
└── lib/
    ├── supabase/                    # clients navigateur/serveur/proxy + types de la base
    ├── dal.ts                       # couche d'accès : utilisateur, couple, partenaire
    ├── actions.ts                   # ActionState + traduction des erreurs Postgres
    ├── use-form-action.ts           # useActionState qui conserve les saisies en cas d'erreur
    ├── validation/                  # schémas Zod de tous les formulaires
    ├── balances.ts                  # calcul façon Tricount
    └── format.ts  quotes.ts  env.ts
supabase/
├── migrations/20261018000000_init.sql
└── tests/rls.mjs
```

## 6. Sécurité des données

- Chaque table métier porte un `couple_id` ; **RLS** n'autorise que les deux membres du couple (`public.my_couple_id()`).
- Clés étrangères composites `(id, couple_id)` : impossible de rattacher une dépense, un vote ou une photo à un élément d'un autre couple.
- Colonnes sensibles verrouillées par privilèges : `couple_id` d'un profil, `invite_code`, statut d'un rendez-vous (il ne change que via les votes ou `complete_date()`).
- Création / adhésion au couple via fonctions `SECURITY DEFINER` (2 membres maximum).
- **Surprises** : le destinataire voit le teaser, mais le contenu secret et chaque indice ne lui sont renvoyés par la base qu'après leur date de révélation.
- Photos dans un bucket privé, rangées par `{couple_id}/…`, servies par URL signée d'une heure.
- Tout passe par la session de l'utilisateur ; aucune clé `service_role` dans l'application.

## 7. Prochaines étapes suggérées

- **Notifications e-mail / SMS** : les préférences sont déjà stockées (`profiles.notify_email`, `notify_sms`, `phone`). Brancher un *Database Webhook* Supabase (insert sur `date_proposals`, `date_votes`, `surprises`) vers une *Edge Function* qui envoie via Resend (e-mail) et Twilio ou Brevo (SMS).
- Temps réel (Supabase Realtime) pour voir le vote de l'autre sans recharger.
- Widget météo sur l'accueil (Open-Meteo, sans clé).
- PWA (icône sur l'écran d'accueil du téléphone).

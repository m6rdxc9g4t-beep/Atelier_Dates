# Notre Petit Monde

Application web intime pour deux : rendez-vous à valider ensemble, cagnottes façon Tricount, album souvenirs, envies & scénarios, surprises à révélation programmée, notifications (dans l'app, push, e-mail, SMS).

**En ligne :** https://atelier-dates.vercel.app — installable comme une app (Safari → *Fichier → Ajouter au Dock* sur Mac, *Partager → Sur l'écran d'accueil* sur iPhone).

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
3. *Environment Variables* : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (URL de prod), `NEXT_PUBLIC_APP_TIMEZONE=Europe/Paris`, plus celles des notifications (section 7).
4. *Settings → Functions → Region* : choisir la région de la base Supabase (ici `dub1`, Dublin).
5. Déployer. Avec l'application GitHub de Vercel installée, chaque push sur `main` redéploie.
6. Reporter l'URL de prod dans Supabase (*Site URL* + *Redirect URLs*).

> **État actuel :** le projet Vercel `atelier-dates` n'est pas relié à GitHub (l'application GitHub de Vercel n'est pas installée). Les déploiements sont lancés à la demande depuis le dépôt public, via l'API Vercel. Pour les rendre automatiques : vercel.com → *Add New → Project → Import Git Repository → Install*, puis relier `Atelier_Dates` au projet existant.

## 4. Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Types de routes + TypeScript |
| `npm test` | Tests unitaires (Vitest) : équilibres Tricount, schémas Zod, dates, SMS/e-mails, appels Brevo |
| `npm run test:rls` | Applique toutes les migrations dans un Postgres embarqué (PGlite) et vérifie les règles d'isolation RLS |

## 5. Arborescence

```
src/
├── proxy.ts                         # (ex-middleware) rafraîchit la session, protège les routes
├── app/
│   ├── layout.tsx                   # polices, thème, métadonnées
│   ├── connexion/                   # e-mail + mot de passe, ou lien magique ; déconnexion
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
│       ├── notifications/actions.ts # push (abonnement), test, tout marquer comme lu
│       └── parametres/              # profil, couple, notifications, mot de passe, thème
├── components/
│   ├── ui/                          # Button, Field/Input, SubmitButton, ActionForm, Panel…
│   ├── nav/                         # navigation latérale / barre d'onglets mobile
│   ├── notifications/               # activation du push sur l'appareil, envoi d'un test
│   └── theme/                       # script anti-flash, sélecteur clair/sombre + accent
├── styles/atelier-brand/           # marque commune de la suite Atelier (copie exacte, ne pas modifier) + police Nunito (OFL)
└── lib/
    ├── supabase/                    # clients navigateur/serveur/proxy + types de la base
    ├── dal.ts                       # couche d'accès : utilisateur, couple, partenaire
    ├── actions.ts                   # ActionState + traduction des erreurs Postgres
    ├── use-form-action.ts           # useActionState qui conserve les saisies en cas d'erreur
    ├── validation/                  # schémas Zod de tous les formulaires
    ├── notify/                      # notifications : enregistrement + push, e-mail et SMS (Brevo)
    ├── balances.ts                  # calcul façon Tricount
    └── format.ts  quotes.ts  env.ts
public/sw.js                         # service worker : affiche les notifications push
supabase/
├── migrations/                      # archive v1, schéma, durcissement, notifications
├── scripts/                         # reprise des données de la v1 / installation en une fois
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
- **Notifications** : chacun ne lit que les siennes. L'e-mail, le téléphone et les appareils push du partenaire ne sont accessibles que via `notification_target()` / `push_targets()`, limitées au couple.
- **Migrations** : le connecteur Supabase de Claude bloque les `DROP` (confirmation manuelle) ; les migrations sont écrites sans suppression.

## 7. Notifications

| Canal | Quand | Configuration |
| --- | --- | --- |
| Dans l'app | Toujours (section « Nouveautés » de l'accueil) | Aucune |
| Push (iPhone, Mac, Android) | Chaque appareil où la personne l'active dans Paramètres. Sur iPhone : depuis l'app installée sur l'écran d'accueil | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| E-mail | Si « Par e-mail » est coché dans le profil | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (expéditeur vérifié dans Brevo), `BREVO_SENDER_NAME` |
| SMS | Rendez-vous proposés/validés et surprises, si « Par SMS » est coché et un numéro renseigné | `BREVO_API_KEY` + crédits SMS Brevo, `BREVO_SMS_SENDER` (11 caractères max) |

Événements : proposition de rendez-vous, réponse (et validation), surprise en préparation, nouveau souvenir. L'envoi a lieu après la réponse à l'utilisateur (`after()`), et un canal en panne ne bloque jamais l'action. Bouton « M'envoyer une notification test » dans Paramètres.

## 8. Prochaines étapes suggérées

- Révélation des surprises : notification au moment de la révélation (tâche planifiée Vercel Cron).
- Temps réel (Supabase Realtime) pour voir le vote de l'autre sans recharger.
- Widget météo sur l'accueil (Open-Meteo, sans clé).

# Cahier des Charges — G-STOCK PRO
### Solution de gestion de parc informatique, de stock et de maintenance
**Version :** 1.0 — État au 20/06/2026
**Type :** Application web (PWA) — Architecture Frontend / Backend / Base de données

---

## 1. Présentation du projet

### 1.1 Contexte
G-Stock Pro est une application de gestion destinée à piloter :
- le **catalogue de produits** (modèles d'équipements / consommables),
- le **parc d'actifs** (équipements physiques unitaires, identifiés par numéro de série),
- le **stock** (quantités par produit et par entrepôt),
- les **mouvements** d'entrée/sortie,
- la **maintenance** (préventive planifiée et curative sur panne),
- le tout avec **contrôle d'accès par rôles (RBAC)**, **notifications** et **alertes e-mail**.

### 1.2 Objectifs
- Centraliser la traçabilité du matériel et des consommables.
- Automatiser le suivi des stocks et les alertes de réapprovisionnement.
- Industrialiser la maintenance (échéances préventives, tickets, rapports).
- Fournir des **outils de pilotage** : tableau de bord, exports, recherche/pagination performantes.

---

## 2. Acteurs et rôles (RBAC)

Quatre rôles, avec une matrice de permissions appliquée **côté backend** (middleware) **et** côté frontend (masquage UI).

| Rôle | Description |
|---|---|
| **super_admin** | Administrateur global. Accès total (CRUD sur tous les modules, suppression). |
| **magasinier** | Gère produits, stock, mouvements, entrepôts, catégories, fournisseurs. |
| **technicien** | Gère les actifs et la maintenance (interventions, rapports). |
| **consultant** | Lecture seule sur la majorité des modules. |

### Matrice de permissions (lecture / création / modification / suppression)

| Module | read | create | update | delete |
|---|---|---|---|---|
| utilisateurs | super_admin | super_admin | super_admin | super_admin |
| produits | tous | super_admin, magasinier | super_admin, magasinier | super_admin |
| actifs | tous | super_admin, magasinier, technicien | super_admin, magasinier, technicien | super_admin |
| mouvements | super_admin, magasinier, consultant | super_admin, magasinier | super_admin, magasinier | super_admin |
| stocks (inventaire) | super_admin, magasinier, consultant | super_admin, magasinier | super_admin, magasinier | super_admin |
| categories | super_admin, magasinier, consultant | super_admin, magasinier | super_admin, magasinier | super_admin |
| fournisseurs | super_admin, magasinier, consultant | super_admin, magasinier | super_admin, magasinier | super_admin |
| entrepots | tous | super_admin, magasinier | super_admin, magasinier | super_admin |
| maintenances | super_admin, technicien, consultant | super_admin, technicien | super_admin, technicien | super_admin |

---

## 3. Architecture technique

### 3.1 Stack
- **Frontend :** Next.js 14 (App Router), React 18, Tailwind CSS + **DaisyUI**, **lucide-react** (icônes), **@tanstack/react-table** + **@tanstack/react-query** (tables & état serveur), **xlsx** (export Excel), **jspdf** + **jspdf-autotable** (PDF).
- **Backend :** Node.js + **Express**, **pg** (PostgreSQL en SQL brut, pas d'ORM), **jsonwebtoken** (JWT), **bcryptjs**, **zod** (validation), **helmet**, **cors**, **cookie-parser**, **multer** (upload), **nodemailer** (e-mails).
- **Base de données :** PostgreSQL hébergé sur **Supabase (cloud)**. Le schéma vit dans Supabase ; les migrations sont des scripts SQL versionnés dans `backend/migrations/`.
- **E-mail :** SMTP via Mailtrap (sandbox) configuré par variables d'environnement.

### 3.2 Structure des dossiers
```
g-stock-pro/
├── backend/
│   ├── config/db.js                 # Pool PostgreSQL (pg)
│   ├── controllers/                 # Logique des endpoints
│   ├── models/                      # Accès SQL (Produit, Actif, Maintenance, Stock…)
│   ├── routes/                      # Définition des routes + RBAC
│   ├── middlewares/authMiddleware.js# verifyToken + requireRole
│   ├── services/                    # email, notification, stock, maintenance, scheduler
│   ├── migrations/                  # Scripts SQL (à exécuter sur Supabase)
│   ├── uploads/                     # Images téléversées (servies en statique)
│   └── server.js                    # Point d'entrée Express
└── frontend/
    ├── app/                         # Pages (App Router) : /, /produits, /actifs, …
    │   └── …/[id]/page.js           # Fiches détaillées (produit, actif)
    ├── components/                  # Sidebar, Navbar, DataTable(Server), modales, exports…
    ├── hooks/                       # usePermissions, usePaginatedResource
    └── lib/pdfDocuments.js          # Génération PDF (bons, rapports)
```

### 3.3 Sécurité
- Authentification par **JWT en cookie HTTP-Only** (`token`), signé avec `JWT_SECRET`.
- Middleware `verifyToken` (injecte `req.utilisateur = { id, role }`) + `requireRole([...])`.
- Mots de passe hachés (**bcrypt**), validation des entrées (**Zod**), en-têtes sécurisés (**Helmet**), **CORS** restreint à l'origine front avec credentials.
- Middleware Next.js : redirige vers `/login` si non authentifié.

---

## 4. Modèle de données (principales tables)

> Le schéma réel est dans Supabase. Résumé des tables et champs clés.

- **utilisateurs** : id, nom_complet, adresse_email (unique), mot_de_passe (hash), role, est_actif, cree_le.
- **produits** : id, categorie_id, fournisseur_id, libelle, sku, **image_url**, stock_minimum, stock_critique, est_maintenable, **intervalle_valeur**, **intervalle_unite** (minute/heure/jour/mois/annee), `intervalle_maintenance_jours` (hérité), **cree_par**, **modifie_par**, cree_le.
- **actifs** : id, produit_id, numero_serie (unique), entrepot_id, emplacement, utilisateur_affecte_id, **statut** (`en_stock` | `affecte` | `maintenance` | `rebut`), **prix_unitaire**, **date_prochaine_preventive** (timestamptz), **cree_par**, **modifie_par**, cree_le.
- **stocks** : id, produit_id, entrepot_id, numero_lot, quantite, mis_a_jour_le.
- **mouvements** : id, actif_id, effectue_par, entrepot_id, type_mouvement (`entree` | `sortie`), notes, cree_le.
- **maintenances** (tickets) : id, actif_id, technicien_id, **type_maintenance** (`preventif` | `curatif`), **statut** (`planifie` | `en_cours` | `termine` | `annule`), date_intervention, rapport, **cout**, cree_le.
- **categories** : id, nom, description.
- **fournisseurs** : id, nom, adresse_email, telephone.
- **entrepots** : id, nom, … (localisation).
- **notifications** : id, utilisateur_id, titre, type_notif (`alerte_stock` | `maintenance` | `mouvement`), message, lien, **est_lu**, cree_le.

---

## 5. Spécifications fonctionnelles par module

### 5.1 Authentification & Utilisateurs
- Inscription (validée par Zod), connexion (JWT cookie), déconnexion.
- Gestion des utilisateurs (super_admin) : liste, création, rôles, activation.

### 5.2 Interface & Navigation (UX / PWA)
- **Sidebar latérale** rétractable (mode icônes) sur desktop, **tiroir hamburger** sur mobile ; navigation filtrée par rôle.
- **Navbar** épurée : hamburger (mobile), logo, **cloche de notifications** (compteur non-lues, lien vers la page), **thème clair/sombre**, **menu utilisateur** (profil, rôle, déconnexion).
- **Dark/Light mode** cohérent (tokens DaisyUI), design responsive « mobile-first », PWA (manifest, métadonnées).

### 5.3 Produits (catalogue)
- CRUD complet, **recherche + pagination côté serveur**.
- Sélecteurs **Catégorie / Fournisseur** avec **icônes d'ajout rapide** (modales secondaires) et auto-sélection du nouvel élément créé.
- **Upload d'image** (aperçu + bouton « Téléverser » ou URL) — stockage backend, servi en statique.
- **Règle de maintenance** définie sur le produit : type *Aucune* / *Curative* / *Préventive* ; si préventive → **intervalle = valeur + unité** (minute/heure/jour/mois/année). Le champ intervalle est désactivé hors préventive.
- **Fiche Produit** (`/produits/[id]`) : image, catégorie/fournisseur, seuils, et **inventaire des actifs rattachés** (nombre, valeur, statuts).
- Export **Excel** ; bouton **Modifier** fonctionnel (modale d'édition pré-remplie).

### 5.4 Actifs (parc)
- CRUD, recherche + pagination serveur, **prix unitaire / coût d'acquisition** par unité.
- Statuts alignés sur la base : `en_stock`, `affecte`, `maintenance`, `rebut`.
- **Fiche Actif** (`/actifs/[id]`) : informations, **prochaine échéance préventive** (bandeau d'alerte si dépassée), **historique de maintenance**, et actions **« Déclarer une panne »** / **« Enregistrer un entretien »** (modales).
- Export **Excel**.

### 5.5 Stock / Inventaire
- Table dédiée **« Lignes d'inventaire »** (`/inventaire`) : quantité par produit × entrepôt, seuils, **indicateur « sous seuil critique »**, recherche + pagination serveur, export **Excel**.
- Mise à jour **automatique** du stock (cf. §6).

### 5.6 Mouvements
- Historique des entrées/sorties.
- **Formulaire optimisé** : sélection du **type**, **filtre par produit**, liste des **actifs disponibles** filtrée selon le type (sortie → en stock ; entrée → hors stock). **L'entrepôt est déduit de l'actif** (plus de saisie).
- L'auteur du mouvement (`effectue_par`) est forcé depuis le token (traçabilité).
- **Bon de sortie / Bon d'entrée en PDF** professionnel par ligne (impression / archivage).

### 5.7 Maintenance (V2 — séparation Règle / Exécution)
- **Règle** sur le produit (type + intervalle) ↔ **Exécution** = tickets sur l'actif unitaire.
- **Tickets** (`preventif`/`curatif`, statut `planifie`/`en_cours`/`termine`/`annule`).
- **Déclarer une panne** : crée un ticket curatif `en_cours`, passe l'actif en `maintenance`, notifie les techniciens.
- **Enregistrer un entretien** : clôt le ticket ouvert (`termine`), recalcule la prochaine échéance préventive, remet l'actif `en_stock`.
- **Échéancier préventif** : délai restant calculé, badges *En retard / Bientôt / OK*, rafraîchissement périodique.
- **Rapport de maintenance en PDF** par ticket.

### 5.8 Notifications & Alertes
- Centre de notifications in-app (cloche → **page `/notifications`** avec filtres par type, « marquer comme lu »).
- **Technicien** : notifié sur affectation de maintenance / échéance préventive atteinte / panne.
- **Magasinier (+ super_admin)** : notifié sur entrée de stock / ajout de produit.
- **Service achat / super_admin / magasinier** : **e-mail** automatique (Mailtrap) quand un stock atteint le seuil critique.

### 5.9 Tableau de bord (pilotage)
- KPIs calculés par **requêtes SQL agrégées** (performant) : **stock total**, **actifs en maintenance**, **alertes achat** (stocks sous seuil), valeur du parc, produits/actifs/entrepôts, préventives dues, tickets en cours.
- **Répartition des actifs par statut**, liste des **alertes d'achat**, **derniers tickets** de maintenance.

---

## 6. Règles métier & automatisations

1. **Stock automatique** (`services/stockService.js`) :
   - Création d'un actif → **+1** au stock (produit / entrepôt) ; suppression → **−1**.
   - Mouvement `entree` → **+1** ; `sortie` → **−1**.
2. **Alerte seuil critique** : si la quantité ≤ `stock_critique`, e-mail + notification in-app (super_admin, magasinier, service achat).
3. **Maintenance préventive** (`services/maintenanceService.js` + `maintenanceScheduler.js`) :
   - À la création d'un actif d'un produit préventif → calcul de `date_prochaine_preventive`.
   - **Planificateur in-process** (intervalle réglable, défaut 60 s) : détecte les échéances atteintes, crée un ticket `preventif/planifie` (anti-doublon par ticket ouvert) et notifie les techniciens.
   - Entretien enregistré → recalcul de l'échéance suivante.
4. **Traçabilité** : `cree_par` / `modifie_par` (produits, actifs), `effectue_par` (mouvements), `technicien_id` (maintenances), renseignés depuis le token.

---

## 7. API (principaux endpoints REST)

Toutes les routes (hors auth) exigent un JWT valide + le rôle adéquat.

- **Auth/Utilisateurs** : `/api/utilisateurs` (inscription, connexion, déconnexion, CRUD).
- **Produits** : `GET/POST /api/produits`, `GET/PUT/DELETE /api/produits/:id` (pagination `?page&limit&search`).
- **Actifs** : `GET/POST /api/actifs`, `GET/PUT/DELETE /api/actifs/:id` ;
  - `GET /api/actifs/:id/maintenances`, `POST /api/actifs/:id/panne`, `POST /api/actifs/:id/entretien`.
- **Stocks** : `GET /api/stocks` (pagination/recherche).
- **Mouvements** : `GET/POST /api/mouvements`, `GET/PUT/DELETE /:id`.
- **Maintenances** : `GET /api/maintenances`, `GET/PUT/DELETE /:id`.
- **Catégories / Fournisseurs / Entrepôts** : CRUD `/api/categories`, `/api/fournisseurs`, `/api/entrepots`.
- **Notifications** : `GET /api/notifications`, `PATCH /:id/lu`, `PATCH /tout-lu`.
- **Uploads** : `POST /api/uploads/image` (multipart, images ≤ 5 Mo) ; fichiers servis sur `/uploads/*`.
- **Dashboard** : `GET /api/dashboard/stats`.

**Format de pagination** : `{ metadata: { total_items, total_pages, current_page, per_page, has_next_page, has_previous_page }, <ressource>: [...] }`.

---

## 8. Exigences non-fonctionnelles

- **Performance** : pagination + recherche **côté serveur** (SQL `LIMIT/OFFSET` + `COUNT`, `ILIKE`) pour produits / actifs / stocks ; agrégats dashboard en SQL ; `@tanstack/react-query` (cache, pas de re-fetch agressif) ; libs d'export chargées dynamiquement (bundle initial allégé).
- **Réutilisabilité** : composants génériques `DataTableServer`, `ResourceModal`, `ExportButtons`, hook `usePaginatedResource`.
- **Responsive / PWA** : mobile-first, sidebar adaptative, manifest + métadonnées.
- **Accessibilité visuelle** : dark/light mode, design cohérent DaisyUI.

---

## 9. Exports & Documents

- **Excel (.xlsx)** : tables **Produits**, **Actifs**, **Inventaire** (export de tout le jeu filtré, pas seulement la page).
- **PDF professionnel** (en-tête, cartouche, fiche, signatures, pied de page) **réservé aux documents** :
  - **Bon de sortie / d'entrée** (module Mouvements),
  - **Rapport de maintenance** (module Maintenance + Fiche Actif).

---

## 10. Annexes — Exploitation

### 10.1 Variables d'environnement (backend `.env`)
- `DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD` (Supabase).
- `JWT_SECRET, JWT_EXPIRES_IN`.
- `EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM` (Mailtrap), `EMAIL_ACHAT` (optionnel).
- `MAINTENANCE_SCHEDULER` (`off` pour désactiver), `MAINTENANCE_SCHEDULER_MS` (période).

### 10.2 Migrations SQL (à exécuter sur Supabase, dossier `backend/migrations/`)
- `2026-06-19_data-model-adjustments.sql` — prix→actifs, image_url, traçabilité.
- `2026-06-19b_notifications.sql` — colonnes `est_lu`, `cree_le`.
- `2026-06-19c_maintenance_interval.sql` — `intervalle_valeur`, `intervalle_unite`.
- `2026-06-19d_maintenance_v2.sql` — `date_prochaine_preventive`, tickets (type/statut/coût).

### 10.3 Lancement (développement)
```bash
# Backend (terminal 1)
cd backend && npm install && node server.js     # http://localhost:5000

# Frontend (terminal 2)
npm install && npm run dev                       # http://localhost:3000
```

---

## 11. Évolutions possibles (hors périmètre actuel)
- Migration de **toutes** les tables CRUD vers la pagination serveur (déjà fait pour produits/actifs/stocks).
- **Upload Supabase Storage** (remplacer le stockage local des images).
- Séparation stricte stock consommable vs équipements unitaires (actifs).
- Notifications temps réel (WebSocket), tableaux de bord avec graphiques avancés.
- Tests automatisés (unitaires / e2e), CI/CD.

---
*Document généré à partir de l'état réel du code (backend Express + PostgreSQL/Supabase, frontend Next.js/DaisyUI).*

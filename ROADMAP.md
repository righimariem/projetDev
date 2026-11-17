# HOMEY — Plan de développement complet (React + Django + IA)

Plateforme intelligente de recherche de logements et de colocation.
**Sources fusionnées** : `Cahier_des_charges_HOMEY.docx` (cahier des charges officiel : acteurs, 10 épics, user stories, Scrum) + `detailProjet.pdf` (détail des briques IA F1–F8, anciennement « SmartHousing »).
Équipe : Mayssa Chalghoum, Mariem Righi, Salma Mhadhbi — Ing-4-SDIAF-A — 2026–2027.

---

## 1. Proposition de valeur

> HOMEY est une plateforme intelligente de location et de colocation qui ne se limite pas à rechercher des logements. Elle combine recommandation de logements, matching de colocataires, formation de groupes, estimation des prix, détection des prix anormaux et explication des recommandations afin d'aider l'utilisateur à prendre une décision plus pertinente — avec des annonces vérifiées et une communication intégrée.

## 2. Acteurs et besoins (§6 du cahier des charges)

| Acteur | Rôle | Fonctionnalités |
|---|---|---|
| **Locataire** | Cherche un logement ou un colocataire | Recherche, groupes, chat, favoris |
| **Propriétaire** | Publie et gère ses annonces | Annonces, demandes, chat |
| **Administrateur** | Supervise et modère | Modération, utilisateurs, alertes IA, dashboard |

**Besoins non fonctionnels** : sécurité (mots de passe chiffrés, HTTPS), performance, responsive (mobile/tablette/ordinateur), ergonomie, maintenabilité, fiabilité, contrôle des accès par rôle.

## 3. Périmètre : 10 épics ↔ briques IA

| Epic (HOMEY) | User stories clés | Priorité dominante | Plan ci-dessous |
|---|---|---|---|
| EPIC 1 — Authentification / Profil | inscription locataire/propriétaire, login, reset mdp, profil, préférences, accès admin séparé | MUST | Phases 1, 3 |
| EPIC 2 — Logements | CRUD annonce, photos multiples, validation, statut loué/archivé | MUST | Phases 2, 3 |
| EPIC 3 — Consultation / Recherche | consultation visiteur, filtres, tri/pagination, favoris, contacter propriétaire | MUST | Phase 3 |
| EPIC 4 — Administration | gestion utilisateurs, suspension, validation/refus d'annonce justifié, signalements, dashboard, alertes IA | MUST/SHOULD | Phase 6 |
| EPIC 5 — IA / Annonces | description générée par IA (US5.1), reconnaissance des pièces sur photos (US5.2), incohérence texte/photos (US5.3), analyse auto à la soumission (US5.4 **MUST**), prix anormal (US5.5 = **F7**), score qualité annonce (US5.6) | SHOULD/COULD | Phases 6, 12 |
| EPIC 6 — Recherche intelligente | recherche en langage naturel (US6.1), recommandations classées (US6.2 = **F2** MUST 13 SP), explication (US6.3 = **F8**), historique comportemental (US6.4) | MUST | Phases 8, 11 |
| EPIC 7 — Matching / Colocation | mode seul/coloc/indécis (US7.1), critères de colocation (**F3**), score coloc (**F4**), explication du score, accepter/refuser, profils compatibles avec un logement (US7.6) | MUST | Phase 9 |
| EPIC 8 — Groupes de colocation | créer un groupe, inviter un colocataire, recommandations selon **tous** les membres (**F5** = binôme → étendu au groupe), 3ᵉ colocataire, quitter/dissoudre | MUST/SHOULD | Phase 10 |
| EPIC 9 — Communication / Notifications | chat locataire↔propriétaire, chat après matching, conversation de groupe, notifications + centre non-lus | SHOULD/COULD | Phase 11 |
| EPIC 10 — Qualité / Projet | Git + CI/CD, responsive, tests unitaires/intégration/acceptation, déploiement, rapport final **LaTeX** | MUST | Phases 13–14 |

**Fonctionnalités IA du PDF (F1–F8) conservées intégralement :**

| # | Fonctionnalité | Epic liée | Type |
|---|----------------|-----------|------|
| F1 | Recherche de logements (localisation, budget, chambres, surface, équipements, disponibilité) | EPIC 3 | Filtres |
| F2 | Recommandation Client → Logement (score %) | EPIC 6 | IA |
| F3 | Recherche de colocataire (budget, fumeur, animaux, propreté, bruit, horaires…) | EPIC 7 | Formulaire |
| F4 | Matching Client → Client (score %) | EPIC 7 | IA |
| F5 | Matching Binôme/Groupe → Logement (budget combiné) | EPIC 8 | IA |
| F6 | Estimation du prix (ML, ex. 850 DT/mois) | EPIC 5 | IA |
| F7 | Détection d'anomalies de prix (signal, jamais « fraude ») | EPIC 5 (US5.5) | IA |
| F8 | Explication des recommandations (transversal F2/F4/F5) | EPIC 6/7 (US6.3, US7.4) | IA |

---

## 4. Choix techniques

### 4.1 Frontend — React
- **Vite + React 18 + TypeScript** ; **React Router v6**
- **TanStack Query** (cache API) + **Zustand** (session, filtres)
- **Axios** avec intercepteur JWT (refresh automatique)
- **Tailwind CSS**, **React Hook Form + Zod**
- Responsive d'abord : layouts mobile-first (exigence US10.2)

### 4.2 Backend — Django
- **Django 5 + Django REST Framework**
- **SimpleJWT** (access 30 min / refresh 7 j), django-cors-headers, django-filter, Pillow
- **PostgreSQL** ; MinIO/S3 pour photos ; **Redis + Celery** (analyse IA à la soumission, scans, ré-entraînement)
- Chat/notifications : **REST + polling** pour le MVP (Temps réel → Django Channels en option Sprint 6)
- **Gunicorn + Nginx** en production ; **django-environ** pour les secrets (`.env` jamais commité)

### 4.3 Outil IA — choix : **scikit-learn + LightGBM + LightFM + SHAP**

> Intégré directement à Django : même langage (pas de micro-service à maintenir), open source,
> adapté aux petits datasets ; un passage à FastAPI dédié reste possible si la charge augmente.

| Fonctionnalité | Outil | Algorithme |
|---|---|---|
| F2 Recommandation logement (US6.2) | scikit-learn → **LightFM** | Content-based (similarité préférences/annonces) dès le départ ; modèle hybride dès ~500 interactions, évalué Precision@K / MAP@10 |
| F4 Matching colocataire (US7.3) | Règles pondérées → scikit-learn | Similarité multi-critères (pénalité forte si fumeur différent ; distance normalisée budget/propreté/bruit) ; Logistic Regression dès ~50 paires accept/rejet |
| F5 Groupe → logement (US8.4) | Réutilisation F2 | Profil combiné : budget_total = somme des membres, préférences = intersection/pondération |
| F6 Estimation de prix | **LightGBM** | Régression (ville, surface, chambres, type, meublé, état, équipements) ; Pipeline `ColumnTransformer` + joblib |
| F7 Prix anormal (US5.5) | **IsolationForest + résidus F6** | \|prix − prix_prédit\| > 3×MAD ; message « Prix potentiellement inhabituel — vérification recommandée » (jamais « fraude ») |
| F8 Explication (US6.3, US7.4) | **SHAP** + templates FR | Top-k contributions → phrases : « Budget compatible », « Localisation recherchée »… |
| US6.1 Recherche en langage naturel | LLM API (ou règles) | Extraction de critères structurés depuis une phrase → payload de filtres F1 |
| US5.1 Description assistée / US5.2 pièces sur photos | LLM (texte/vision) ou CNN pré-entraîné | Génération de description ; classification pièce (salon, chambre…) ; optionnel SHOULD avec gros SP |
| US5.3 Incohérence texte/caractéristiques/photos | Règles + F6 | Contrôle cohérence (ex. « 3 chambres » vs pièces détectées ; prix vs caractéristiques) |

- **Format modèles** : `joblib` + `model_meta.json` (version, métriques, date, features) ; versioning dans `ModelVersion`.
- **Analyse automatique à la soumission (US5.4 MUST)** : signal Celery sur `POST /listings` → F6 + F7 + cohérence → résultats stockés, visibles par l'admin au moment de la validation.

### 4.4 Architecture cible

```
┌──────────────────────┐        ┌─────────────────────────────────────┐
│  React (Vite)        │  API   │  Django + DRF                       │
│  Pages / Composants  │◄──────►│  /api/v1/...                        │
│  TanStack Query      │  JWT   │  ├─ accounts (auth, profils, rôles) │
│  Zustand             │        │  ├─ listings (F1, modération)       │
└──────────────────────┘        │  ├─ matching (F3/F4/F5, groupes)    │
                                │  ├─ ai (F2/F6/F7/F8)  ◄── ml/       │
                                │  ├─ messaging (chat, notifications) │
                                │  └─ core (favoris, signalements)    │
                                └──────┬──────────────┬───────────────┘
                                 PostgreSQL      Redis + Celery
                                       │              │
                                 MinIO (photos)  jobs: analyse, train, scan
```

---

## 5. Modèle de données (Django apps)

### `accounts`
- `CustomUser` (AbstractUser) : `role` ∈ {locataire, proprietaire, admin}, `actif` (suspension US4.2), reset-password (token)
- `ProfilLocataire` : `budget_min/max`, `ville`, `quartier`, `chambres_souhaitees`, `surface_min`, `disponibilite`, `mode_recherche` ∈ {seul, coloc, indefini} (US7.1), `fumeur`, `animaux`, `niveau_proprete` (1–5), `niveau_bruit` (1–5), `horaires`, `visiteurs`, `habitudes`, `veut_colocation`
- `ProfilProprietaire` : agence/nom, téléphone, `verifie`

### `listings`
- `Logement` : `type`, `titre`, `description`, `ville`, `quartier`, `lat/lng`, `surface`, `chambres`, `sdb`, `prix`, `meuble`, `etat`, `disponible_de/jusqua`, **`statut` ∈ {brouillon, en_attente, actif, refuse, loue, archive}** (US2.3–2.7, US4.3–4.4), `proprietaire`
- `Equipement` (M2M), `Photo` (image, ordre)
- **`ModerationDecision`** : `logement`, `admin`, `decision` (accepte/refuse), `justification`, `date` (US4.4)
- **`AnnonceAnalyse`** : `logement`, `prix_estime`, `flag_anomalie`, `incoherences` (JSON), `score_qualite` (US5.3/5.4/5.5/5.6), `modele_version`, `analyse_le`
- **`DescriptionSuggestion`** : texte généré par IA (US5.1, optionnel)

### `matching`
- `Match` : `client_a/b`, `score`, `explications` (JSON), `statut` (en_attente/accepte/rejete) → acceptation mutuelle
- **`GroupeColocation`** : `nom`, `membres` (M2M), `createur`, `budget_total` (proprio : 450+500 = 950), `statut` (actif/dissous) — **le binôme est un groupe de 2** (US8.1–8.6)
- `InvitationGroupe` : `groupe`, `invite`, `statut` (US8.2)
- `MatchLogement` : `cible` (locataire OU groupe), `logement`, `score`, `explications` (JSON)

### `ai`
- `Recommendation` : `user`/`groupe`, `logement`, `score`, `explications`, `modele_version`
- `PriceEstimation` : `logement`, `prix_estime`, `intervalle`, `features` (JSON)
- `AnomalyFlag` : `logement`, `prix_predit`, `residual`, `score_anomalie`, `statut` (a_verifier/valide), `message`
- `ModelVersion` : `nom` (F2/F6/F7), `version`, `chemin`, `metriques` (JSON), `entraine_le`

### `messaging`
- `Conversation` : `participants`, `type` (direct/groupe), `logement` (optionnel), `match` (optionnel)
- `Message` : `conversation`, `expediteur`, `contenu`, `lu`, `created_at` (US9.1–9.3)
- `Notification` : `user`, `type` (logement/match/invitation/message/moderation), `payload`, `lue` (US9.4–9.6)

### `core`
- `Favori` (US3.5), `Signalement` : `cible` (annonce/compte), `user`, `motif`, `statut`, `traité_par` (US4.5–4.6)
- `ContactDemande` : locataire → propriétaire au sujet d'un logement (US3.6)

---

## 6. API REST (préfixe `/api/v1/`)

| Méthode | Route | Rôle / US |
|---|---|---|
| POST | `/auth/register` (choix rôle), `/auth/login`, `/auth/refresh`, `/auth/password/reset` | EPIC 1 |
| GET/PATCH | `/me`, `/me/profile` ; PUT `/me/preferences` | US1.5, US1.6 |
| GET/POST | `/listings/?ville=&prix_max=&chambres=&surface_min=&equipements=&dispo=` | **F1** US3.3 |
| GET/PATCH/DELETE | `/listings/{id}/` ; POST `/listings/{id}/submit` `/rent` `/archive` | US2.x |
| POST | `/listings/{id}/photos` | US2.2 |
| GET | `/recommendations/?limit=10` | **F2** US6.2 (score + explications) |
| GET | `/explain?target=recommendation&id=…` | **F8** US6.3 |
| GET | `/search-natural?q=…` | US6.1 (LLM → critères) |
| PUT | `/roommates/preferences` | **F3** US7.2 |
| GET | `/roommates/suggestions` | **F4** US7.3 |
| POST | `/matches/{id}/accept` \| `/reject` | US7.5 |
| POST/GET | `/groups/` , `/groups/{id}/invite`, `/groups/{id}/leave` | EPIC 8 |
| GET | `/groups/{id}/recommendations` | **F5** US8.4 |
| POST | `/estimate-price` | **F6** |
| GET | `/listings/{id}/price-check` | **F7** US5.5 |
| POST | `/listings/{id}/analyze` (auto à la soumission, Celery) | **US5.4 MUST** |
| GET | `/admin/users/` PATCH suspend ; `/admin/listings/pending/` POST approve/reject ; `/admin/reports/` ; `/admin/anomalies/` ; `/admin/dashboard/` | EPIC 4 |
| GET/POST | `/conversations/`, `/conversations/{id}/messages/` ; GET `/notifications/` | EPIC 9 |
| GET | `/favorites/` POST/DELETE `/favorites/{id}` | US3.5 |

Toute réponse de recommandation porte `score` **et** `explications[]` (F8 construit dès l'origine).

---

## 7. Structure du dossier

```
homey/
├── backend/
│   ├── manage.py
│   ├── config/            # settings, urls, celery
│   ├── apps/
│   │   ├── accounts/      # auth JWT, profils, rôles, reset mdp
│   │   ├── listings/      # F1, statuts, modération, analyse IA
│   │   ├── matching/      # F3/F4/F5, groupes, invitations
│   │   ├── ai/            # endpoints F2/F6/F7/F8, recherche NL
│   │   ├── messaging/     # conversations, notifications
│   │   └── core/          # favoris, signalements, contacts
│   ├── ml/
│   │   ├── datasets/      # CSV + générateur synthétique
│   │   ├── training/      # train_f2, train_f6, scan_f7, explain_f8
│   │   ├── models/        # *.joblib + model_meta.json
│   │   └── services/      # chargement, prédiction, explication
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # axios, hooks TanStack Query
│   │   ├── pages/         # Home, Search, ListingDetail, Recommendations,
│   │   │                  # Roommates, Groups, Chat, OwnerDashboard, Admin*, Estimate
│   │   ├── components/    # ListingCard, ScoreBadge, ExplanationPanel, Filters, ChatWindow
│   │   ├── store/         # Zustand (auth, filtres)
│   │   └── routes/
│   └── package.json
├── rapport/               # rapport final LaTeX (US10.5)
├── docker-compose.yml
└── README.md
```

---

## 8. Méthodologie : Scrum (imposée par le cahier des charges)

- **6 sprints × 2 semaines = 12 semaines** ; Daily standup ; Sprint Review + Rétropective en fin de sprint.
- Product Owner : Mariem — Scrum Master : Salma — Development Team : Salma, Mariem, Mayssa.
- Outils : **JIRA** (backlog, sprint planning, suivi) et **GitHub** (code, versions, historique).
- Backlog priorisé **MUST → SHOULD → COULD** avec story points (total ~250 SP ; ~42 SP/sprint → ne pas tomber sous les MUST).

---

## 9. Toutes les étapes, organisées par sprint

### Sprint 1 (Sem. 1–2) — Fondations, authentification & profils
1. **Environnement** : Git + structure monorepo, venv Python + `requirements.txt`, Vite React TS, docker-compose (Postgres, Redis), Ruff + ESLint, repo GitHub initialisé (US10.1).
2. Django project + apps ; **CustomUser** avec rôles locataire/propriétaire/admin (US1.1, US1.7) ; **SimpleJWT** login/logout/refresh (US1.2) ; reset mot de passe par email token (US1.3) ; changement de mot de passe (US1.4).
3. Profils + préférences de logement (US1.5, US1.6) ; admin Django registrado ; commande `seed` (10 utilisateurs, 50 logements tunisiens : Ariana, Lac 2, Sfax…).
4. Frontend : router, layout responsive, client Axios (intercepteur JWT + refresh), pages Login/Register/Profil/Reset, garde `RequireAuth`, store Zustand `auth`.
5. Tests : API auth (pytest-django) + Vitest sur les formulaires.

### Sprint 2 (Sem. 3–4) — Gestion & recherche des logements
6. **F1 backend** : ViewSet `Logement` + django-filter (ville, prix_max, chambres, surface, équipements, disponibilité), tri, pagination (US3.3, US3.4).
7. CRUD propriétaire (US2.1, US2.3), **photos multiples** (US2.2), consultation « mes annonces » (US2.5), archivage/suppression (US2.4), marquer loué (US2.7).
8. Visiteur : liste + détail sans auth (US3.1, US3.2) ; **favoris** (US3.5) ; contact propriétaire (US3.6).
9. Frontend : **page Recherche** (filtres + grille `ListingCard` + tri/pagination), **fiche logement** (galerie, caractéristiques, favori), espace propriétaire (formulaire annonce + upload).
10. Scénario E2E manuel : inscription → recherche « Ariana, 2 chambres, ≤ 900 DT » → fiche → favori.

### Sprint 3 (Sem. 5–6) — Administration & validation
11. Workflow de **validation** : soumission (US2.6) → file `admin/listings/pending` (US4.3) → accepter/refuser **avec justification** (US4.4) → statut visible côté propriétaire.
12. Gestion utilisateurs : liste, **suspension/blocage/réactivation** (US4.1, US4.2) ; permissions DRIs (un locataire ne voit que ses données).
13. **Signalements** utilisateur (US4.5) + traitement admin (US4.6).
14. **Dashboard statistique** (US4.7) : annonces, utilisateurs, signalements (SQL agrégés + graphiques React).
15. Sprint Review : parcours admin complet de bout en bout.

### Sprint 4 (Sem. 7–8) — IA & recherche intelligente
16. **Dataset** (étape critique) : export annonces seedées + collecte externe (mubawab.tn, respect CGU/robots.txt) ou `generate_dataset.py` synthétique ; feature engineering (one-hot villes/équipements, `prix_par_m2`) ; convention `model_meta.json`.
17. **F6 Estimation** : `train_f6.py` LightGBM, cibles **MAE < 12 % du prix médian, R² > 0.7**, joblib ; endpoint `POST /estimate-price` + page « Estimer un prix » (formulaire propriétaire).
18. **F7 Anomalies** : `scan_f7.py` (résidu > 3×MAD ou IsolationForest) → `AnomalyFlag` ; **analyse automatique à la soumission** via Celery (US5.4 MUST) ; alerte admin prix anormal (US5.5) ; message non accusateur.
19. **F2 Recommandations** : score pondéré réglable (`reco_weights.py`, cold start content-based) ; `GET /recommendations` avec score + explications ; page « Pour vous ».
20. **F8 Explication** : helper `explain.py` + templates FR (« Budget compatible », « Localisation recherchée »…) ; composant `ExplanationPanel` ; test : **tout score affiché ≥ 1 explication**.
21. Sprint Review : démo F6 → F7 → F2 → F8 avec métriques affichées.

### Sprint 5 (Sem. 9–10) — Colocation, matching & communication
22. **Mode de recherche** seul/coloc/indécis (US7.1) ; formulaire **préférences de colocation F3** (US7.2).
23. **F4 Matching** : similarité pondérée par critère → score 0–100 **avec détail par critère** (US7.3, US7.4) ; suggestions de paires ; accepter/refuser (US7.5).
24. **Groupes (EPIC 8)** : création (US8.1), invitation après choix d'un logement ou d'abord un colocataire (US8.2, US8.3), quitter/dissoudre (US8.5).
25. **F5 Groupe → logement** : `group_profile()` (budget_total, intersection préférences) → recommandeur F2 avec explications (« Budget combiné 950 DT compatible ») ; page « Recommandations du groupe » (US8.4).
26. **Chat** : conversations directes (US9.1, US9.2) + REST polling, conversations de groupe (US9.3) ; **notifications** + centre avec compteur (US9.4–9.6).
27. Sprint Review : démo parcours complet « je cherche une colocation ».

### Sprint 6 (Sem. 11–12) — IA avancée, tests & déploiement
28. **IA avancée (selon capacités, priorité SHOULD/COULD)** : recherche en langage naturel (US6.1), description assistée IA (US5.1), reconnaissance des pièces sur photos (US5.2), incohérence texte/photos (US5.3), score qualité annonce (US5.6), profil comportemental (US6.4) ; passage **LightFM** si interactions suffisantes (battre la v1 en MAP@10).
29. **Tests** (US10.3) : couverture backend > 80 % (API, moteurs de score, services ML avec fixtures factices), Vitest frontend, tests d'acceptation des US MUST.
30. **Sécurité & perf** : throttling, validation uploads, CORS strict, secrets `.env`, headers sécurité, `select_related`/index DB, cache Redis des recommandations (TTL 15 min).
31. **CI/CD** (US10.1) : GitHub Actions — Ruff + pytest | ESLint + Vitest + build ; déploy staging.
32. **Déploiement** (US10.4) : Dockerfiles, compose prod, Nginx + HTTPS, VPS, Sentry, `pg_dump` quotidien ; environnement de démonstration.
33. **Rapport final LaTeX** (US10.5) + Sprint Review finale & rétrospective.

---

## 10. Planning récapitulatif (12 semaines / 6 sprints)

| Sprint | Semaines | Livrables |
|---|---|---|
| S1 | 1–2 | Auth JWT, rôles, profils, préférences, coque frontend |
| S2 | 3–4 | **F1 recherche** complète + annonces CRUD + favoris + photos |
| S3 | 5–6 | Modération, signalements, dashboard, contrôle d'accès |
| S4 | 7–8 | Dataset + **F6** + **F7** + **F2** + **F8** (cœur IA) |
| S5 | 9–10 | **F3/F4** coloc, **groupes**, **F5**, chat + notifications |
| S6 | 11–12 | IA avancée, tests, CI/CD, déploiement, rapport LaTeX |

## 11. Critères d'acceptation

- [ ] **F1** : filtres combinés instantanés, tri/pagination, fiche complète, favoris, visiteur sans compte
- [ ] **F2** : top-K avec score 0–100 **et** explications affichées (US6.2 + US6.3)
- [ ] **F3** : formulaire de préférences sauvegardé et modifiable
- [ ] **F4** : score par paire + critères communs/divergents visibles ; acceptation mutuelle → groupe
- [ ] **F5** : recommandations filtrées sur le budget combiné du groupe (ex. 950 DT)
- [ ] **F6** : estimation avec fourchette ; MAE/RMSE/R² documentés dans `model_meta.json`
- [ ] **F7** : prix inhabituel signalé à l'admin avec message non accusateur ; analyse auto à la soumission (US5.4)
- [ ] **F8** : toute recommandation ouvre « Pourquoi ce résultat ? »
- [ ] **Modération** : annonce soumise → validée/refusée avec justification → statut visible
- [ ] **Chat & notifications** : échanger avec un propriétaire, compteur non-lus
- [ ] **Qualité** : tests CI verts, responsive mobile, déploiement HTTPS, rapport LaTeX rendu

## 12. Risques & pistes futures

**Risques** : volume de données insuffisant pour F2 (mitigé : cold start content-based + données synthétiques) ; LLM payant pour US6.1/US5.1 (mitigé : optionnel, ou modèle local Ollama) ; scope trop large (mitigé : respecter MUST d'abord, SHOULD/COULD en Sprint 6 uniquement si avance).

**Pistes futures** : WebSocket temps réel (Django Channels), carte interactive (Leaflet + géocodage), notation des colocataires (améliore F4 supervisé), explications en langage naturel via LLM branché sur SHAP, application mobile React Native partageant le même API.

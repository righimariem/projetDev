# Guide de test — Sprints 1 à 6 (HOMEY)

## 1. Tests automatisés (rapides)

```bash
# Backend — 98 tests (auth, F1, favoris, modération, admin, IA, colocation, chat, sécurité)
cd backend
.venv/Scripts/python.exe -m pytest

# Un seul sprint :
.venv/Scripts/python.exe -m pytest listings/tests.py           # F1 (Sprint 2)
.venv/Scripts/python.exe -m pytest accounts/tests.py            # Auth (Sprint 1)
.venv/Scripts/python.exe -m pytest core/tests.py                # Favoris
.venv/Scripts/python.exe -m pytest tests/test_sprint3.py        # Admin (Sprint 3)
.venv/Scripts/python.exe -m pytest tests/test_sprint6.py        # Sécurité (Sprint 6)

# Frontend — lint + tests composants (Vitest) + build
cd ../frontend
npm run lint
CI=true npm run test          # 9 tests (store auth, ListingCard, RequireAuth, page reco)
npm run build
```

Résultat attendu : `98 passed` côté backend, `9 passed` côté frontend, `✓ built`.
Lint : `ruff check .` (backend) et `npm run lint` (frontend) doivent être silencieux.
Couverture backend mesurée : **90 %** (`pytest --cov`) — exigence > 80 % (US10.3).

Les tests frontend utilisent Vitest + Testing Library ; les redirections React Router
sont mockées dans les tests de garde de routes (le routeur réel n'atteint jamais une
navigation conditionnelle dans jsdom, ce qui ferait hanguer la suite).

## 2. Démarrer l'application

```bash
# Terminal 1 — backend (port 8000)
cd backend
.venv/Scripts/python.exe manage.py runserver 8000

# Terminal 2 — frontend (port 5173)
cd frontend
npm run dev
```

Ouvrir **http://localhost:5173** — le proxy transmet `/api` et `/media` au backend.

Base vide ou à réinitialiser :
```bash
cd backend
.venv/Scripts/python.exe manage.py seed --reset   # supprime les données démo
.venv/Scripts/python.exe manage.py seed           # recrée 4 comptes + 50 logements
```

## 3. Comptes de démo (mot de passe : `homey2026`)

| Compte | Rôle | Sert à tester |
|---|---|---|
| `demo_locataire` | Locataire | Sprints 1–2 : recherche, favoris, préférences, signalement |
| `demo_proprietaire` | Propriétaire | Publication, « Mes annonces », soumission à validation |
| `demo_admin` | Administrateur | Sprint 3 : modération, signalements, dashboard, suspension |

## 4. Scénario Sprint 1 — Authentification & profils

1. **Inscription** : « S'inscrire » → remplir (ex. `test1`, mot de passe 8+ car.) → rôle **Locataire** → arrive sur l'accueil connecté, badge « (locataire) » en haut à droite.
2. **Déconnexion / connexion** : « Déconnexion » puis « Connexion » avec `demo_locataire` / `homey2026` → OK.
3. **Mot de passe court** : réessiner l'inscription avec `abc` → message d'erreur (refusé, 8 caractères min.).
4. **Rôle admin impossible** via le formulaire (API le refuse en 400).
5. **Route protégée** : sans se connecter, aller sur `http://localhost:5173/annonces/nouvelle` → redirection vers `/connexion`.

## 5. Scénario Sprint 2 — Logements & recherche (F1)

1. **Recherche** : menu « Rechercher ».
   - Ville `Ariana` → **4 résultats** (seed) ;
   - Ville `Ariana` + budget max `700` → **2 résultats** ;
   - Chambres min `3` → **24 résultats** ; équipements `Climatisation,Wifi` → **5 résultats** ;
   - Trier par « Prix croissant » → ordre croissant vérifiable à l'œil.

   *(Ces chiffres sont constants : le seed est reproductible (`random.seed(42)`) ; après `seed --reset` + `seed`, ils reviennent toujours à ces valeurs.)*
2. **Pagination** : « Suivant / Précédent » en bas de liste (50+ annonces au total).
3. **Fiche logement** : cliquer une carte → titre, prix, prix au m², caractéristiques, équipements.
4. **Favoris** : connecté (`demo_locataire`), « ♥ Ajouter aux favoris » sur une fiche → menu « Favoris » → l'annonce y figure ; re-cliquer sur le bouton favori de la fiche la retire (toggle).
5. **Publication** : `demo_proprietaire` → « Publier » → remplir (titre, ville, prix, surface) → redirection vers la fiche publiée.
6. **Propriétaire uniquement** : connecté en locataire, ouvrir `http://localhost:5173/annonces/nouvelle` → redirection (route protégée) ; et via l'API, un locataire reçoit 403 en POST `/logements/`.
7. **Annonces non actives invisibles** : un visiteur ne voit que les annonces `actif`.

## 6. Scénario Sprint 3 — Administration & modération

> Données de départ du seed : `demo_proprietaire` possède déjà 1 annonce **En attente**, 1 **Refusée** et 1 **Louvée** — le cycle complet est testable immédiatement, sans préparation.

### A. Cycle de modération (depuis l'interface)

1. `demo_proprietaire` → « Mes annonces » → l'annonce refusée affiche le badge rouge **Refusé** → clic « **Soumettre à la validation** » → badge amber **En attente de validation**.
2. `demo_admin` (déconnexion d'abord) → menu « **Administration** » → onglet **Modération (1)** → l'annonce y figure.
3. Clic **Refuser** → saisir une justification → le badge passe en **Refusé**. (Rejouer puis **Accepter** pour voir le badge vert **Actif**.)
4. Sans justification (annuler la fenêtre) → rien ne change.

### B. Signalements

1. `demo_locataire` → fiche d'une annonce → « Signaler cette annonce » → motif (ex. « Photos trompeuses ») → message de confirmation.
2. `demo_admin` → Administration → onglet **Signalements** → le signalement apparaît → « Marquer traité » → le compteur de l'onglet tombe à 0.

### C. Suspension d'un compte

1. `demo_admin` → onglet **Utilisateurs** → « Suspendre » sur `demo_locataire` → statut rouge **Suspendu**.
2. Se déconnecter, puis tenter de se connecter en `demo_locataire` / `homey2026` → **échec** (identifiants refusés).
3. Reconnecté en admin → « **Réactiver** » → la connexion `demo_locataire` fonctionne à nouveau.

### D. Dashboard

`demo_admin` → onglet **Tableau de bord** : effectifs utilisateurs, annonces actives/en attente/refusées, prix moyen, signalements. Les compteurs bougent après les tests A–C.

### E. Contrôle d'accès

Connecté en `demo_locataire`, ouvrir `http://localhost:5173/admin` → redirection (route protégée) ; via l'API, `GET /api/v1/admin/dashboard/` avec son token → **403**.

## 7. Scénario API complet (optionnel, curl)

Réjoue le Sprint 3 entièrement en ligne de commande (création d'annonce → soumission → refus justifié → signalement traité → suspension → réactivation → dashboard) :

```bash
# Login admin
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_admin","password":"homey2026"}' | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

# File de modération, dashboard, signalements
curl -s http://localhost:8000/api/v1/admin/annonces/en-attente/ -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/api/v1/admin/dashboard/ -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:8000/api/v1/admin/signalements/?statut=nouveau" -H "Authorization: Bearer $TOKEN"
```

## 8. Sprint 4 — Les briques IA (F6, F7, F2/F8)

### Tests automatisés
```bash
cd backend
.venv/Scripts/python.exe -m pytest tests/test_sprint4.py   # 15 tests IA
.venv/Scripts/python.exe -m pytest                         # 58 tests au total
```
Critères du plan vérifiés par les tests : **MAE < 12 % du prix médian** et **R² > 0.7**.

### Préparer le modèle (une fois)
```bash
.venv/Scripts/python.exe manage.py train_prix    # entraîne F6 (affiche les métriques)
.venv/Scripts/python.exe manage.py scan_anomalies  # signale les prix inhabituels (F7)
```
Le modèle entraîné est dans `backend/ml/models/prix.joblib` (+ `prix_meta.json`).
Refaites `train_prix` après un `seed --reset` pour réaligner le modèle sur les nouvelles données.

### Parcours manuel (connecté)
1. **F6 — Estimer un prix** : menu « Estimer un prix » → par défaut Ariana 100 m² meublé → « Estimer le prix » → bandeau **872 DT/mois**, fourchette 710–1034 DT, métriques du modèle.
2. **F2/F8 — Pour vous** : menu « Pour vous ✨ » → cartes avec badge « X % compatible » → déplier « **Pourquoi ce logement ?** » → liste des critères avec points (Budget 30/30, Localisation 15/15…) et score final.
3. **F7 — fiche annonce** : ouvrir l'annonce « Test anomalie F7 » (Ariana, 4000 DT) → bloc « Avis du modèle ML » : 4000 DT vs 976 DT estimés (+309,8 %) + message « prix inhabituel, vérification recommandée » (jamais « fraude »).
4. **F7 — admin** : `demo_admin` → Administration → onglet **Anomalies IA (1)** → « Vérifié » → l'alerte disparaît.
5. **Contrôle d'accès** : un locataire sur `/admin/anomalies/` reçoit 403.

> L'annonce « Test anomalie F7 » sert de démonstration F7 ; elle disparaît avec `seed --reset` (recréez-la alors avec `scan_anomalies`).

## 9. Sprint 5 — Colocation, matching & communication (F3, F4, F5, chat)

### Tests automatisés
```bash
cd backend
.venv/Scripts/python.exe -m pytest tests/test_sprint5.py   # 20 tests Sprint 5
.venv/Scripts/python.exe -m pytest                          # 77 tests au total
```
Critères couverts : score F4 avec détail par critère (10 critères, total 100),
acceptation mutuelle → groupe, budget combiné F5 (450 + 500 = 950 DT),
isolation des conversations/notifications, refresh token de compte supprimé → 401.

### Préparer les données (une fois)
Après un `seed --reset`, les profils de colocation sont recréés :
`demo_locataire` (450 DT) et `demo_locataire2` (500 DT) sont configurés « coloc »
avec des habitudes quasi identiques → compatibilité élevée attendue.
Refaites `train_prix` + `scan_anomalies` après chaque ré-ensemencement (cf. §8).

### Parcours manuel (connecté en `demo_locataire`)
1. **F3 — préférences** : menu « Colocation » → formulaire « Mes critères de colocation »
   (mode seul/coloc/indécis, budget, ville, fumeur, animaux, horaires, propreté, bruit,
   habitudes) → modifier un champ → « Préférences enregistrées ✓ ».
2. **F4 — suggestions** : onglet « Colocataires compatibles » → `demo_locataire2`
   en tête avec badge « X % compatible » → déplier « **Pourquoi … ?** » → les 10 critères
   avec points (Budget 20/20, Tabagisme 15/15…) et les points de vigilance.
3. **F4 — acceptation** : « Proposer un binôme » → en attente → déconnexion/reconnexion en
   `demo_locataire2` → la proposition apparaît (avec notification 🔔) → « Accepter » →
   **le groupe « Colocation Aya & Yasmine » est créé** avec les 2 membres.
4. **F5 — reco groupe** : onglet « Mes groupes (1) » → « Voir les recommandations du
   groupe » → bandeau **Budget combiné : 950 DT (2 membres · Ariana)** → déplier
   « Pourquoi ce logement pour le groupe ? » → 1ʳᵉ explication « Budget combiné 950 DT … ».
5. **Groupes (EPIC 8)** : « + Créer un groupe », invitation d'un profil via le sélecteur
   « Inviter dans un groupe… » (invitation visible côté invité, acceptation/refus),
   « 💬 Discuter » ouvre la conversation de groupe, quitter/dissoudre selon les rôles.
6. **Chat (US9.1)** : fiche logement → « ✉️ Contacter le propriétaire » → redirection vers
   `/messages` avec la conversation ouverte → envoyer un message.
7. **Chat groupe (US9.3)** : depuis la page Colocation → « 💬 Discuter » → fil de messages
   avec polling (3 s) et bulles horodatées.
8. **Notifications (US9.4–9.6)** : cloche 🔔 dans l'en-tête avec compteur → panneau avec
   titre/corps/lien → clic sur une notification = marquée lue + navigation ;
   « Tout marquer lu » remet le compteur à 0.
9. **Contrôle d'accès** : un propriétaire n'a pas de lien « Colocation » ; via l'API,
   `GET /api/v1/colocation/suggestions/` avec un token proprio → **403** ;
   un non-membre sur `GET /api/v1/conversations/{id}/` → **403**.

### Scénario API complet (optionnel)
Les 10 étapes du scénario bout-en-bout (logins → F3 → F4 → acceptation → groupe →
F5 950 DT → chat groupe → chat direct → notifications → isolation 403) se rejouent
via un script Python utilisant `urllib` contre `http://localhost:8000/api/v1/`
(même enchaînement que les tests d'intégration).

## 10. Sprint 6 — Sécurité, CI/CD, déploiement

### Tests automatisés
```bash
cd backend
.venv/Scripts/python.exe -m pytest tests/test_sprint6.py   # 17 tests : NL, description IA,
                                                          # qualité annonce, refresh token,
                                                          # throttling, isolation
.venv/Scripts/python.exe -m ruff check .                  # lint : silencieux
```

### Vérifications manuelles
1. **Throttling** : 11 logins ratés en ~1 min sur `/api/v1/auth/login/` → le 11ᵉ renvoie
   **429** (limite 10/min sur l'authentification).
2. **Secrets hors du code** : `HOMEY_SECRET_KEY` (et les autres variables du tableau du
   README) sont lues depuis l'environnement ; `.env.example` documente chaque variable,
   `.env` est ignoré par git.
3. **CI/CD (US10.1)** : pousser une branche → GitHub Actions exécute
   `ruff + pytest --cov` (backend) et `oxlint + vitest + build` (frontend).
   Un lint rouge casse la CI.
4. **Déploiement (US10.4)** : `cp .env.example .env` (renseigner les secrets) puis
   `docker compose up --build` → SPA sur http://localhost:8080 (nginx proxy `/api/`
   vers gunicorn, PostgreSQL + Redis persistants).
5. **Rapport final (US10.5)** : `rapport/rapport.tex` compile avec LaTeX
   (pdflatex ou `tools/tectonic.exe rapport.tex` en bas binaire unique) → 14 pages,
   table des matières et bibliographie incluses.

## 11. Points de vigilance connus

- Un token JWT déjà émis reste valable 30 min même après une suspension ; le blocage est effectif à la prochaine connexion.
- Le formulaire d'administration utilise une fenêtre native pour la justification (attente d'un modal dans une version ultérieure).
- Au re-lancement du seed, les annonces de test des scénarios précédents ont disparu : refaire `seed` avant chaque grande passe de test.

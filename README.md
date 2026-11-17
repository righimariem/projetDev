# HOMEY 🏡

Plateforme tunisienne de location de logements : recherche d'annonces (F1), estimation de prix
par ML (F6), recommandations explicables (F4), recherche en langage naturel (F8), alertes
d'anomalies de prix (F7), messagerie, colocation.

**Stack** : Django 6 + DRF + SimpleJWT (backend) · React 19 + Vite + TypeScript + Tailwind
(frontend) · scikit-learn / LightGBM (ML) · PostgreSQL + Redis (production).

---

## Interface de démonstration

Le frontend reprend l'expérience de la vidéo `homeyvid2.mp4` sous `frontend/src/homey/` :
accueil, exploration, fiche logement, recherche en langage naturel, colocation, messagerie,
espace propriétaire et administration. L'interface est en anglais et fonctionne sans backend :
les données de démo sont conservées dans le `localStorage` du navigateur (clé `homey-demo-v1`).
Le backend Django reste inchangé.

Comptes de démonstration (mot de passe `homey2026`, ou bouton « Fill demo credentials ») :

| Rôle | Email |
|---|---|
| Locataire | `amira.khelifi@example.com` |
| Propriétaire | `youssef.benali@example.com` |
| Administrateur | `sofia.naceur@example.com` |

La photo de la page d'accueil est illustrée par des images locales (`frontend/public/photos/`,
source Unsplash). Les pages françaises d'origine (`frontend/src/pages/`) restent dans le dépôt
et leurs tests continuent de passer, mais ne sont plus routées par `App.tsx`.

---

## Développement local

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed            # 10 utilisateurs, 50 logements tunisiens
python manage.py runserver       # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxy /api → :8000)
```

### Tests
```bash
# Backend : pytest (98 tests) + lint
cd backend && python -m ruff check . && python -m pytest

# Frontend : oxlint + vitest + build
cd frontend && npm run lint && CI=true npm run test && npm run build
```

---

## Configuration (secrets hors du code)

```bash
cp .env.example .env              # puis renseigner HOMEY_SECRET_KEY, etc.
```

Variables principales (voir [.env.example](.env.example)) :

| Variable | Rôle |
|---|---|
| `HOMEY_SECRET_KEY` | Clé Django/JWT — **obligatoire** en prod |
| `HOMEY_DEBUG` | `0` en prod (active HSTS, SSL redirect, cookies HttpOnly) |
| `HOMEY_ALLOWED_HOSTS` | Hôtes autorisés, séparés par des virgules |
| `HOMEY_DB_HOST` / `HOMEY_DB_*` | PostgreSQL (si `HOMEY_DB_HOST` vide → SQLite dev) |
| `HOMEY_REDIS_URL` | Cache Redis (vide → locmem dev) |
| `HOMEY_SENTRY_DSN` | Monitoring erreurs (optionnel) |

---

## Déploiement (US10.4)

### Environnement de démonstration (Docker)

```bash
cp .env.example .env             # renseigner HOMEY_SECRET_KEY, HOMEY_DB_PASSWORD…
docker compose up --build
```

| Service | Rôle | Port |
|---|---|---|
| `frontend` | nginx : SPA React + proxy `/api/` | http://localhost:8080 |
| `backend` | gunicorn (3 workers), migrations au démarrage | interne :8000 |
| `db` | PostgreSQL 16 (volume `pgdata`) | interne :5432 |
| `redis` | Redis 7 (cache, volume `redisdata`) | interne :6379 |

Les modèles ML (`backend/ml/models/*.joblib`) sont copiés dans l'image ; le dossier
`mlmodels` et le dossier `media` (photos) sont des volumes persistants.

### Production (VPS + HTTPS)

1. Installer Docker + `docker compose` sur le VPS, cloner le dépôt, créer `.env`
   (`HOMEY_DEBUG=0`, `HOMEY_SECRET_KEY` généré, `HOMEY_ALLOWED_HOSTS=homey.exemple.tn`).
2. `docker compose up -d --build` puis ouvrir les ports 80/443 sur le pare-feu.
3. HTTPS avec certbot (une fois les conteneurs lancés) :
   ```bash
   certbot certonly --webroot -w ./certbot/www -d homey.exemple.tn
   ```
   puis décommenter le bloc `server 443 ssl` fourni dans `frontend/nginx.conf.example`
   et recharger nginx (`docker compose exec frontend nginx -s reload`).
4. Sauvegarde quotidienne de la base :
   ```bash
   crontab -e
   # 0 3 * * * docker compose exec -T db pg_dump -U homey homey | gzip > /var/backups/homey-$(date +\%F).sql.gz
   ```
5. Sentry : définir `HOMEY_SENTRY_DSN` dans `.env` (erreurs remontées automatiquement).

### CI/CD (US10.1)

GitHub Actions — [.github/workflows/ci.yml](.github/workflows/ci.yml) :
- **backend** : `ruff check` + `pytest --cov`
- **frontend** : `oxlint` + `vitest` + `tsc && vite build`

---

## Structure

```
homey/
├── backend/            # Django : accounts, listings, matching, ai, messaging, core
│   ├── tests/          # pytest-django (98 tests, couverture > 80 %)
│   └── ml/             # entraînement F6/F7, services de prédiction
├── frontend/           # React + Vite (pages, store Zustand, composants)
├── rapport/            # rapport final LaTeX (US10.5)
├── .github/workflows/  # CI
├── docker-compose.yml
└── .env.example
```

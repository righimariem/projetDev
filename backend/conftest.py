"""Fixtures partagées pytest.

- `client` = APIClient DRF (au lieu du Client Django simple).
- HOMEY_MODELE_DIR : les modèles entraînés pendant les tests vont dans un
  dossier temporaire — ils ne doivent JAMAIS écraser le modèle de production
  (ml/models/prix.joblib) utilisé par le serveur.
"""
import os
import tempfile

import pytest
from rest_framework.test import APIClient

os.environ['HOMEY_MODELE_DIR'] = tempfile.mkdtemp(prefix='homey_modeles_test_')


@pytest.fixture()
def client():
    return APIClient()


@pytest.fixture(scope='session', autouse=True)
def modele_prix_session():
    """Entraîne une fois un modèle F6 valide pour tous les tests d'endpoints."""
    from ml.datasets import synthetic
    from ml.services.price import invalider_cache
    from ml.training import train_f6

    meta = train_f6.entrainer(synthetic.generer(1500, seed=42))
    invalider_cache()
    yield meta
    invalider_cache()

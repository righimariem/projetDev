"""Commande : entraîne le modèle F6 (prix) et enregistre la version en DB."""
import json

from django.core.management.base import BaseCommand

from ai.models import ModelVersion
from ml.datasets import synthetic
from ml.services.price import invalider_cache
from ml.training import train_f6


class Command(BaseCommand):
    help = "Entraîne le modèle d'estimation de prix (F6)."

    def add_arguments(self, parser):
        parser.add_argument('--n', type=int, default=2500, help='Échantillons synthétiques')
        parser.add_argument('--seed', type=int, default=42)

    def handle(self, *args, **options):
        df = synthetic.dataset_complet(n_synth=options['n'], seed=options['seed'])
        self.stdout.write(f'Dataset : {len(df)} lignes (DB + synthétique)')

        meta = train_f6.entrainer(df)
        invalider_cache()

        ok = train_f6.accepte(meta)
        ModelVersion.objects.create(
            nom=ModelVersion.Nom.PRIX,
            version=meta['version'],
            chemin=str(train_f6.chemin_modele()),
            metriques=meta,
            actif=True,
        )
        # Une seule version active à la fois
        ModelVersion.objects.filter(
            nom=ModelVersion.Nom.PRIX
        ).exclude(version=meta['version']).update(actif=False)

        style = self.style.SUCCESS if ok else self.style.WARNING
        self.stdout.write(style(
            f"Modèle v{meta['version']} — MAE {meta['mae']} DT "
            f"({meta['mae_pct_median']} % du médian), R² {meta['r2']}, "
            f"cible {'ATTEINTE' if ok else 'NON ATTEINTE (MAE<12 % et R²>0.7)'}"
        ))
        self.stdout.write(json.dumps(meta, indent=2, ensure_ascii=False))

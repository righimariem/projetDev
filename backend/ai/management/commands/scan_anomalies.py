"""Commande : scanne les annonces actives et signale les prix inhabituels (F7)."""
import pandas as pd
from django.core.management.base import BaseCommand

from ai.models import AnomalyFlag, ModelVersion
from listings.models import Logement
from ml.services.price import ModeleAbsent, _charger
from ml.training import scan_f7
from ml.training.train_f6 import construire_features


class Command(BaseCommand):
    help = "Détecte les logements au prix inhabituel (F7)."

    def add_arguments(self, parser):
        parser.add_argument('--seuil', type=float, default=scan_f7.SEUIL_MAD)

    def handle(self, *args, **options):
        try:
            modele, meta = _charger()
        except ModeleAbsent:
            self.stderr.write(self.style.ERROR("Modèle absent : lancez d'abord `manage.py train_prix`."))
            return

        actifs = list(
            Logement.objects.filter(statut=Logement.Statut.ACTIF).prefetch_related('equipements')
        )
        if not actifs:
            self.stdout.write('Aucune annonce active à scanner.')
            return

        rows = []
        for log in actifs:
            rows.append({
                'logement': log,
                'ville': log.ville, 'type': log.type, 'etat': log.etat, 'meuble': bool(log.meuble),
                'surface': log.surface, 'chambres': log.chambres, 'sdb': log.sdb,
                'nb_equipements': log.equipements.count(), 'age_annonces_ville': 30.0,
                'prix': log.prix,
            })
        df = pd.DataFrame(rows)
        df_feat = construire_features(df.drop(columns=['logement']))
        pred = modele.predict(df_feat)

        flags = scan_f7.detecter_anomalies(df, lambda d: pred, seuil_mad=options['seuil'])

        # Reset des alertes non traitées (recalcul complet à chaque scan)
        AnomalyFlag.objects.filter(statut=AnomalyFlag.Statut.A_VERIFIER).delete()

        for f in flags:
            logement = df.iloc[f['index']]['logement']
            AnomalyFlag.objects.create(
                logement=logement,
                prix_predit=f['prix_predit'],
                ecart_pct=f['ecart_pct'],
                message=f['motif'],
            )

        ModelVersion.objects.update_or_create(
            nom=ModelVersion.Nom.ANOMALIE, version=meta.get('version', 'inconnu'),
            defaults={'chemin': 'scan_f7', 'metriques': {'n_signales': len(flags),
                                                          'n_scannes': len(actifs)}},
        )

        self.stdout.write(self.style.SUCCESS(
            f"{len(flags)} anomalie(s) sur {len(actifs)} annonces actives scannées."
        ))
        for f in flags:
            logement = df.iloc[f['index']]['logement']
            sens = 'surpayé' if f['haut'] else 'sous-payé'
            self.stdout.write(
                f"  [!] {logement.titre} ({logement.ville}) — {f['prix']} DT vs "
                f"{f['prix_predit']} DT estimes ({f['ecart_pct']:+.1f} %, {sens})"
            )

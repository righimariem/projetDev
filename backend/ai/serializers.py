from rest_framework import serializers

from .models import AnnonceAnalyse, AnomalyFlag, ModelVersion


class ModelVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelVersion
        fields = ['id', 'nom', 'version', 'metriques', 'actif', 'entraine_le']


class AnomalyFlagSerializer(serializers.ModelSerializer):
    logement_titre = serializers.CharField(source='logement.titre', read_only=True)
    logement_ville = serializers.CharField(source='logement.ville', read_only=True)
    logement_prix = serializers.IntegerField(source='logement.prix', read_only=True)
    traite_par_nom = serializers.CharField(source='traite_par.username', read_only=True)

    class Meta:
        model = AnomalyFlag
        fields = [
            'id', 'logement', 'logement_titre', 'logement_ville', 'logement_prix',
            'prix_predit', 'ecart_pct', 'message', 'statut',
            'traite_par', 'traite_par_nom', 'created_at',
        ]


class AnnonceAnalyseSerializer(serializers.ModelSerializer):
    """Analyse IA d'une annonce (US5.3/US5.4/US5.6)."""

    class Meta:
        model = AnnonceAnalyse
        fields = [
            'logement', 'prix_estime', 'flag_anomalie', 'message_anomalie',
            'incoherences', 'score_qualite', 'points_forts', 'points_faibles',
            'modele_version', 'analyse_le',
        ]

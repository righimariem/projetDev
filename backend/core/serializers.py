from rest_framework import serializers

from .models import Signalement


class SignalementSerializer(serializers.ModelSerializer):
    signaleur_nom = serializers.CharField(source='signaleur.username', read_only=True)
    traite_par_nom = serializers.CharField(source='traite_par.username', read_only=True)

    class Meta:
        model = Signalement
        fields = [
            'id', 'signaleur', 'signaleur_nom', 'cible_type', 'cible_id',
            'motif', 'statut', 'traite_par', 'traite_par_nom', 'created_at',
        ]
        read_only_fields = ['signaleur', 'statut', 'traite_par', 'created_at']

    def validate_motif(self, value):
        if not value.strip():
            raise serializers.ValidationError('Le motif est obligatoire.')
        return value.strip()

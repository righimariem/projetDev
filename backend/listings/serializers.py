from rest_framework import serializers

from .models import Equipement, Logement, ModerationDecision, Photo


class EquipementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipement
        fields = ['id', 'nom']


class PhotoSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)

    class Meta:
        model = Photo
        fields = ['id', 'image', 'ordre']


class LogementSerializer(serializers.ModelSerializer):
    equipements = serializers.SlugRelatedField(
        slug_field='nom', many=True, queryset=Equipement.objects.all(), required=False
    )
    photos = PhotoSerializer(many=True, read_only=True)
    prix_par_m2 = serializers.SerializerMethodField()
    proprietaire_nom = serializers.CharField(source='proprietaire.username', read_only=True)

    class Meta:
        model = Logement
        fields = [
            'id', 'type', 'titre', 'description', 'ville', 'quartier',
            'latitude', 'longitude', 'surface', 'chambres', 'sdb', 'prix',
            'prix_par_m2', 'meuble', 'etat', 'disponible_de', 'disponible_jusqua',
            'statut', 'equipements', 'photos', 'proprietaire', 'proprietaire_nom',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['proprietaire', 'created_at', 'updated_at']

    def get_prix_par_m2(self, obj):
        return round(obj.prix / obj.surface, 1) if obj.surface else None


class LogementCreateSerializer(serializers.ModelSerializer):
    """Validation côté client (F6) : champs minimaux pour publier."""

    equipements = serializers.SlugRelatedField(
        slug_field='nom', many=True, queryset=Equipement.objects.all(), required=False
    )

    class Meta:
        model = Logement
        fields = [
            'id', 'type', 'titre', 'description', 'ville', 'quartier',
            'latitude', 'longitude', 'surface', 'chambres', 'sdb', 'prix',
            'meuble', 'etat', 'disponible_de', 'disponible_jusqua',
            'statut', 'equipements',
        ]

    def validate(self, attrs):
        if attrs.get('prix', 1) <= 0:
            raise serializers.ValidationError({'prix': 'Le prix doit être positif.'})
        if attrs.get('surface', 1) <= 0:
            raise serializers.ValidationError({'surface': 'La surface doit être positive.'})
        return attrs


class ModerationDecisionSerializer(serializers.ModelSerializer):
    """Décision d'admin : accepté/refusé + justification (US4.4)."""

    admin_nom = serializers.CharField(source='admin.username', read_only=True)

    class Meta:
        model = ModerationDecision
        fields = ['id', 'logement', 'admin', 'admin_nom', 'decision', 'justification', 'created_at']
        read_only_fields = ['admin', 'created_at']

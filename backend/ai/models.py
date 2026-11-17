from django.conf import settings
from django.db import models


class ModelVersion(models.Model):
    """Version d'un modèle ML entraîné (F6/F7 — traçabilité métriques)."""

    class Nom(models.TextChoices):
        PRIX = 'prix', 'Estimation de prix (F6)'
        ANOMALIE = 'anomalie', 'Détection d anomalies (F7)'
        RECO = 'reco', 'Recommandation (F2)'

    nom = models.CharField(max_length=20, choices=Nom.choices)
    version = models.CharField(max_length=40)
    chemin = models.CharField(max_length=255)
    metriques = models.JSONField(default=dict)  # {mae, rmse, r2, n, ...}
    actif = models.BooleanField(default=True)
    entraine_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-entraine_le']

    def __str__(self):
        return f'{self.get_nom_display()} v{self.version}'


class Recherche(models.Model):
    """Historique des recherches de l'utilisateur (US6.4 — profil comportemental).

    Alimente les recommandations F2 : une annonce dans une ville recherchée
    récemment reçoit un bonus comportemental explicite (« Correspond à vos
    recherches récentes »).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recherches'
    )
    requete = models.CharField(max_length=200, blank=True)  # phrase NL éventuelle
    filtres = models.JSONField(default=dict, blank=True)  # critères F1 appliqués
    nb_resultats = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Recherche de {self.user.username}: {self.requete or self.filtres}'


class AnnonceAnalyse(models.Model):
    """Résultat de l'analyse IA d'une annonce (US5.3, US5.4, US5.6).

    Produite automatiquement à la soumission (US5.4 MUST) : estimation F6,
    incohérences texte/caractéristiques/photos (US5.3, règles non accusatrices)
    et score de qualité 0-100 (US5.6).
    """

    logement = models.OneToOneField(
        'listings.Logement', on_delete=models.CASCADE, related_name='analyse'
    )
    prix_estime = models.PositiveIntegerField(null=True, blank=True)  # F6
    flag_anomalie = models.BooleanField(default=False)  # F7 pour cette annonce
    message_anomalie = models.CharField(max_length=200, blank=True)
    incoherences = models.JSONField(default=list, blank=True)
    # [{code, message, gravite}] — US5.3, visible par l'admin
    score_qualite = models.PositiveSmallIntegerField(default=0)  # US5.6, 0-100
    points_forts = models.JSONField(default=list, blank=True)
    points_faibles = models.JSONField(default=list, blank=True)
    modele_version = models.CharField(max_length=40, blank=True)
    analyse_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-analyse_le']

    def __str__(self):
        return f'Analyse logement {self.logement_id} (qualité {self.score_qualite})'


class AnomalyFlag(models.Model):
    """Alerte F7 : prix inhabituel détecté pour un logement.

    Un signal n'est pas une fraude : « prix potentiellement inhabituel —
    vérification recommandée » (règle du cahier des charges US5.5).
    """

    class Statut(models.TextChoices):
        A_VERIFIER = 'a_verifier', 'À vérifier'
        VALIDE = 'valide', 'Vérifié'

    logement = models.ForeignKey(
        'listings.Logement', on_delete=models.CASCADE, related_name='anomaly_flags'
    )
    prix_predit = models.PositiveIntegerField()  # prix estimé par le modèle F6
    ecart_pct = models.FloatField()  # écart relatif au prix prédit (%)
    message = models.CharField(max_length=200)
    statut = models.CharField(max_length=12, choices=Statut.choices, default=Statut.A_VERIFIER)
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='anomalies_traitees',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('logement', 'statut')

    def __str__(self):
        return f'Anomalie logement {self.logement_id} ({self.ecart_pct:+.0f} %)'

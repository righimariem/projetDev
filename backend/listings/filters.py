import django_filters

from .models import Logement


class LogementFilter(django_filters.FilterSet):
    """Critères de recherche F1 (US3.3)."""

    ville = django_filters.CharFilter(field_name='ville', lookup_expr='iexact')
    quartier = django_filters.CharFilter(field_name='quartier', lookup_expr='icontains')
    type = django_filters.CharFilter(field_name='type')
    prix_min = django_filters.NumberFilter(field_name='prix', lookup_expr='gte')
    prix_max = django_filters.NumberFilter(field_name='prix', lookup_expr='lte')
    chambres_min = django_filters.NumberFilter(field_name='chambres', lookup_expr='gte')
    surface_min = django_filters.NumberFilter(field_name='surface', lookup_expr='gte')
    surface_max = django_filters.NumberFilter(field_name='surface', lookup_expr='lte')
    meuble = django_filters.BooleanFilter(field_name='meuble')
    etat = django_filters.CharFilter(field_name='etat')
    equipements = django_filters.CharFilter(method='filter_equipements')
    disponible_a = django_filters.DateFilter(field_name='disponible_de', lookup_expr='lte')

    class Meta:
        model = Logement
        fields = ['ville', 'type', 'meuble', 'etat']

    def filter_equipements(self, queryset, name, value):
        """equipements=clim,wifi → logements ayant TOUS ces équipements."""
        noms = [n.strip() for n in value.split(',') if n.strip()]
        for nom in noms:
            queryset = queryset.filter(equipements__nom__iexact=nom)
        return queryset

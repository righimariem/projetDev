from django.contrib import admin

from .models import Equipement, Logement, Photo


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 1


@admin.register(Logement)
class LogementAdmin(admin.ModelAdmin):
    list_display = ('titre', 'ville', 'prix', 'surface', 'chambres', 'statut', 'proprietaire')
    list_filter = ('statut', 'ville', 'type', 'meuble')
    search_fields = ('titre', 'ville', 'quartier')
    inlines = [PhotoInline]


admin.site.register(Equipement)
admin.site.register(Photo)

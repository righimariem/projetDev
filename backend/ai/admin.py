from django.contrib import admin

from .models import AnomalyFlag, ModelVersion

admin.site.register(ModelVersion)
admin.site.register(AnomalyFlag)

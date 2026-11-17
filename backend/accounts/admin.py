from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, ProfilLocataire, ProfilProprietaire


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_suspended', 'is_staff')
    list_filter = ('role', 'is_suspended')
    fieldsets = UserAdmin.fieldsets + (
        ('HOMEY', {'fields': ('role', 'telephone', 'is_suspended')}),
    )


admin.site.register(ProfilLocataire)
admin.site.register(ProfilProprietaire)

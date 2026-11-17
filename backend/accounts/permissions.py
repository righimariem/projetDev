from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Accès réservé à l'administrateur (rôle admin, US1.7)."""

    message = 'Accès réservé aux administrateurs.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsProprietaire(permissions.BasePermission):
    """Accès réservé aux propriétaires (US2.x)."""

    message = 'Accès réservé aux propriétaires.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'proprietaire'
        )


class IsOwner(permissions.BasePermission):
    """Objet accessible uniquement à son propriétaire."""

    message = "Vous n'êtes pas propriétaire de cet objet."

    def has_object_permission(self, request, view, obj):
        return getattr(obj, 'proprietaire_id', None) == request.user.id

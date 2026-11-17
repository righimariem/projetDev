// Types partagés de l'API HOMEY

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Equipement {
  id: number
  nom: string
}

export interface Photo {
  id: number
  image: string
  ordre: number
}

export interface Logement {
  id: number
  type: 'appartement' | 'maison' | 'chambre'
  titre: string
  description: string
  ville: string
  quartier: string
  surface: number
  chambres: number
  sdb: number
  prix: number
  prix_par_m2: number | null
  meuble: boolean
  etat: string
  disponible_de: string | null
  disponible_jusqua: string | null
  statut: string
  equipements: string[]
  photos: Photo[]
  proprietaire: number
  proprietaire_nom: string
  created_at: string
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'locataire' | 'proprietaire' | 'admin'
  telephone: string
  is_suspended: boolean
  profil_locataire?: Record<string, unknown> | null
  profil_proprietaire?: Record<string, unknown> | null
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

export interface FiltresRecherche {
  ville?: string
  prix_max?: number
  chambres_min?: number
  surface_min?: number
  meuble?: boolean
  type?: string
  equipements?: string
  ordering?: string
  page?: number
}

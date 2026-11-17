import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'

// ---------- Types de l'API chat (US9.1–9.3) ----------

interface Participant {
  id: number
  username: string
  first_name: string
  last_name: string
}

interface Message {
  id: number
  conversation: number
  expediteur: Participant
  contenu: string
  created_at: string
}

interface Conversation {
  id: number
  type: 'direct' | 'groupe'
  participants: Participant[]
  titre_groupe: string | null
  logement: number | null
  dernier_message: { expediteur: string; contenu: string; created_at: string } | null
  non_lus: number
  updated_at: string
}

// Page « Messages » — chat REST avec polling (3 s) sur la conversation ouverte
export default function MessagesPage() {
  const qc = useQueryClient()
  const moi = useAuthStore((s) => s.user)
  const [params] = useSearchParams()
  const convoInitiale = Number(params.get('conversation')) || null
  const [convoActive, setConvoActive] = useState<number | null>(convoInitiale)
  const [texte, setTexte] = useState('')
  const basRef = useRef<HTMLDivElement>(null)

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<Conversation[]>('/conversations/').then((r) => r.data),
    refetchInterval: 5000, // polling de la liste (US : pas de WebSocket requis)
  })

  // Polling des messages toutes les 3 s uniquement sur la conversation ouverte
  const detail = useQuery({
    queryKey: ['conversation', convoActive],
    enabled: convoActive !== null,
    refetchInterval: 3000,
    queryFn: () =>
      api
        .get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${convoActive}/`)
        .then((r) => r.data),
  })

  const envoyer = useMutation({
    mutationFn: (contenu: string) =>
      api.post(`/conversations/${convoActive}/messages/`, { contenu }).then((r) => r.data),
    onSuccess: () => {
      setTexte('')
      qc.invalidateQueries({ queryKey: ['conversation', convoActive] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  // Dès l'ouverture : on marque la conversation lue (compteur à 0)
  useEffect(() => {
    if (convoActive === null) return
    api.post(`/conversations/${convoActive}/luer/`, {}).then(() => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })
  }, [convoActive, detail.data?.messages.length, qc])

  // Auto-scroll en bas du fil
  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail.data?.messages.length])

  const autre = (c: Conversation) =>
    c.type === 'direct' ? c.participants.find((p) => p.id !== moi?.id) : undefined
  const titre = (c: Conversation) =>
    c.type === 'groupe'
      ? c.titre_groupe || 'Groupe'
      : autre(c)?.first_name || autre(c)?.username || 'Conversation'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-gray-500 text-sm mt-1">
          Discutez avec un propriétaire (US9.1), vos colocataires après matching (US9.2) ou votre groupe (US9.3).
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Liste des conversations */}
        <aside className="bg-white rounded-xl border border-gray-200 divide-y overflow-hidden">
          {conversations.data?.length === 0 && (
            <p className="text-sm text-gray-500 p-4">
              Aucune conversation. Ouvrez-en une depuis une annonce ou après un matching accepté.
            </p>
          )}
          {conversations.data?.map((c) => (
            <button
              key={c.id}
              onClick={() => setConvoActive(c.id)}
              className={`w-full text-left p-3 hover:bg-gray-50 ${
                convoActive === c.id ? 'bg-teal-50' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">
                  {c.type === 'groupe' ? '👥 ' : ''}
                  {titre(c)}
                </span>
                {c.non_lus > 0 && (
                  <span className="bg-teal-600 text-white text-xs rounded-full px-2 py-0.5 shrink-0">
                    {c.non_lus}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {c.dernier_message ? `${c.dernier_message.expediteur} : ${c.dernier_message.contenu}` : '—'}
              </p>
            </button>
          ))}
        </aside>

        {/* Fil de messages */}
        <section className="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col h-[60vh]">
          {convoActive === null ? (
            <p className="text-gray-500 text-sm p-4 self-center mt-8">
              Sélectionnez une conversation.
            </p>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {detail.data?.messages.map((m) => {
                  const mien = m.expediteur.id === moi?.id
                  return (
                    <div key={m.id} className={`flex ${mien ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mien ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {!mien && detail.data?.conversation.type === 'groupe' && (
                          <p className="text-xs font-semibold opacity-70 mb-0.5">
                            {m.expediteur.first_name || m.expediteur.username}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.contenu}</p>
                        <p className={`text-[10px] mt-1 ${mien ? 'text-teal-100' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={basRef} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (texte.trim()) envoyer.mutate(texte.trim())
                }}
                className="border-t p-3 flex gap-2"
              >
                <input
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder="Votre message…"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={!texte.trim() || envoyer.isPending}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-40"
                >
                  Envoyer
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

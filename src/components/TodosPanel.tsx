import { useEffect, useState } from 'react'
import { createSupabaseClient } from '../services/supabaseClient'

type TodoRow = {
  id: number | string
  name: string
}

export function TodosPanel() {
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadTodos = async () => {
      const supabase = createSupabaseClient()

      if (!supabase) {
        if (mounted) {
          setError('Supabase env values are missing.')
          setLoading(false)
        }
        return
      }

      const { data, error: queryError } = await supabase.from('todos').select('id, name').limit(20)

      if (!mounted) {
        return
      }

      if (queryError) {
        setError(queryError.message)
        setLoading(false)
        return
      }

      setTodos((data ?? []) as TodoRow[])
      setLoading(false)
    }

    void loadTodos()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <article className="profile-settings">
      <h2>Supabase Todos</h2>
      {loading && <p>Loading todos...</p>}
      {!loading && error && <p>{error}</p>}
      {!loading && !error && todos.length === 0 && <p>No todos found.</p>}
      {!loading && !error && todos.length > 0 && (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>{todo.name}</li>
          ))}
        </ul>
      )}
    </article>
  )
}

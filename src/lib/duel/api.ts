import { getAuthToken } from 'deepspace'
import type { ActionResponse } from '../../shared/duel-types'

/** Call one of the worker's server actions (src/actions) as the signed-in user. */
export async function callAction<T = unknown>(name: string, params: Record<string, unknown> = {}): Promise<ActionResponse<T>> {
  const token = await getAuthToken()
  if (!token) return { success: false, error: 'You are signed out' }
  try {
    const res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    const json = (await res.json()) as Partial<ActionResponse<T>> & { error?: string }
    if (json.success === true) return json as ActionResponse<T>
    return { success: false, error: json.error ?? `Request failed (${res.status})` }
  } catch {
    return { success: false, error: 'Network error. Check your connection.' }
  }
}

import { cookies } from 'next/headers'
import { authConfig, SESSION_COOKIE, verifySessionToken } from './auth'

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies()
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value, authConfig().secret)
}

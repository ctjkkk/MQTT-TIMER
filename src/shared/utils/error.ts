import { AuthenticateError, AuthErrorCode } from 'aedes'

export function authError(message: string, code: AuthErrorCode = 4) {
  const e = new Error(message) as any
  e.returnCode = code
  return e as AuthenticateError
}

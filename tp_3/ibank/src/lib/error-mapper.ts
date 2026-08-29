import { AuthError } from "@supabase/supabase-js";

/**
 * Maps Supabase Auth error messages to user-facing Spanish strings.
 * Uses anti-enumeration patterns: never reveals whether an email exists.
 */
export function mapAuthError(error: AuthError | Error | null): string {
  if (!error) return "Ocurrió un error inesperado.";

  const msg = error.message.toLowerCase();

  // Login errors — anti-enumeration: same message for wrong email or password
  if (msg.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }

  // Email not confirmed
  if (msg.includes("email not confirmed")) {
    return "Tu email aún no fue confirmado. Revisá tu bandeja de entrada.";
  }

  // Rate limiting
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Demasiados intentos. Esperá un momento antes de reintentar.";
  }

  // User already exists — anti-enumeration: never reveal the email is taken
  if (msg.includes("user already registered") || msg.includes("already exists")) {
    return "Revisá tu email para continuar.";
  }

  // New password same as old
  if (msg.includes("different from the old password")) {
    return "La nueva contraseña debe ser distinta a la anterior.";
  }

  // Weak password
  if (msg.includes("password")) {
    return "La contraseña no cumple con los requisitos de seguridad.";
  }

  // Invalid email
  if (msg.includes("valid email") || msg.includes("invalid email")) {
    return "Ingresá un email válido.";
  }

  // Session / token expired
  if (msg.includes("expired") || msg.includes("invalid token")) {
    return "El enlace expiró o es inválido. Solicitá uno nuevo.";
  }

  // Network
  if (msg.includes("fetch") || msg.includes("network")) {
    return "Error de conexión. Verificá tu conexión a internet.";
  }

  // Fallback - never expose raw Supabase messages to users
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

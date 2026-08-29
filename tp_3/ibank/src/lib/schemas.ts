import { z } from "zod";

/**
 * Password rules: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 symbol.
 * Mirrors the Supabase Dashboard password policy.
 */
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un símbolo");

export const emailSchema = z
  .string()
  .min(1, "El email es obligatorio")
  .email("Ingresá un email válido");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(1, "El nombre es obligatorio"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Debés aceptar los términos y condiciones" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

/**
 * Individual password rules for the visual checklist component.
 */
export const PASSWORD_RULES = [
  { label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { label: "Una letra mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Una letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { label: "Un número", test: (v: string) => /[0-9]/.test(v) },
  { label: "Un símbolo", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

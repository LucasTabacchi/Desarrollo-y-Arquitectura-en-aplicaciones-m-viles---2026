# iBank — Flujo de Autenticación

Flujo completo de autenticación para la app bancaria iBank, conectado a Supabase Auth como backend.

## Pantallas

| # | Pantalla | Descripción |
|---|---|---|
| 01 | Iniciar sesión | Login con email + contraseña y mensajes anti-enumeración |
| 02 | Registro | Alta de cuenta con checklist de contraseña en tiempo real y aceptación de términos |
| 03 | Confirmación pendiente | Confirmación de email post-registro con opción de reenvío |
| 04 | Recuperar contraseña | Solicitud de reset por email con mensaje neutro anti-enumeración |
| 05 | Nueva contraseña | Definir nueva contraseña vía deep link con validación de complejidad |

## Stack Técnico

- **React Native + Expo** (SDK 57)
- **`@supabase/supabase-js` v2** — Cliente de Auth
- **`@react-native-async-storage/async-storage`** — Persistencia de sesión
- **`expo-linking`** — Manejo de deep links para confirmación de email y reset de contraseña
- **`react-hook-form` + `zod`** — Validación de formularios
- **`expo-router`** — Ruteo basado en archivos con typed routes
- **`expo-secure-store`** — Disponible como dependencia pero no utilizado para almacenamiento de sesión (ver [Decisiones](#elección-de-almacenamiento-de-sesión))

## Primeros Pasos

### Prerrequisitos

- Node.js ≥ 18
- Expo CLI (`npx expo`)
- Un proyecto de Supabase con Auth configurado (ver [Configuración de Supabase](#configuración-de-supabase))

### Instalación

```bash
npm install
```

### Variables de Entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

> ⚠️ **Nunca** commitear el archivo `.env.local` ni la clave `service_role`. Solo la clave anon/publishable debe existir en el cliente.

### Ejecutar la App

```bash
npx expo start
```

Presionar `a` para emulador Android, `i` para simulador iOS, o escanear el código QR con Expo Go.

### Plataformas Testeadas

- ✅ Android (emulador + dispositivo físico)
- ⬜ iOS (no testeado — no se dispone de macOS)

## Configuración de Supabase

Los siguientes ajustes deben configurarse en el Dashboard de Supabase en **Authentication**:

| Ajuste | Valor |
|---|---|
| **Confirm email** | ✅ Activado |
| **Longitud mínima de contraseña** | 8 caracteres |
| **Complejidad de contraseña** | Mayúscula + Minúscula + Dígito + Símbolo requeridos |
| **Protección contra contraseñas filtradas** | Activado (requiere plan Pro) |
| **Rate limits** | Por defecto (60s de cooldown por usuario en signup/recover) |
| **Expiración de link/OTP** | 3600 segundos (1 hora) |
| **SMTP** | SMTP personalizado recomendado para producción |
| **Redirect URLs** | `ibanktp://confirm`, `ibanktp://reset-password` |
| **CAPTCHA** | No implementado (opcional/bonus) |

### Claves

- Solo la **clave anon/publishable** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) se usa en el cliente.
- La **clave `service_role`** nunca se incluye en el código de la app, variables de entorno ni logs.

## Elección de Almacenamiento de Sesión

**Elegido: `AsyncStorage`** sobre `expo-secure-store`.

`AsyncStorage` es el almacenamiento recomendado por el [quickstart oficial de Supabase para React Native](https://supabase.com/docs/guides/getting-started/quickstarts/reactnative). Se integra directamente con el cliente `supabase-js` mediante la opción `storage` y maneja tanto el access token como el refresh token de forma transparente.

`expo-secure-store` está instalado como dependencia y podría usarse para almacenar el refresh token en el keychain del dispositivo para mayor seguridad. Sin embargo, `supabase-js` espera un adaptador de storage con la interfaz `getItem`/`setItem`/`removeItem`, y `SecureStore` tiene un límite de 2048 bytes por valor que puede ser insuficiente para tokens JWT. Para el alcance de este TP (foco en UI + reglas de negocio), `AsyncStorage` es la opción pragmática y documentada.

## Estructura del Proyecto

```
src/
├── app/
│   ├── _layout.tsx          # Layout raíz (AuthProvider + fuentes)
│   ├── index.tsx             # Redirect de entrada (chequeo de sesión)
│   ├── (auth)/
│   │   ├── _layout.tsx       # Guard de auth (redirige usuarios logueados)
│   │   ├── login.tsx         # Pantalla de inicio de sesión
│   │   ├── register.tsx      # Pantalla de registro
│   │   ├── pending-confirmation.tsx
│   │   ├── forgot-password.tsx
│   │   └── new-password.tsx
│   └── (app)/
│       ├── _layout.tsx       # Guard de app (redirige usuarios no logueados)
│       └── home.tsx
├── components/
│   ├── auth-button.tsx       # Botón reutilizable (primary/secondary/link + loading)
│   ├── auth-input.tsx        # Input reutilizable (estado de error + toggle de contraseña)
│   ├── cooldown-button.tsx   # Botón con cooldown de 60s
│   └── password-checklist.tsx # Checklist de reglas de contraseña en tiempo real
├── contexts/
│   └── auth-context.tsx      # Estado de sesión + onAuthStateChange + deep links
├── hooks/
│   └── use-deep-link-auth.ts # Handler de deep links → sesión de Supabase
├── lib/
│   ├── supabase.ts           # Configuración del cliente Supabase
│   ├── schemas.ts            # Schemas de validación con Zod
│   └── error-mapper.ts       # Mapeo centralizado de mensajes de error
└── constants/
    └── theme.ts              # Tokens de color y tipografía
```

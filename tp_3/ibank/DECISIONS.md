# Decisiones de Diseño — Flujo de Autenticación iBank

## Mapeo del Figma

### Implementado tal cual

- **Paleta de colores**: Primario `#3629B7`, texto `#343434`, placeholder `#CACACA`, borde `#CBCBCB`, fondo disabled `#F2F1F9` — extraídos directamente del Figma en Dev Mode.
- **Tipografía**: Familia Poppins con pesos 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold). Tamaños: 24px títulos, 20px headers, 16px botones, 14px body, 12px labels/links.
- **Border radius**: 30px para esquinas superiores de las cards, 15px para inputs y botones, 12px para banners de error.
- **Altura de inputs**: 44px según las medidas del frame en Figma.
- **Altura de botones**: 52px (min-height) para acciones primarias.
- **Patrón de layout de cards**: Header violeta → card blanca con border radius superior (login, registro). Card blanca plana con sombra (recuperar contraseña, nueva contraseña).
- **Ilustraciones**: Ilustraciones de login y registro extraídas como PNGs del archivo de Figma.

### Adaptado del Figma

- **Pantalla de recuperar contraseña**: El diseño de Figma incluye un paso de verificación por código/OTP después de solicitar el reset. La consigna establece explícitamente que el reset se hace vía deep link (sección 6.4: `resetPasswordForEmail` con `redirectTo`), no mediante ingreso de código OTP. **Seguimos la consigna** y simplificamos la pantalla a: ingreso de email → mensaje neutro de éxito → el usuario hace clic en el deep link desde su email.
- **Pantalla de éxito de nueva contraseña**: El Figma muestra una ilustración de éxito. Usamos `password-success.png` extraída del Figma. Si la imagen no está disponible, se muestra un estado de éxito basado en texto.
- **Teclado numérico personalizado**: El diseño de Figma muestra un teclado personalizado para las pantallas de recuperar y nueva contraseña. Como eliminamos el flujo OTP y usamos inputs de texto estándar con el teclado nativo, el componente de teclado personalizado (`custom-numeric-keyboard.tsx`) ya no se usa en la pantalla de recuperar contraseña. Se mantiene en el código para uso futuro potencial.

### Fuera de alcance

- **Login social** (botones de Google, Facebook visibles en Figma): No implementado según la consigna sección 1.
- **Pantalla de verificación OTP**: Presente en Figma pero explícitamente excluida en la consigna sección 1.
- **PIN/biometría**: El ícono de huella dactilar es decorativo en la pantalla de login. No se implementó autenticación biométrica real según la consigna.
- **Pantallas de onboarding**: Visibles en Figma pero no forman parte de las 5 pantallas requeridas.

## Decisiones Técnicas

### Almacenamiento de sesión: AsyncStorage sobre SecureStore

Se eligió `AsyncStorage` por ser el almacenamiento oficialmente recomendado en el quickstart de Supabase para React Native. `expo-secure-store` está instalado pero no se usa porque:
1. `supabase-js` espera una interfaz `getItem`/`setItem`/`removeItem`
2. `SecureStore` tiene un límite de 2048 bytes por valor que puede ser insuficiente para tokens JWT
3. Para un TP enfocado en UI + reglas de negocio, la integración más simple es la apropiada

### Manejo de deep links: Parseo manual de URLs

Como `detectSessionInUrl` está en `false` (estándar para React Native), manejamos los deep links manualmente mediante un hook personalizado (`use-deep-link-auth.ts`) que:
1. Captura URLs entrantes con `expo-linking`
2. Extrae tokens de autenticación de los fragmentos hash de la URL o el código PKCE de los query params
3. Llama a `supabase.auth.setSession()` o `exchangeCodeForSession()` según corresponda

Esto dispara `onAuthStateChange` que maneja toda la navegación automáticamente.

### Mapeo de errores: Utilidad centralizada

Todos los mensajes de error de Supabase Auth se mapean a través de una única función `mapAuthError()` en `lib/error-mapper.ts`. Esto asegura:
- Anti-enumeración: `invalid_credentials` nunca revela cuál campo fue el incorrecto
- Mensajes consistentes en español en todas las pantallas
- Ningún mensaje crudo de Supabase se filtra a la UI

### Flujo de recuperación de contraseña: signOut después de updateUser

Después de una actualización de contraseña exitosa vía `updateUser()`, la app explícitamente llama a `signOut()` y redirige al login con un mensaje de éxito. Esto sigue la instrucción de la consigna 6.5 de cerrar la sesión de recuperación en lugar de dejar al usuario logueado con una sesión temporal.

### Protección de rutas: Guards bidireccionales

- `(app)/_layout.tsx`: Redirige usuarios no autenticados al login
- `(auth)/_layout.tsx`: Redirige usuarios autenticados al home (excepto durante el flujo de recuperación de contraseña)
- `index.tsx`: Muestra spinner de carga mientras se resuelve la sesión, luego redirige apropiadamente

Esto previene el parpadeo del login para usuarios autenticados y el parpadeo del home para usuarios no autenticados.

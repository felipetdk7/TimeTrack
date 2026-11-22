# Despliegue MVP en Hostinger + iteración local

## Arquitectura real
TimeTrack es una SPA 100% cliente (Vite + React). No necesita servidor Node:
- Firebase Auth (Google OAuth) corre en el navegador.
- Calendar/Sheets se llaman directo a Google con el token en memoria.
- Datos en `localStorage`.
- No usa variables de entorno en runtime (no hay `GEMINI_API_KEY` en `src/`).

Conclusión: se despliega como **sitio estático**: solo se sube `dist/` a `public_html`.

## Flujo de iteración (local)
```bash
cd TimeTrack
npm install --legacy-peer-deps   # solo la primera vez
npm run dev                       # http://localhost:3000
# ...editas, pruebas...
npm run lint                      # tsc --noEmit
npm run build                     # genera dist/
```

## Flujo de despliegue MVP
1. `npm run build`
2. Subir **el contenido** de `dist/` a `public_html` (File Manager de hPanel o FTP).
   - Debe quedar: `public_html/index.html`, `public_html/assets/...`, `public_html/.htaccess`.
3. Verificar en el dominio.

## Configuración obligatoria para que el login funcione
1. **Firebase Console** → Authentication → Settings → Authorized domains → agregar el dominio de Hostinger
   (ej. `tudominio.com`). Sin esto, `signInWithPopup` falla.
2. **Google Cloud Console** → APIs & Services → OAuth consent screen / Credentials → agregar el dominio en
   Authorized JavaScript origins (y redirect URIs si aplica).
3. Habilitar Google Calendar API y Google Sheets API en el proyecto de Google Cloud.

## Re-desplegar tras cada iteración
- Opción A (manual): `npm run build` y volver a subir `dist/` (reemplazar).
- Opción B (FTP sync): subir solo `dist/` con un cliente FTP.
- Opción C (Git): hPanel → Git → conectar repo `felipetdk7/TimeTrack`; usar un paso de build o subir `dist/`
  ya compilado a una rama de deploy. Nota: Hostinger Git no ejecuta `npm run build` por sí solo en planes
  básicos, así que lo simple es publicar el `dist/` compilado.

## .htaccess
Ya está en `public/.htaccess`; Vite lo copia a `dist/`. Da fallback SPA y cache de assets.

# Cuentas Claras - SplitSmart

Aplicación web para dividir gastos en pareja de forma inteligente, equitativa y moderna.

## 🚀 Primeros Pasos (Si acabas de clonar el repo)

Si has clonado este repositorio y está vacío, necesitas instalar las dependencias y configurar el entorno:

1. **Instalar Dependencias**
   Ejecuta en tu terminal:
   ```bash
   npm install
   ```

2. **Configurar API Key**
   Crea un archivo llamado `.env` en la raíz del proyecto y añade tu clave de Gemini:
   ```env
   API_KEY=tu_clave_que_empieza_por_AIza
   ```

3. **Iniciar Servidor**
   ```bash
   npm run dev
   ```

## Características

- 🧠 **Carga con IA**: Escribe "Cena ayer 50 pagó ella" y la IA lo categoriza.
- 📊 **Balance en Tiempo Real**: Cálculo automático de quién debe a quién.
- 📱 **Diseño Mobile-First**: Funciona como una app nativa.
- ☁️ **Sincronización Google Sheets**: Respalda tus datos en Drive.

## Solución de Problemas

- **Error de TypeScript/Vite**: Asegúrate de estar usando una versión reciente de Node.js (v18+).
- **La IA no responde**: Verifica que tu API Key en el archivo `.env` sea correcta y tenga saldo/cuota gratuita.
- **Google Sheets no conecta**: Revisa la configuración en el botón de "Ajustes" dentro de la app y asegúrate de haber autorizado la URL en Google Cloud Console.

## Tecnologías

- React + Vite
- TailwindCSS
- Google Gemini API
- Google Sheets API

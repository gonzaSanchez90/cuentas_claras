FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar TODAS las dependencias (incluyendo dev para vite/tsc)
RUN npm install
RUN cd server && npm install

# Copiar el código fuente
COPY . .

# Construir el frontend (Vite genera la carpeta dist/)
RUN npm run build

# ==========================================
# Etapa de Producción
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copiar archivos necesarios desde el builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Instalar SOLO dependencias de producción en el servidor
RUN cd server && npm install --omit=dev

# Exponer el puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/public/health || exit 1

# Definir variables de entorno en runtime
ENV NODE_ENV=production
ENV PORT=3001

# Iniciar el servidor
CMD ["npm", "start"]

# Stage 1: Bağımlılıklar
FROM node:20-alpine AS deps
WORKDIR /app

# package.json ve package-lock.json kopyala
COPY package*.json ./

# Sadece production bağımlılıklarını kur
RUN npm ci --only=production

# Devam eden production bağımlılıkları sakla
RUN npm prune --production


# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# package dosyaları kopyala
COPY package*.json ./

# Tüm bağımlılıkları kur (dev bağımlılıkları dahil)
RUN npm ci

# Kaynak kodunu kopyala
COPY . .

# Prisma generate et
RUN npx prisma generate

# Next.js build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# nextjs user oluştur (güvenlik için)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Environment değişkenlerini ayarla
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Public dosyaları kopyala
COPY --from=builder /app/public ./public

# Standalone output ve static dosyaları kopyala
# Next.js 14 standalone ayarı ile oluşturulan output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema ve client kopyala
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules

# nextjs user'a geç
USER nextjs

# Port'u expose et
EXPOSE ${PORT}

# Health check ekle
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Server'ı başlat
CMD ["node", "server.js"]

# Labels
LABEL maintainer="TeklifPro Team <team@teklifpro.dev>"
LABEL version="1.0.0"
LABEL description="TeklifPro - Next.js 14 SaaS Application"

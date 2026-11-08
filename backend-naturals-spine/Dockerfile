FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps --omit=optional
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS migrator
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
CMD ["node", "./node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=8080
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev --omit=optional
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/src/main.js"]

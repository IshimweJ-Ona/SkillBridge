FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

FROM deps AS build

COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
COPY apps ./apps
RUN npm run prisma:generate
RUN npm run build

FROM build AS prod-deps

RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3101 3102 3103 3104 3105 3106

CMD ["node", "dist/apps/identity-api/src/main.js"]

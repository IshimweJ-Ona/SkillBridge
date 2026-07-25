FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build

WORKDIR /app

# NEXT_PUBLIC_* vars are inlined into the client JS bundle at `next build`
# time - they cannot be changed by setting environment variables on the
# running container afterward. Pass them as --build-arg at `docker build`
# time (docker-compose.yml wires these to root .env values, with the
# existing localhost defaults for local/dev use).
ARG NEXT_PUBLIC_USE_MOCK_API=false
ARG NEXT_PUBLIC_IDENTITY_API_URL
ARG NEXT_PUBLIC_LEARNING_API_URL
ARG NEXT_PUBLIC_MATCHING_API_URL
ARG NEXT_PUBLIC_MARKETPLACE_API_URL
ARG NEXT_PUBLIC_ADMIN_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_USE_MOCK_API=$NEXT_PUBLIC_USE_MOCK_API \
    NEXT_PUBLIC_IDENTITY_API_URL=$NEXT_PUBLIC_IDENTITY_API_URL \
    NEXT_PUBLIC_LEARNING_API_URL=$NEXT_PUBLIC_LEARNING_API_URL \
    NEXT_PUBLIC_MATCHING_API_URL=$NEXT_PUBLIC_MATCHING_API_URL \
    NEXT_PUBLIC_MARKETPLACE_API_URL=$NEXT_PUBLIC_MARKETPLACE_API_URL \
    NEXT_PUBLIC_ADMIN_API_URL=$NEXT_PUBLIC_ADMIN_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# output: "standalone" (next.config.ts) traces only the files actually
# needed at runtime and copies them here, alongside a self-contained
# server.js - no node_modules install needed in this final stage.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]

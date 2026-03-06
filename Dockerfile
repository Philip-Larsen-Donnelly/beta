# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ARG PNPM_VERSION=10.28.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
# Install deps with devDependencies (needed for build tools like Tailwind/PostCSS)
ENV NODE_ENV=development
ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org
ENV NPM_CONFIG_REGISTRY=${NPM_CONFIG_REGISTRY}
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry ${NPM_CONFIG_REGISTRY} \
 && pnpm install --frozen-lockfile --ignore-scripts --reporter=append-only

FROM deps AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm run build

FROM base AS prod-deps
ENV NODE_ENV=production
ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org
ENV NPM_CONFIG_REGISTRY=${NPM_CONFIG_REGISTRY}
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry ${NPM_CONFIG_REGISTRY} \
 && pnpm install --frozen-lockfile --prod --ignore-scripts --reporter=append-only

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user & install su-exec for privilege drop
RUN addgroup -g 1001 nodejs && adduser -D -G nodejs -u 1001 nodeuser \
 && apk add --no-cache su-exec

WORKDIR /app

# Copy only the compiled app for a smaller, safer image
COPY --from=builder --chown=nodeuser:nodejs /app/public ./public
COPY --from=builder --chown=nodeuser:nodejs /app/.next ./.next
COPY --from=prod-deps --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nodeuser:nodejs /app/package.json /app/pnpm-lock.yaml ./

# Entrypoint fixes volume permissions then drops to nodeuser
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]


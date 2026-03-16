# /server/Dockerfile

# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Enable pnpm via corepack (built into Node.js)
RUN corepack enable pnpm

# Copy package files and prisma schema
# Make sure you copy pnpm-lock.yaml instead of package-lock.json!
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma 

# Install dependencies using pnpm's equivalent of npm ci
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm here as well so we can use it to run the build script
RUN corepack enable pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

# Generate the Prisma client and build the Next.js standalone app
RUN npx prisma generate 
RUN pnpm run build

# Stage 3: Production server
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install openssl again in the runner stage so Prisma can run migrations
RUN apk add --no-cache openssl

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone Next.js output and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the Prisma folder AND the Prisma config file
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

USER nextjs
EXPOSE 3000
ENV PORT 3000

# Run database migrations, THEN start the Next.js server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
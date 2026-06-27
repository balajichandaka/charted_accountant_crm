FROM node:22-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npx prisma generate
RUN npx tsc
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_DB\" = \"true\" ]; then npx prisma db seed; fi && node dist/index.js"]

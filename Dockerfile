FROM node:20-slim

# Install g++ for live C++17 compilation in /api/run
RUN apt-get update && apt-get install -y --no-install-recommends g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json bun.lock* package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx prisma generate || true
RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", ".next/standalone/server.js"]

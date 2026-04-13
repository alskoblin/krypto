FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npm install @prisma/adapter-pg pg @prisma/client
RUN npm install -D prisma
COPY . .

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/krypto?schema=public
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

CMD ["npm", "run", "start"]

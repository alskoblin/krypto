FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/main"]
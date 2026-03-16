FROM node:20-slim
COPY . .
WORKDIR /app
RUN npm install
RUN npm install @prisma/client @prisma/adapter-pg pg
RUN npm install -D prisma
RUN npm run build
CMD ["npm","run","start"]
# Node 24 (Krypton) — linha LTS atual.
FROM node:24-alpine

WORKDIR /app

# Copia só o manifesto primeiro para aproveitar o cache de camada do Docker.
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]

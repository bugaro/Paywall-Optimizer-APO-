FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json tsconfig.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 4006

CMD ["node", "--experimental-strip-types", "src/infrastructure/server.ts"]

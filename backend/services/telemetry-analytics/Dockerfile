FROM node:24-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

ENV NODE_ENV=production

COPY drizzle.config.ts ./
COPY src ./src
COPY startup.sh ./
RUN chmod +x startup.sh

EXPOSE 4003

CMD ["/app/startup.sh"]

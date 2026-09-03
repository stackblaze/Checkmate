FROM node:22-slim

RUN apt-get update \
	&& apt-get install -y iputils-ping \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./

RUN npm ci

COPY server/ ./

RUN npm run build

USER node

EXPOSE 52345

CMD ["node", "dist/index.js"]

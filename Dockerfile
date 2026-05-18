# Single stage - run Expo web + proxy together
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# sharp build için sistem bağımlılıkları (PWA ikonları üretmek için)
RUN apk add --no-cache vips-dev || true

COPY . .

# Build web
RUN npx expo export --platform web

# PWA: ikonları üret + manifest/SW dist'e kopyala + index.html'e meta enjekte et
RUN node scripts/generate-icons.js

EXPOSE 3000

CMD ["node", "docker-server.js"]

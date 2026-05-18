# Single stage - run Expo web + proxy together
FROM node:20-alpine

WORKDIR /app

# sharp (PWA ikon üretimi) için sistem bağımlılıkları - npm ci'den ÖNCE olmalı
RUN apk add --no-cache vips-dev build-base python3

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build web
RUN npx expo export --platform web

# PWA: ikonları üret + manifest/SW dist'e kopyala + index.html'e meta enjekte et
RUN node scripts/generate-icons.js

EXPOSE 3000

CMD ["node", "docker-server.js"]

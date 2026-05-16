# Single stage - run Expo web + proxy together
FROM node:20-alpine

WORKDIR /app

# Build-time env variables (Expo bunları build sırasında bundle'a gömer)
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build web (env değişkenleri bu noktada bundle'a gömülür)
RUN npx expo export --platform web

EXPOSE 3000

CMD ["node", "docker-server.js"]

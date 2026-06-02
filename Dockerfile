FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_GRPC_URL
ARG VITE_USE_MOCK_BACKEND=0
ENV VITE_GRPC_URL=$VITE_GRPC_URL
ENV VITE_USE_MOCK_BACKEND=$VITE_USE_MOCK_BACKEND

RUN npm run generate
RUN npm run build

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /usr/share/caddy

EXPOSE 80 443

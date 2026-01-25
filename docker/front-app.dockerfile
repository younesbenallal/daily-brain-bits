FROM oven/bun:1.1.0 AS build

WORKDIR /app
COPY . .

RUN bun install --frozen-lockfile

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN bun run --cwd apps/front build

FROM nginx:alpine

COPY --from=build /app/apps/front/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

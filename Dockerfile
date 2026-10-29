# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Writable store for saved scripts, mounted as a volume in docker-compose.yml
RUN mkdir -p /data/scripts && chown nginx:nginx /data/scripts
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

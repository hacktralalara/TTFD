# Контекст сборки — корень репозитория (Railway: Dockerfile Path = website/Dockerfile)

# Этап 1: сборка фронтенда (Vite)
FROM node:22-alpine AS frontend
WORKDIR /app
COPY website/package.json website/package-lock.json ./
RUN npm ci
COPY website/ .
RUN npm run build

# Этап 2: Python-бэкенд, отдающий собранный фронт из dist/
FROM python:3.12-slim
WORKDIR /app
COPY website/server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY website/server/ server/
COPY --from=frontend /app/dist ./dist
EXPOSE 5000
CMD ["sh", "-c", "gunicorn --workers 2 --threads 8 --bind 0.0.0.0:${PORT:-5000} server.api:app"]

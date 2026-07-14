# Этап 1: сборка фронтенда (Vite)
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 2: Python-бэкенд, отдающий собранный фронт из dist/
FROM python:3.12-slim
WORKDIR /app
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server/ server/
COPY --from=frontend /app/dist ./dist
EXPOSE 5000
CMD ["sh", "-c", "gunicorn --workers 2 --threads 8 --bind 0.0.0.0:${PORT:-5000} server.api:app"]

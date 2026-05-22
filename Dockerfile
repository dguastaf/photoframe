# Client build
FROM node:22-alpine AS client-build
WORKDIR /app
COPY config/ ./config/
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Runtime: API + built UI on one port (Immich-style single service)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PHOTOFRAME_STATIC_DIR=/app/web

WORKDIR /app
COPY server/pyproject.toml ./
COPY server/app/ ./app/
COPY config/ports.json /config/ports.json
RUN pip install .
COPY --from=client-build /app/client/dist /app/web

WORKDIR /srv
EXPOSE 6389

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "6389", "--workers", "1"]

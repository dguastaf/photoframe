# Client build
FROM node:22-alpine AS client-build
WORKDIR /app
COPY config/ ./config/
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Runtime: API + nginx UI on one port
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled/default

WORKDIR /app
COPY server/pyproject.toml ./
COPY server/app/ ./app/
COPY config/ports.json /config/ports.json
RUN pip install .

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/client/dist /usr/share/nginx/html
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /srv
EXPOSE 6389

ENTRYPOINT ["/entrypoint.sh"]

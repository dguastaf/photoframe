FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY server/pyproject.toml ./
COPY server/app/ ./app/
COPY config/ports.json /config/ports.json
RUN pip install .

WORKDIR /srv

EXPOSE 52525

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "52525", "--workers", "1"]

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# `pip install .` runs setuptools package discovery (`include = ["app*"]`). The
# `app/` tree must exist before install so the package is built into site-packages.
# Copying only pyproject.toml first would yield an empty distribution (deps only);
# uvicorn would then rely on cwd hacks for `import app`, which is brittle.
COPY pyproject.toml ./
COPY app/ ./app/
RUN pip install .

# WORKDIR was `/app` during build so setuptools could find `app/`. Staying there at
# runtime would put `./app` ahead of site-packages on sys.path and shadow the
# installed package. Use a neutral working directory so `import app` resolves
# to the wheel installed under site-packages.
WORKDIR /srv

EXPOSE 52525

# 1 worker only. Keeps memory predictable on a Pi. Multiple workers add nothing
# given the server is stateless and traffic is one-frame scale.
# Port matches host mapping in docker-compose (52525:52525) for clarity.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "52525", "--workers", "1"]

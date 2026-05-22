#!/bin/sh
set -e
cd /srv
uvicorn app.main:app --host 127.0.0.1 --port 52525 --workers 1 &
exec nginx -g 'daemon off;'

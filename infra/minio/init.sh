#!/bin/sh
set -e

# Wait for MinIO to be ready
until mc alias set local "$STORAGE_ENDPOINT" "$STORAGE_ACCESS_KEY" "$STORAGE_SECRET_KEY"; do
  echo "Waiting for MinIO..."
  sleep 1
done

# Create bucket if it doesn't exist
if ! mc ls local/"$STORAGE_BUCKET" >/dev/null 2>&1; then
  echo "Creating bucket $STORAGE_BUCKET..."
  mc mb local/"$STORAGE_BUCKET"
fi

# Ensure bucket is private
mc anonymous set none local/"$STORAGE_BUCKET"
echo "MinIO initialization complete."

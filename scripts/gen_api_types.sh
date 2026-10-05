#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$(dirname "$DIR")"

echo "Extracting OpenAPI specification from backend..."
mkdir -p "$ROOT_DIR/frontend/src/lib/api/generated"

# Export openapi.json from backend app factory directly using python
cd "$ROOT_DIR/backend"
uv run python -c "
import json
from app.main import app
with open('../frontend/src/lib/api/generated/openapi.json', 'w') as f:
    json.dump(app.openapi(), f, indent=2)
"

echo "Generating TypeScript types with openapi-typescript..."
cd "$ROOT_DIR/frontend"
npx openapi-typescript src/lib/api/generated/openapi.json -o src/lib/api/generated/schema.d.ts

echo "OpenAPI types successfully generated at frontend/src/lib/api/generated/schema.d.ts"

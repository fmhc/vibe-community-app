#!/bin/bash
echo "🧪 Testing E2E Setup..."
NODE_ENV=test npx playwright test e2e/homepage.spec.ts --grep "should load the homepage successfully" --timeout=30000

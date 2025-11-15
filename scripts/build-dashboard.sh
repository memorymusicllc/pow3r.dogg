#!/bin/bash
# Build and deploy React dashboard

set -e

echo "Building React dashboard..."

cd dashboard

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the dashboard
echo "Building for production..."
npm run build

echo "Dashboard built successfully!"
echo "Build output: dashboard/dist/"
echo ""
echo "To deploy, upload the contents of dashboard/dist/ to R2 bucket EVIDENCE_VAULT under 'dashboard/dist/' prefix"


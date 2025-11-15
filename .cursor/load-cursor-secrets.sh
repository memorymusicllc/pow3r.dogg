#!/bin/bash

# Load Cursor Secrets Script
# This script helps load global secrets into Cursor projects

SECRETS_FILE="/Users/creator/Documents/DEV/.cursor-secrets.json"
CONFIG_FILE="/Users/creator/Documents/DEV/.cursor-config.json"

echo "🔐 Cursor Secrets Manager"
echo "========================="

if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Secrets file not found: $SECRETS_FILE"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    exit 1
fi

echo "✅ Found secrets file: $SECRETS_FILE"
echo "✅ Found config file: $CONFIG_FILE"

# Function to load secrets for a specific project
load_project_secrets() {
    local project_name="$1"
    echo "📁 Loading secrets for project: $project_name"
    
    # Extract secrets for this project from config
    local secrets=$(jq -r ".projects.$project_name.secrets[]" "$CONFIG_FILE" 2>/dev/null)
    
    if [ -z "$secrets" ]; then
        echo "⚠️  No specific secrets configured for project: $project_name"
        echo "💡 Using all available secrets"
        secrets=$(jq -r '.secrets | keys[]' "$SECRETS_FILE")
    fi
    
    echo "🔑 Available secrets for $project_name:"
    while IFS= read -r secret_name; do
        if [ -n "$secret_name" ]; then
            echo "   - $secret_name"
        fi
    done <<< "$secrets"
}

# Function to show all available secrets
show_all_secrets() {
    echo "🔑 All available secrets:"
    jq -r '.secrets | keys[]' "$SECRETS_FILE" | while read -r secret_name; do
        echo "   - $secret_name"
    done
}

# Main menu
case "${1:-menu}" in
    "list")
        show_all_secrets
        ;;
    "project")
        if [ -z "$2" ]; then
            echo "❌ Please specify a project name"
            echo "Usage: $0 project <project-name>"
            exit 1
        fi
        load_project_secrets "$2"
        ;;
    "menu"|*)
        echo "📋 Available commands:"
        echo "   $0 list                    - Show all available secrets"
        echo "   $0 project <project-name>  - Show secrets for specific project"
        echo ""
        echo "📁 Configured projects:"
        jq -r '.projects | keys[]' "$CONFIG_FILE" | while read -r project; do
            echo "   - $project"
        done
        ;;
esac

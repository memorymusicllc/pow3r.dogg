#!/bin/bash
# Progress Monitoring Script for Abi
# Tracks deployment progress and reports to Abi orchestrator

PROGRESS_FILE=".deployment-progress.json"
ABI_WEBHOOK="${ABI_WEBHOOK_URL:-credential:abi_webhook_url}"

# Initialize progress file
init_progress() {
    cat > "$PROGRESS_FILE" <<EOF
{
  "steps": {
    "dependencies": {"status": "pending", "message": "Not started"},
    "cloudflare_resources": {"status": "pending", "message": "Not started"},
    "database_schema": {"status": "pending", "message": "Not started"},
    "wrangler_config": {"status": "pending", "message": "Not started"},
    "secrets": {"status": "pending", "message": "Not started"},
    "deployment": {"status": "pending", "message": "Not started"},
    "verification": {"status": "pending", "message": "Not started"}
  },
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# Update step status
update_step() {
    local step="$1"
    local status="$2"
    local message="$3"
    
    if [ ! -f "$PROGRESS_FILE" ]; then
        init_progress
    fi
    
    # Use jq if available, otherwise use sed (basic)
    if command -v jq &> /dev/null; then
        jq ".steps.$step.status = \"$status\" | .steps.$step.message = \"$message\" | .updated_at = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
    else
        # Basic sed replacement (fallback)
        sed -i.bak "s/\"$step\": {[^}]*}/\"$step\": {\"status\": \"$status\", \"message\": \"$message\"}/" "$PROGRESS_FILE"
    fi
    
    # Notify Abi
    if [ "$ABI_WEBHOOK" != "credential:abi_webhook_url" ]; then
        ./scripts/notify-abi.sh "$step" "$status" "$message" || true
    fi
}

# Get progress summary
get_summary() {
    if [ ! -f "$PROGRESS_FILE" ]; then
        echo "Progress file not found. Run init_progress first."
        return 1
    fi
    
    if command -v jq &> /dev/null; then
        local total=$(jq '.steps | length' "$PROGRESS_FILE")
        local completed=$(jq '[.steps[] | select(.status == "completed")] | length' "$PROGRESS_FILE")
        local in_progress=$(jq '[.steps[] | select(.status == "in_progress")] | length' "$PROGRESS_FILE")
        local failed=$(jq '[.steps[] | select(.status == "failed")] | length' "$PROGRESS_FILE")
        local percentage=$((completed * 100 / total))
        
        echo "Progress: $percentage% ($completed/$total completed, $in_progress in progress, $failed failed)"
    else
        echo "Progress tracking requires jq. Install with: brew install jq"
    fi
}

# Show full status
show_status() {
    if [ ! -f "$PROGRESS_FILE" ]; then
        echo "No progress file found"
        return 1
    fi
    
    echo "=== Pow3r Defender Deployment Progress ==="
    echo ""
    
    if command -v jq &> /dev/null; then
        jq -r '.steps | to_entries[] | "\(.key): \(.value.status) - \(.value.message)"' "$PROGRESS_FILE"
        echo ""
        get_summary
    else
        cat "$PROGRESS_FILE"
    fi
}

# Main command handler
case "${1:-show}" in
    init)
        init_progress
        echo "Progress tracking initialized"
        ;;
    update)
        update_step "$2" "$3" "$4"
        ;;
    show)
        show_status
        ;;
    summary)
        get_summary
        ;;
    *)
        echo "Usage: $0 {init|update|show|summary}"
        echo "  init - Initialize progress tracking"
        echo "  update <step> <status> <message> - Update step status"
        echo "  show - Show full status"
        echo "  summary - Show progress summary"
        exit 1
        ;;
esac


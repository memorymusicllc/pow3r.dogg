# Pow3r Defender Keyboard Plugin

Native keyboard extensions for iOS and Android that provide in-context threat detection and quick actions during messaging.

## Architecture

### iOS Keyboard Extension
- **Framework**: Swift + UIKit
- **Extension Type**: Custom Keyboard (UIInputViewController)
- **Location**: `mobile/keyboard/ios/`

### Android IME
- **Framework**: Kotlin + Android SDK
- **Service Type**: InputMethodService
- **Location**: `mobile/keyboard/android/`

## Features

### Core Functionality
- Full keyboard replacement with Pow3r Defender integration
- Works in all native messengers (SMS, WhatsApp, Signal, Telegram, etc.)
- In-keyboard threat detection and warnings
- Quick actions toolbar above keyboard:
  - Generate tracking link button
  - Generate tracking file button
  - Suggest reply button
  - Record communication toggle
- Threat indicator badge on suspicious messages
- Auto-suggest tracking links when user types URLs
- Full notification permissions required for alerts

## Implementation Status

🚧 **In Progress** - Backend APIs completed, keyboard plugins to be implemented

## Next Steps

1. Create iOS keyboard extension project structure
2. Create Android IME project structure
3. Implement native keyboard UI
4. Integrate with Pow3r Defender API
5. Add threat detection logic
6. Implement quick actions toolbar
7. Add notification support


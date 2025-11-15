# Pow3r Defender Admin Dashboard

React-based admin dashboard for Pow3r Defender, built with Vite, TypeScript, and Pow3r design guidelines.

## Features

- **OSINT Lookup**: Email, Image (reverse search + face recognition), Address, Business lookups
- **Attacker Database**: Full CRUD interface with search and knowledge graph integration
- **Knowledge Graph Visualization**: 2D (React Flow) and 3D (ThreeJS) graph views
- **File Upload**: Markdown file uploads for knowledge graph enrichment
- **Evidence Timeline**: View and export evidence chains
- **Analytics Dashboard**: Real-time threat monitoring and risk scoring

## Tech Stack

- **Build Tool**: Vite
- **Framework**: React 18 + TypeScript
- **UI Components**: Radix UI
- **State Management**: Zustand
- **Styling**: Tailwind CSS (true-black, light, glass themes)
- **Visual Flow**: React Flow
- **3D**: ThreeJS / React Three Fiber
- **Fonts**: Rock Salt (headers), Courier Prime (body)
- **Icons**: Heroicons

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

The dashboard fetches configuration from `https://config.superbots.link/` using the Pow3r v4 schema.

## Themes

- **True Black** (default): Dark theme optimized for low-light environments
- **Light**: Light theme for daytime use
- **Glass**: Glassmorphism theme for AR glasses and smart mirrors

## Deployment

The dashboard is built to `dist/` and should be uploaded to R2 bucket `EVIDENCE_VAULT` under the `dashboard/dist/` prefix, or served directly from the Cloudflare Worker.


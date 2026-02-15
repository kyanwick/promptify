# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Promptify is a Next.js 16 (App Router) application that provides a visual prompt builder for AI models. Users can create node-based prompt flows, manage API keys for multiple AI providers, and chat with various AI models through a unified interface.

## Commands

### Development
```bash
npm run dev      # Start development server (default: http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Database
Supabase migrations are located in `supabase/migrations/`. The database schema includes:
- `prompts`: User-created prompt templates with nodes and connections
- `user_api_keys`: Encrypted user API keys for AI providers
- `user_profiles`: User profile information

## Architecture

### AI Provider System
The application uses a pluggable provider architecture for AI models:

- **Provider Manager** (`src/services/ai/provider-manager.ts`): Singleton that manages multiple AI providers, handles provider routing, and enforces rate limiting per user
- **Base Provider** (`src/services/ai/base-provider.ts`): Abstract class defining the provider interface
- **Concrete Providers**:
  - `openai-provider.ts`: OpenAI API integration
  - `anthropic-provider.ts`: Anthropic (Claude) API integration
  - `google-provider.ts`: Google AI API integration
- **Rate Limiter** (`src/services/ai/rate-limiter.ts`): Per-user rate limiting with configurable limits for requests and tokens

Each provider implements: `chat()`, `chatStream()`, `listModels()`, `isAvailable()`, and `getAvailableModels()`

### Visual Prompt Builder
The node-based prompt builder (`src/components/prompts/`) uses:
- **Node Types**: System messages and user messages
- **Connections**: Directional links between nodes that define message flow
- **Drag & Drop**: react-dnd for node positioning
- **Types** (`src/components/prompts/types.ts`):
  - `Node`: Position, content, type (system/user), visibility
  - `Connection`: Links between node IDs

### API Routes Structure
- `/api/chat`: Main chat endpoint with streaming support, rate limiting, and provider selection
- `/api/models/[provider]`: Dynamic routes for fetching available models from each AI provider
- `/api/account/delete`: User account deletion
- `/auth/callback`: Supabase OAuth callback handler

### Authentication & Data
- **Supabase Integration**:
  - Client SDK: `src/lib/supabase/client.ts` (browser)
  - Server SDK: `src/lib/supabase/server.ts` (server components/API routes)
- **Services**:
  - `promptService.ts`: CRUD operations for prompts
  - `userAPIKeyService.ts`: Encrypted storage and retrieval of user API keys
  - `localAPIKeyService.ts`: Browser localStorage fallback for API keys
  - `modelService.ts`: Model fetching and caching

### Path Aliases
Use `@/*` to import from `src/*` (configured in tsconfig.json)

### Key Dependencies
- **UI**: Material-UI v7, @emotion for styling
- **AI SDKs**: OpenAI SDK, Anthropic SDK, Google Generative AI SDK
- **Backend**: Supabase (auth, database, storage)
- **Drag & Drop**: react-dnd, react-rnd
- **Charts**: ApexCharts, react-apexcharts

## Code Organization Patterns

### Module Structure
Prefer modular file organization when adding features. Don't create monolithic files. Related functionality should be split into:
- Types/interfaces in separate files
- Service classes with single responsibilities
- Reusable components in dedicated files

### Adding New AI Providers
1. Create provider class extending `BaseAIProvider` in `src/services/ai/[provider]-provider.ts`
2. Implement all required interface methods
3. Register provider in `provider-manager.ts` initialization
4. Add API route in `src/app/api/models/[provider]/route.ts`
5. Update `AIProvider` type in `src/services/ai/types.ts`

### Environment Configuration
Environment variables are stored in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (server-side only)
```

User API keys for OpenAI/Anthropic/Google are stored per-user in the database or localStorage.

## MCP Servers

This project uses Model Context Protocol (MCP) servers for enhanced development:

### Context7 MCP
**Always use Context7 for code generation, setup/configuration steps, or library/API documentation.** Automatically use Context7 MCP tools to resolve library IDs and get library documentation without explicit user requests.

### MUI MCP
Use the MUI MCP server when working with Material-UI components. This provides:
- Component documentation and API references
- Material-UI v7 specific guidance
- Best practices for @emotion styling
- Integration patterns with Next.js

When adding or modifying UI components that use Material-UI, leverage the MUI MCP to get accurate component APIs and usage examples.

## Important Notes

- All API routes use Supabase service role key for database operations to bypass RLS
- User API keys are encrypted before storage in the database
- Rate limiting is enforced per user ID, not globally
- The chat API supports both streaming and non-streaming responses
- Prompt nodes can be hidden from users but visible to AI (for system instructions)

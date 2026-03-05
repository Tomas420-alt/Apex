# AGENTS.md - Project Configuration for Ralph
<!-- KEEP THIS FILE UNDER ~60 LINES - operational only -->

## Build Commands
npm run build       # Build the project
npm run typecheck   # TypeScript checks
npm run lint        # Linting
npm test            # Run tests

## Project Structure
- src/       - Application source code
- src/lib/   - Shared utilities (patterns here)
- specs/     - Requirement specifications
- tests/     - Test files

## Visual Testing (Playwright MCP)
Dev Server URL: http://localhost:port
Screenshot Directory: .playwright-mcp/ralph-screenshots/
<!-- If Playwright MCP is configured, Ralph captures a screenshot after each task -->
<!-- Configure in .mcp.json: { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest", "--headless"] } } } -->

## Patterns Discovered
<!-- Ralph appends patterns here as it learns -->

## Gotchas
<!-- Ralph appends gotchas here -->

# Coding Standards for BelloSuite

## General Rules
- Use TypeScript for all new code
- Avoid `any` type; use proper types or Zod for validation
- Use meaningful variable and function names in English
- Follow camelCase for variables/functions, PascalCase for components/classes

## Code Structure
- Extract business logic to service layers
- Use standardized error handling with `handleApiError`
- Implement RBAC for all API routes
- Use caching for read operations

## Imports
- Group imports: React, third-party, local
- Use absolute imports with `@/` alias

## Security
- Always validate input with Zod schemas
- Use RBAC to restrict access
- Never expose sensitive data in logs

## Performance
- Use caching for expensive operations
- Optimize database queries with proper includes

## Commit Messages
- Use conventional commits: `feat:`, `fix:`, `refactor:`, etc.
# Flipt — Project Guidelines

## Project Overview

Flipt is an async, multiplayer phrase-guessing game (Wheel of Fortune style). Players guess letters to reveal a hidden phrase, competing for points across rounds. Each player completes rounds on their own time; results are compared once everyone finishes.

**Tech stack:** React + TypeScript + Vite (PWA), Firebase (Firestore, Auth, Cloud Functions, Cloud Messaging, Hosting)

## Code Style

- Use Prettier defaults for all formatting (no config overrides)
- Use TypeScript strict mode — no `any` types
- Prefer `const` over `let`; never use `var`
- Use named exports (not default exports)
- Keep functions small and single-purpose

## File & Folder Conventions

- File names: `kebab-case.ts` / `kebab-case.tsx`
- Component names: `PascalCase` in code (e.g., `export const GameBoard = ...`)
- Feature-based folder structure: group related components, hooks, and utils by feature
  ```
  src/
    features/
      game/
        components/
        hooks/
        utils/
      leaderboard/
        components/
        hooks/
      auth/
        ...
    shared/
      components/
      hooks/
      utils/
  ```

## React Patterns

- Prefer local state (`useState`, `useReducer`) wherever possible
- Use React Context only when state genuinely needs to be shared across many components
- Build small, single-purpose components and compose them together — avoid large monolithic components
- Extract reusable logic into custom hooks
- Keep components focused: if a component does more than one thing, split it

## Styling

- Use plain CSS with one `.css` file per component (co-located with the component)
- Use BEM-style class naming: `.game-board`, `.game-board__tile`, `.game-board__tile--revealed`
- CSS custom properties (variables) for theming: define in `:root` in a global `theme.css`
- No CSS frameworks or utility classes

## Git Workflow

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `style:`
- Keep commits small and focused on a single change
- Write commit messages that explain *why*, not just *what*

## Firebase Conventions

- Firestore collection names: lowercase plural (`games`, `players`, `phrases`)
- Cloud Functions: one function per file, named descriptively
- Keep Firebase config and initialization in `src/lib/firebase.ts`
- Use Firestore security rules — never trust client-side data

## Testing

- Write tests for scoring logic and game state transitions
- Use Vitest (aligns with Vite)
- Test files live next to the code they test: `scoring.ts` → `scoring.test.ts`

## General Principles

- Prioritize simplicity and readability over cleverness
- If a piece of logic is used in more than one place, extract it into `shared/`
- Handle errors gracefully — show user-friendly messages, never raw errors
- Keep the PWA fast: lazy-load routes, keep bundle size small

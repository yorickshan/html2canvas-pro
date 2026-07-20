# Contributing to html2canvas-pro

## Quick Start

```bash
pnpm install
pnpm build       # TypeScript compile + Rolldown bundle
pnpm test        # Run all unit tests (vitest)
pnpm typecheck   # TypeScript type check only
```

## Adding a New CSS Property

### Step 1: Create the property descriptor

Create `src/css/property-descriptors/<property-name>.ts`. Choose the parsing type:

```typescript
// For keyword-only properties (e.g., display: block | inline | none)
import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export const enum MY_PROPERTY {
    VALUE_A = 0,
    VALUE_B = 1
}

export const myProperty: IPropertyIdentValueDescriptor<MY_PROPERTY> = {
    name: 'my-property',
    initialValue: 'value-a',
    prefix: false,   // true for -webkit- prefixed properties
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string) => {
        switch (value) {
            case 'value-b': return MY_PROPERTY.VALUE_B;
            case 'value-a':
            default: return MY_PROPERTY.VALUE_A;
        }
    }
};
```

Refer to existing descriptors in `src/css/property-descriptors/` for examples of each type:
- `VALUE` — `font-size.ts`, `opacity.ts`
- `LIST` — `background-image.ts`, `margin.ts`
- `IDENT_VALUE` — `display.ts`, `visibility.ts`
- `TYPE_VALUE` — `background-color.ts` (color type)
- `TOKEN_VALUE` — `content.ts`

### Step 2: Register in CSSParsedDeclaration

In `src/css/index.ts`:

1. **Import the descriptor:**
   ```typescript
   import { myProperty } from './property-descriptors/my-property';
   ```

2. **Add a typed field** to `CSSParsedDeclaration` (alphabetically):
   ```typescript
   myProperty!: ReturnType<typeof myProperty.parse>;
   ```

3. **Add a standardProps entry** (the third field is the camelCase CSS property name
   that CSSStyleDeclaration exposes):
   ```typescript
   ['myProperty', myProperty, 'myProperty'],
   ```

### Step 3: Add rendering logic (if needed)

If the property affects visual rendering, add a handler in the appropriate renderer:
- **Background-related** → `src/render/canvas/background-renderer.ts`
- **Border-related** → `src/render/canvas/border-renderer.ts`
- **Content/layout-related** → `src/render/canvas/content-renderer.ts`
- **Transform/effect-related** → `src/render/stacking-context.ts` (add to `ElementPaint.effects`)

### Step 4: Add a unit test

Create or extend a test file in `src/css/property-descriptors/__tests__/`:

```typescript
import { deepStrictEqual } from 'assert';
import { myProperty } from '../my-property';
import { Context } from '../../../core/context';

vi.mock('../../../core/context');

it('parses "value-a"', () => {
    const context = {} as Context;
    deepStrictEqual(myProperty.parse(context, 'value-a'), 0);
});
```

### Step 5: Update docs

Update `docs/features.md` to list the newly supported property.

## Testing

### Running Tests

```bash
pnpm test             # Run all tests
pnpm test -- --watch  # Watch mode
pnpm test path/to/file # Run specific test file
```

### Test Structure

Tests are colocated with source in `__tests__/` directories:
- `src/css/property-descriptors/__tests__/` — CSS property parsing tests
- `src/css/types/__tests__/` — CSS type tests (color, image, etc.)
- `src/render/canvas/__tests__/` — Renderer tests
- `src/dom/__tests__/` — DOM cloning tests
- `src/core/__tests__/` — Core utility tests

## Code Style

- TypeScript strict mode (noUncheckedIndexedAccess excluded)
- No `any` in production code (use proper types or `unknown` with narrowing)
- Prefer `const enum` for enum values that appear at runtime
- Use `import type` for type-only imports to avoid circular dependencies
- Match surrounding code style — the codebase uses semicolons, single quotes, 4-space indentation

## Build System

```
Rolldown → CJS bundle (dist/html2canvas-pro.cjs)
        → ESM bundle (dist/html2canvas-pro.esm.js)
        → UMD bundle (dist/html2canvas-pro.js)
        → UMD minified bundle (dist/html2canvas-pro.min.js)
        → Test runner bundle (build/testrunner.js)
```

- `pnpm build` — full build (tsc + rolldown)
- `pnpm typecheck` — TypeScript check only
- Git hooks (Husky) run prettier + eslint on staged files

## Release Process

```bash
pnpm release <version>  # e.g., pnpm release 2.1.1
```

This bumps the version, runs the build, and publishes to npm.

## Architecture Reference

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed walkthrough of the rendering pipeline,
key design patterns, and file size reference.

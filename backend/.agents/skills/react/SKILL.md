---
name: react
description: Best practices for React frontend development including Feature-Sliced Design (FSD), compound components, React Context, and Zustand state management.
---

# React Frontend Architect & Developer

You are a Senior Frontend Engineer. Your goal is to build highly scalable, modular, type-safe, and visually stunning React applications. You adhere to Feature-Sliced Design (FSD), compound component design patterns, localized component state coordination using Context, and global/domain state management using Zustand.

---

## 1. Feature-Sliced Design (FSD)

Organize the frontend codebase into layers, slices, and segments to ensure decoupled domain boundaries and a strict dependency hierarchy.

### The FSD Layer Stack
Layers are arranged in a strict top-down hierarchy. **A layer can only import from layers below it.** (e.g., code in `features` can import from `entities` and `shared`, but NEVER from `widgets` or `pages`).

1. **`app`**: Application-wide setup, providers, global styles, and routing configurations.
2. **`pages`**: Compositional layer containing individual pages/screens. Slices assemble widgets and features.
3. **`widgets`**: Self-contained semantic UI blocks combining features and entities (e.g. `Header`, `PaywallConsole`).
4. **`features`**: User actions and business scenarios that bring value (e.g. `InitiateAbTest`, `SearchHistory`, `RemediateBreach`).
5. **`entities`**: Business domains and domain-specific concepts (e.g. `User`, `Application`, `PaywallMutation`, `TelemetryMetrics`).
6. **`shared`**: General-purpose helpers, reusable UI kits (design system elements like buttons, inputs), API clients, and theme tokens.

### Directory Structure Example
```
src/
├── app/
│   ├── providers/          # React context providers, query clients, router
│   ├── index.css           # Global CSS variables, theme design tokens
│   └── main.tsx            # Entry point
├── pages/
│   └── dashboard/
│       └── ui/DashboardPage.tsx
├── widgets/
│   └── paywall-console/    # Combines paywall entities and isolation actions
│       ├── ui/PaywallConsole.tsx
│       └── index.ts
├── features/
│   └── initiate-ab-test/   # Slider, buttons, and API trigger for A/B tests
│       ├── ui/ExperimentForkSlider.tsx
│       ├── api/initiateTest.ts
│       └── index.ts
├── entities/
│   └── paywall-mutation/
│       ├── ui/PaywallPreviewCard.tsx
│       ├── model/types.ts
│       └── index.ts
└── shared/
    ├── api/                # Base API fetch wrappers / Axios clients
    └── ui/                 # Reusable atomic UI (Button, Slider, Card)
```

### Critical FSD Rules
*   **Public API**: Every slice must expose a public interface via an `index.ts` file at the root of the slice. Only elements exported in `index.ts` can be imported by other slices. Never perform deep imports (e.g. `import { x } from '@/entities/user/ui/Card'`). Instead, import from the slice root: `import { UserCard } from '@/entities/user'`.
*   **No Cross-Imports in the Same Layer**: Slices in the same layer cannot import from each other (e.g. `entities/user` cannot import from `entities/app`). If you need to combine them, do so in a higher layer (e.g. in a widget or feature).

---

## 2. Compound Component Pattern

Use the Compound Component pattern to build cohesive, flexible, and declarative UI components that implicitly share state.

### Key Rules
1. **Context Initialization**: Create a dedicated React context inside the parent component.
2. **State Guard Hook**: Provide a custom hook (e.g., `useCompoundContext`) that throws a clear runtime error if any child sub-component is rendered outside the parent provider boundary.
3. **Structural Flexibility**: Sub-components must be composable in any order, and the layout should be controlled declaratively by the consumer.

### TypeScript / TSX Example: `<Select />`

```tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

// 1. Define Context Interface
interface SelectContextType {
  value: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectOption: (val: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

// 2. State Guard Hook
function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error(
      "Select sub-components must be rendered within a <Select> parent component."
    );
  }
  return context;
}

// 3. Parent Component
interface SelectProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
}

export function Select({ defaultValue = "", onChange, children }: SelectProps) {
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);

  const selectOption = (val: string) => {
    setValue(val);
    setIsOpen(false);
    if (onChange) onChange(val);
  };

  return (
    <SelectContext.Provider value={{ value, isOpen, setIsOpen, selectOption }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

// 4. Sub-Components
interface TriggerProps {
  placeholder?: string;
}

Select.Trigger = function SelectTrigger({ placeholder = "Select option..." }: TriggerProps) {
  const { value, isOpen, setIsOpen } = useSelectContext();
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      type="button"
      className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white shadow-md hover:bg-slate-800 transition"
    >
      <span>{value || placeholder}</span>
      <span className="ml-2">{isOpen ? "▲" : "▼"}</span>
    </button>
  );
};

interface ContentProps {
  children: ReactNode;
}

Select.Content = function SelectContent({ children }: ContentProps) {
  const { isOpen } = useSelectContext();
  if (!isOpen) return null;
  return (
    <div className="absolute z-10 mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
      {children}
    </div>
  );
};

interface OptionProps {
  value: string;
  children: ReactNode;
}

Select.Option = function SelectOption({ value, children }: OptionProps) {
  const { value: selectedValue, selectOption } = useSelectContext();
  const isSelected = selectedValue === value;
  
  return (
    <button
      onClick={() => selectOption(value)}
      type="button"
      className={`w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white transition ${
        isSelected ? "bg-indigo-500 text-white font-medium" : "text-slate-300"
      }`}
    >
      {children}
    </button>
  );
};
```

---

## 3. Local UI Coordination: React Context API

Use the React Context API **exclusively** for local UI state coordination, layout flags, and component-tree configurations (e.g., compound component state, themes, localized layouts, step wizards).
*   **Keep it Lightweight**: Do not store heavy business state, metrics cache, or high-velocity event telemetry data in React Context. Frequent updates to context values force full subtree re-renders, causing visual lag and event loop congestion.
*   **Memoize Providers**: Wrap the `value` object passed to the Provider in `useMemo` to prevent unnecessary re-renders of consuming components when the parent re-renders.

---

## 4. Business & Domain Logic: Zustand

For global state, cached server responses, business telemetry logs, and app-wide shared state, use **Zustand**.

### Core Best Practices
1. **Independent, Focused Stores**: Avoid single monolithic stores. Instead, split stores by business slice or bounded contexts (e.g., `useTelemetryStore`, `useExperimentStore`, `useCohortStore`).
2. **Collocate Actions**: Group the state and the mutation actions modifying that state in the same store. This keeps updates self-contained.
3. **Atomic Selectors**: Always consume store values using atomic selectors to prevent unnecessary re-renders.
   * *Correct*: `const activeTest = useExperimentStore((s) => s.activeTest);`
   * *Incorrect*: `const { activeTest, items } = useExperimentStore();` (forces component update whenever *any* part of the store changes).
4. **Immutability & Safety**: Never modify the state object directly inside component code. Always perform mutations through collocated store actions using Zustand’s `set` callback.

### TypeScript Zustand Store Example

```typescript
import { create } from "zustand";

interface TelemetryMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

interface TelemetryState {
  metrics: Record<string, TelemetryMetrics>;
  isLoading: boolean;
  error: string | null;
  // Actions
  fetchMetrics: (appId: string) => Promise<void>;
  updateMetricsInMemory: (appId: string, delta: Partial<TelemetryMetrics>) => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  metrics: {},
  isLoading: false,
  error: null,

  fetchMetrics: async (appId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/v1/metrics?appId=${appId}`);
      if (!response.ok) throw new Error("Failed to fetch telemetry metrics");
      const data: TelemetryMetrics = await response.json();
      
      set((state) => ({
        metrics: { ...state.metrics, [appId]: data },
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "An error occurred", isLoading: false });
    }
  },

  updateMetricsInMemory: (appId, delta) => {
    const current = get().metrics[appId];
    if (!current) return;

    set((state) => ({
      metrics: {
        ...state.metrics,
        [appId]: {
          ...current,
          ...delta,
          // Recalculate derived state
          conversionRate:
            current.impressions + (delta.impressions || 0) > 0
              ? ((current.conversions + (delta.conversions || 0)) /
                  (current.impressions + (delta.impressions || 0))) *
                100
              : 0,
        },
      },
    }));
  },
}));
```

---

## 5. Front-End Standards & Constraints

*   **TypeScript Strictness**: 
    *   No `any` is allowed. Always type components and parameters.
    *   Use React types explicitly: `ReactNode`, `CSSProperties`, `HTMLAttributes<HTMLButtonElement>`.
*   **Styling**: Use Vanilla CSS or tailwind variables defined inside `app/index.css`.
*   **Accessibility (a11y)**: Use semantic HTML5 elements (`<button>`, `<nav>`, `<main>`). Add proper `aria-` labels for custom inputs, interactive elements, and state transitions (e.g., `aria-expanded`).
*   **Performance**: Use React's concurrent rendering features when appropriate. Ensure clean-ups inside `useEffect` (e.g., clearing intervals, unsubscribing from event listeners).

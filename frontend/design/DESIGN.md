---
name: Autonomous Agentic Interface
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#454653'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#767684'
  outline-variant: '#c6c5d5'
  surface-tint: '#4752c2'
  primary: '#4752c2'
  on-primary: '#ffffff'
  primary-container: '#818cff'
  on-primary-container: '#0d1892'
  inverse-primary: '#bdc2ff'
  secondary: '#5c5c79'
  on-secondary: '#ffffff'
  secondary-container: '#dedcff'
  on-secondary-container: '#60607d'
  tertiary: '#586063'
  on-tertiary: '#ffffff'
  tertiary-container: '#90989c'
  on-tertiary-container: '#283033'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000668'
  on-primary-fixed-variant: '#2d38a9'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c4c3e5'
  on-secondary-fixed: '#181932'
  on-secondary-fixed-variant: '#444460'
  tertiary-fixed: '#dce4e8'
  tertiary-fixed-dim: '#c0c8cc'
  on-tertiary-fixed: '#151d20'
  on-tertiary-fixed-variant: '#40484b'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
  agent-surface: rgba(255, 255, 255, 0.7)
  glass-border: rgba(255, 255, 255, 0.4)
  active-gradient: 'linear-gradient(135deg, #818CFF 0%, #6366F1 100%)'
  success-emerald: '#10B981'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  sidebar-width: 320px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is engineered for high-performance, developer-centric platforms that manage autonomous AI agents. The aesthetic is "Agentic Modernism"—a blend of clean, functional SaaS layouts and sophisticated, futuristic glassmorphism that signals the presence of an underlying intelligence.

The system relies on high-transparency surfaces, subtle background blurs, and vibrant "intelligence pulses" (gradients) to differentiate between static data and generative AI components. It evokes a sense of reliability and technical mastery while maintaining a welcoming, approachable feel for complex multi-app management.

## Colors

The palette centers on a "Developer Indigo" primary color that feels both technical and high-energy. The background utilizes a very light neutral gray to reduce eye strain, while pure white is reserved for high-elevation "Generative" surfaces. 

We use a "Glass-First" approach for agent-driven components. Sidebars and floating panels should utilize semi-transparent white backgrounds with a backdrop-filter blur. For multi-asset contexts (e.g., App A vs. App B), use the secondary slate color for structural elements and the primary indigo for active, autonomous tasks.

## Typography

The typography system prioritizes legibility in data-dense environments. **Plus Jakarta Sans** serves as the primary typeface, offering a friendly yet professional geometric structure that scales well from massive hero headers to tight sidebar labels.

For technical details, RAG (Retrieval-Augmented Generation) status indicators, and "Autonomous Synthesis" logs, use **JetBrains Mono**. This monospaced font provides the necessary "developer-centric" feel and ensures that status codes and variables are immediately distinguishable from standard UI text.

## Layout & Spacing

The layout is built on a 12-column fluid grid for the main content area, with a persistent fixed-width "Copilot Sidebar" on the right (320px). This sidebar acts as the primary interface for "Agentic" interactions and should always be visible in the desktop view.

Spacing follows a 4px base unit. Component internal padding should be generous (20px+) to maintain the "Minimalist" aesthetic. In multi-app management views, use a "Split-Pane" or "Tiled Card" layout where each asset (Productivity, Fitness) is encapsulated in its own high-level container with 24px gutters.

## Elevation & Depth

This system eschews traditional heavy shadows in favor of **Tonal Layers** and **Glassmorphism**.

1.  **Level 0 (Background):** Neutral light gray (`#F3F4F6`).
2.  **Level 1 (Cards):** Pure white with a 1px soft border (`#E5E7EB`). No shadow.
3.  **Level 2 (Active Synthesis):** Glassmorphic surfaces with `backdrop-filter: blur(12px)`, a white 70% opacity fill, and a subtle indigo-tinted glow (`0px 10px 30px rgba(129, 140, 255, 0.1)`).
4.  **Level 3 (Modals/Popovers):** Standard white with a deep, diffused ambient shadow to provide focus.

The "Agentic" feel is achieved by using the glassmorphic level for any component that is being "generated" or "controlled" by the AI.

## Shapes

The shape language is "Rounded," utilizing 0.5rem (8px) for standard components like buttons and inputs, and 1rem (16px) for larger cards and panels. This provides a balance between the precision of a professional tool and the softness of a modern AI assistant. 

Status badges and "Agent Active" indicators should use a full pill-shape (9999px) to stand out against the geometric structure of the rest of the UI.

## Components

### Buttons
Primary buttons use the indigo gradient with white text. Ghost buttons use a 1px slate border. For "Agentic" actions (e.g., "Synthesize UI"), use a subtle shimmering animation on the button background.

### The Copilot Sidebar
A persistent vertical panel on the right. It must feature a glassmorphic background, a dedicated monospaced "Log" area at the bottom for RAG status, and a conversational input field at the base.

### Generative Cards
Cards that hold "Autonomous RAG UI Synthesis" outputs should have a distinct visual treatment: a 2px primary-to-transparent gradient border and a slight inner glow. These cards represent UI elements that the agent has built dynamically.

### Inputs & Selectors
Use a minimal, flat style with a 1px border. On focus, the border should transition to primary indigo with a soft outer glow. Use mono-type for any input related to technical configurations.

### App Asset Switchers
A top-level segmented control or "Tab" system to switch between "Productivity" and "Fitness" contexts. The active state should be indicated by a solid indigo underline or a pill-shaped background shift.
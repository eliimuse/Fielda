# 🏟️ Fielda

**GenAI-powered stadium operations & fan experience platform for the FIFA World Cup 2026**

Built for **Google PromptWars: Virtual** — real-time translation, predictive crowd intelligence, and accessibility-first navigation, in one unified platform.

[**Live Demo →**](https://fielda.onrender.com/) · [Report an Issue](https://github.com/eliimuse/Fielda/issues)

---

## What is Fielda?

Fielda is a two-module operations platform built to help stadiums run FIFA World Cup 2026 matchdays more safely, inclusively, and intelligently. It unifies two audiences that usually work off completely separate tools:

- **Operations Intelligence** — a command console for venue organizers and staff: live telemetry, tactical incident alerts, AI-assisted staff deployment, and a spatial map of the venue.
- **Unity Path** — a fan-facing companion focused on accessibility: sensory-safe navigation, wheelchair routing, and a multilingual AI assistant.

Both modules share one login system, one live data layer, and — critically — the same underlying event data. When a fan reports an issue or triggers an emergency alert in Unity Path, it surfaces immediately in the Operations Intelligence console, where GenAI recommends a response.


## Screens

**Operations Intelligence**
- **Vanguard Command Center** — live gate load, active alerts, on-duty responder count, and an AI predictive-risk panel forecasting bottlenecks 20 minutes out
- **Comms & Translation Node** — real-time multilingual staff communication
- **Deployment Co-pilot** — Gemini-recommended staff reallocation with confidence scoring, plus manual override for when the AI call needs correcting
- **Spatial & Infrastructure Map** — 2D/3D venue schematic tracking live incidents and marshal positions
- **Data Console** — the input layer for simulating live World Cup telemetry and duty-roster data (incident reports, staff check-in, crowd telemetry, sensory logs)

**Unity Path**
- **Matchday Hub** — at-a-glance accessibility status, fixtures, and quick-dispatch requests for in-person assistance
- **Mobility Navigator** — wheelchair-optimized, crowd-avoidant indoor routing with AI pathfinding
- **Sensory Map** — live noise/strobe/quiet-zone visualization for sensory-sensitive fans
- **AI Accessibility Assistant** — multilingual conversational support

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS, Framer Motion for ambient/interaction animation
- **Backend:** Express (`server.ts`) — proxies all Gemini API calls so no API key is ever exposed client-side
- **AI:** Google Gemini API (`@google/genai`), with simulated fallback responses when unconfigured
- **Data layer:** a Supabase-shaped client (`src/lib/supabase.ts`) exposing the same query interface (`.from().select().eq()...`) the app is architected against — see **Current Limitations** below

## Getting Started

**Prerequisites:** Node.js

```bash
git clone https://github.com/eliimuse/Fielda.git
cd Fielda
npm install
```

Copy `.env.example` to `.env.local` and set your Gemini API key:

```bash
GEMINI_API_KEY=your_key_here
```

Run the app:

```bash
npm run dev
```

The app runs as a single process — Express serves both the API routes and the Vite frontend, so you don't need to run separate frontend/backend commands.

> No API key? The app still runs fully — Gemini-backed features fall back to realistic simulated responses so every flow remains demoable.

## Roles & Access

Fielda uses role-based auth with three roles selected at signup:

- **Fan** → routed to Unity Path
- **Organizer** / **Staff** → routed to Operations Intelligence, with access to the Data Console and dispatch/reassignment tools (gated from the Fan role)



## Acknowledgments

Built for **Google PromptWars: Virtual**, prototyped with **Google AI Studio**, and powered by the **Gemini API**.

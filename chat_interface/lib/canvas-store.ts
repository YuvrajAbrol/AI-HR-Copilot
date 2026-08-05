"use client"

import { create } from 'zustand'

// Which module renderer the Side Canvas uses for an artifact. Driven by the
// hr-mcp tool's "_canvas.module" hint, with a tool-name fallback.
export type CanvasModule =
  | 'employee_profile'
  | 'pto'
  | 'org_chart'
  | 'benefits'
  | 'policy'
  | 'json'

// A single result surfaced to the right-hand Side Canvas for review. Built from
// a tool ObservationEvent; `data` is the parsed tool payload.
export interface CanvasArtifact {
  id: string
  module: CanvasModule
  toolName: string
  title: string
  data: any
  createdAt: number
}

interface CanvasState {
  open: boolean
  artifacts: CanvasArtifact[]
  activeId: string | null

  openArtifact: (a: {
    module: CanvasModule
    toolName: string
    title: string
    data: any
  }) => void
  setOpen: (open: boolean) => void
  toggle: () => void
  select: (id: string) => void
  clear: () => void
}

// Keep a short rolling history so the user can flip back to a prior module
// (e.g. the org chart they viewed two questions ago).
const MAX_ARTIFACTS = 24

function newId(): string {
  return `canvas-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useCanvas = create<CanvasState>((set) => ({
  open: false,
  artifacts: [],
  activeId: null,

  openArtifact: ({ module, toolName, title, data }) =>
    set((state) => {
      const artifact: CanvasArtifact = {
        id: newId(),
        module,
        toolName,
        title,
        data,
        createdAt: Date.now(),
      }
      const artifacts = [artifact, ...state.artifacts].slice(0, MAX_ARTIFACTS)
      return { artifacts, activeId: artifact.id, open: true }
    }),

  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
  select: (activeId) => set({ activeId, open: true }),
  clear: () => set({ artifacts: [], activeId: null, open: false }),
}))

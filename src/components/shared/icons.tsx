"use client";

// Workaround for Turbopack tree-shaking bug that strips the `Layers` named export
// from lucide-react at runtime. Importing via a re-export wrapper fixes it.
import { Layers as _Layers } from "lucide-react";
export const LayersIcon = _Layers;

const slider = (label: string, defaultValue: number, min: number, max: number, step: number, description: string, unit?: string) => ({ type: "slider" as const, label, defaultValue, min, max, step, description, sliderValueKind: "continuous" as const, ...(unit ? { unit } : {}) });
const pointerSlider = (target: string, label: string, value: number, min: number, max: number, step: number, description: string, unit?: string) => ({ ...slider(label, value, min, max, step, description, unit), target, applicability: { mode: "conditional" as const, all: [{ target: "pointer.enabled", equals: true }] }, performanceRole: "responsiveness" as const });
export const pointerSection = {
  id: "pointer", title: "Pointer", controls: {
    enabled: { type: "switch" as const, label: "Response", defaultValue: true, target: "pointer.enabled", applicability: { mode: "always" as const }, performanceRole: "responsiveness" as const },
    radius: pointerSlider("pointer.radius", "Interaction radius", 85, 24, 600, 1, "Outer boundary of cursor influence in image pixels.", "px"),
    repelRadius: pointerSlider("pointer.repelRadius", "Repel radius", 200, 0, 600, 1, "Particles inside this distance move away. Above Interaction radius, the whole field repels and attraction is absent.", "px"),
    repelForce: pointerSlider("pointer.repelForce", "Repel force", 1.2, 0, 3, 0.01, "How strongly the cursor pushes particles outward."),
    attractForce: pointerSlider("pointer.attractForce", "Attract force", 0.06, 0, 0.5, 0.005, "Pull in the ring between Repel radius and Interaction radius; set Repel radius lower to use it."),
    return: pointerSlider("pointer.return", "Return speed", 0.008, 0.002, 0.04, 0.001, "How strongly displaced particles return to their original cells."),
    damping: pointerSlider("pointer.damping", "Inertia", 0.92, 0.8, 0.98, 0.01, "Higher values retain motion longer; lower values settle faster."),
  },
};
export const pinDefaults = { position: { x: "0.00", y: "0.00" }, color: "#FF4F2E", radius: 100, coverage: 0.55, noise: 0.85, speed: 1, softness: 0.25, scatter: 0.2 };
export const pinsSection = { id: "pins", title: "Pins", controls: { pins: {
  applicability: { mode: "always" as const }, defaultValue: [pinDefaults],
  itemControls: {
    position: { type: "vector" as const, label: "Position", defaultValue: pinDefaults.position },
    color: { type: "color" as const, label: "Color", defaultValue: pinDefaults.color },
    radius: slider("Radius", 100, 2, 600, 1, "Size of the local noise region in image pixels.", "px"),
    coverage: slider("Color mix", 0.55, 0, 1, 0.01, "Balance between the original particle color and the Pin color. With Noise amount at zero this is a steady tint."),
    noise: slider("Noise amount", 0.85, 0, 1, 0.01, "Independent color variation per particle. Zero gives a steady color mix; higher values switch between original and accent colors."),
    speed: slider("Noise speed", 1, 0, 4, 0.05, "Speed of color noise and scatter along the timeline. Zero freezes this Pin; timeline duration sets the overall loop length."),
    softness: slider("Soft edge", 0.25, 0, 1, 0.01, "Width of the edge fade for color and scatter. Zero gives a hard radius; particles stay crisp."),
    scatter: slider("Scatter", 0.2, 0, 1, 0.01, "How far peripheral particles drift from the grid. Zero disables displacement while keeping color noise. The center is not pushed out."),
  }, itemLabel: "Pin", minItems: 0, performanceReason: "Pins apply local color noise and peripheral offsets without rebuilding source data.", performanceRole: "responsiveness" as const, target: "pins.items", type: "collectionActions" as const,
} } };

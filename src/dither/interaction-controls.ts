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
export const pinDefaults = { position: { x: "0.00", y: "0.00" }, color: "#FF4F2E", radius: 100, flashes: 2, fill: 25, hold: 20, clear: 25, branches: 0.65 };
export const pinsSection = { id: "pins", title: "Pins", controls: { pins: {
  applicability: { mode: "always" as const }, defaultValue: [pinDefaults],
  itemControls: {
    position: { type: "vector" as const, label: "Position", defaultValue: pinDefaults.position },
    color: { type: "color" as const, label: "Color", defaultValue: pinDefaults.color },
    radius: slider("Radius", 100, 2, 600, 1, "Hard circular boundary in image pixels. Every activated cell is fully colored, without edge blur.", "px"),
    flashes: { ...slider("Flashes", 2, 1, 8, 1, "Number of complete flashes per timeline loop. More flashes means faster animation."), sliderValueKind: "discrete" as const, variant: "discrete" as const },
    fill: slider("Fill time", 25, 0, 30, 1, "Percent of each flash spent spreading outward. Zero fills the circle immediately.", "%"),
    hold: slider("Hold time", 20, 0, 30, 1, "Percent of each flash with the entire circle colored.", "%"),
    clear: slider("Clear time", 25, 0, 30, 1, "Percent of each flash spent switching cells back to their base appearance. The remaining time is a pause.", "%"),
    branches: slider("Branching", 0.65, 0, 1, 0.01, "Zero makes an even circular wave; higher values create staggered tendrils from the center."),
  }, itemLabel: "Pin", minItems: 0, performanceReason: "Pins apply hard cell colors and deterministic timeline waves without rebuilding source data.", performanceRole: "responsiveness" as const, target: "pins.items", type: "collectionActions" as const,
} } };

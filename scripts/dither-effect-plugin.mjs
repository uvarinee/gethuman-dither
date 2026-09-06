import { build } from "vite";
import path from "node:path";
const id = "virtual:dither-effect-source";
const resolvedId = "\0" + id;
// Build the distributable from the SAME source modules on every production build.
export function ditherEffectPlugin() {
  return {
    name: "dither-effect-distribution",
    resolveId(source) { if (source === id) return resolvedId; },
    async load(source) {
      if (source !== resolvedId) return;
      const result = await build({
        configFile: false, publicDir: false, logLevel: "error",
        build: { write: false, minify: false, target: "es2022",
          lib: { entry: path.resolve("src/export-config/player.ts"), formats: ["es"], fileName: "effect" } },
      });
      const outputs = Array.isArray(result) ? result.flatMap(r => r.output) : result.output;
      const chunks = outputs.filter(o => o.type === "chunk");
      if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length) throw new Error("Effect bundle must be standalone.");
      for (const file of Object.keys(chunks[0].modules)) this.addWatchFile(file);
      return "export default " + JSON.stringify(chunks[0].code) + ";";
    },
    handleHotUpdate(context) {
      if (/\/src\/(dither|export-config)\//.test(context.file.replaceAll("\\", "/"))) {
        const module = context.server.moduleGraph.getModuleById(resolvedId);
        if (module) context.server.moduleGraph.invalidateModule(module);
      }
    },
  };
}

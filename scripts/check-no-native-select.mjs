import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const EXTENSIONS = new Set([".jsx", ".tsx"]);
const offenders = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!EXTENSIONS.has(ext)) continue;
    const text = fs.readFileSync(full, "utf8");
    if (/<select\b/i.test(text)) offenders.push(full);
  }
}

if (fs.existsSync(ROOT)) walk(ROOT);

if (offenders.length) {
  console.error("Native <select> is not allowed. Use CustomSelect instead.");
  offenders.forEach((f) => console.error(` - ${path.relative(process.cwd(), f)}`));
  process.exit(1);
}

console.log("OK: no native <select> usage found in src/**/*.jsx|tsx");


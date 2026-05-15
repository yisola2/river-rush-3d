import { cp, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const dist = join(root, "dist");
const files = ["styles.css"];

await mkdir(dist, { recursive: true });

for (const file of files) {
  await copyFile(join(root, file), join(dist, file));
}

await cp(join(root, "assets"), join(dist, "assets"), {
  recursive: true,
  force: true,
});

const html = await readFile(join(root, "index.html"), "utf8");
await writeFile(
  join(dist, "index.html"),
  html.replace('<script type="module" src="./dist/game.js"></script>', '<script type="module" src="./game.js"></script>'),
);

console.log(`Built TypeScript game into ${dist}`);

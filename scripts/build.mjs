import { execSync } from "node:child_process";

function run(command, description) {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`[build] Failed: ${description}`, error);
    process.exit(1);
  }
}

// 1. TypeScript 类型检查
run("tsc", "Running TypeScript type check");

// 2. 清理并运行 Vite 打包 popup 与 background
run("vite build", "Building popup & background with Vite");

// 3. 生成 Tailwind CSS
run(
  "npx tailwindcss -i src/styles.css -o dist/assets/styles.css --minify",
  "Compiling Tailwind CSS"
);

// 4. esbuild 打包 content 入口 (IIFE)
run(
  'npx --no-install esbuild src/content/index.tsx --bundle --minify --charset=utf8 --format=iife --platform=browser --outfile=dist/assets/content.js --define:process.env.NODE_ENV=\'"production"\'',
  "Bundling content script (index.tsx)"
);

// 5. esbuild 打包 search 模块 (ESM + Code Splitting)
run(
  'npx --no-install esbuild src/content/search.tsx --bundle --minify --charset=utf8 --format=esm --splitting --outdir=dist/assets --entry-names=content-search --chunk-names=chunk-[hash] --platform=browser --define:process.env.NODE_ENV=\'"production"\'',
  "Bundling search overlay (search.tsx)"
);

// 6. esbuild 打包 tabs 切换器模块 (ESM + Code Splitting)
run(
  'npx --no-install esbuild src/content/tabs.ts --bundle --minify --charset=utf8 --format=esm --splitting --outdir=dist/assets --entry-names=content-tabs --chunk-names=chunk-[hash] --platform=browser --define:process.env.NODE_ENV=\'"production"\'',
  "Bundling tabs switcher (tabs.ts)"
);

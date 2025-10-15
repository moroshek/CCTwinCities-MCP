import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildWidget() {
  console.log('Building volunteer widget...');

  // Ensure dist directory exists
  mkdirSync(`${__dirname}/dist`, { recursive: true });

  // Bundle React component
  const result = await esbuild.build({
    entryPoints: [`${__dirname}/widget/volunteer-list.tsx`],
    bundle: true,
    format: 'iife',
    globalName: 'VolunteerWidget',
    jsx: 'automatic',
    jsxImportSource: 'react',
    platform: 'browser',
    target: 'es2020',
    write: false,
    minify: true,
    external: ['react', 'react-dom'],
  });

  const bundledJs = result.outputFiles[0].text;

  // Create standalone HTML with inlined React
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #root {
      width: 100%;
      min-height: 100vh;
    }
    a {
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    button:hover {
      opacity: 0.9;
    }
    button:active {
      transform: translateY(1px);
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- React from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Bundled component -->
  <script>
    ${bundledJs}

    // Mount the component
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(VolunteerWidget.default));
  </script>
</body>
</html>`;

  writeFileSync(`${__dirname}/dist/volunteer-widget.html`, html);
  console.log('✓ Widget built: dist/volunteer-widget.html');
}

buildWidget().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

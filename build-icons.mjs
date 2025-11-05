// build-icons.mjs (располагается в корне проекта Laravel)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import svgstore from 'svgstore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути для Laravel проекта:
const iconsDir = path.join(__dirname, 'public', 'assets', 'icons');
const spritePath = path.join(__dirname, 'public', 'assets', 'sprite', 'sprite.svg');

const sprites = svgstore();

const files = fs.readdirSync(iconsDir);

files.forEach(file => {
  if (path.extname(file) === '.svg') {
    const id = path.basename(file, '.svg');
    const filepath = path.join(iconsDir, file);
    const svgContent = fs.readFileSync(filepath, 'utf8');
    sprites.add(`icon-${id}`, svgContent); // id будет icon-save, icon-edit и т.д.
  }
});

fs.mkdirSync(path.dirname(spritePath), { recursive: true });
fs.writeFileSync(spritePath, sprites.toString({ inline: true }));

console.log('✅ Спрайт успешно создан:', spritePath);

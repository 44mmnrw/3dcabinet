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
    let svgContent = fs.readFileSync(filepath, 'utf8');
    
    // Заменяем фиксированные цвета stroke на currentColor для управления через CSS
    // Заменяем стандартные серые цвета контуров (#636E72, #64748B и их варианты)
    svgContent = svgContent.replace(/stroke="#636E72"/g, 'stroke="currentColor"');
    svgContent = svgContent.replace(/stroke="#64748B"/g, 'stroke="currentColor"');
    // Также заменяем любые другие hex-цвета в stroke (кроме black и white)
    svgContent = svgContent.replace(/stroke="(#(?:[0-9A-Fa-f]{3}){1,2})"/g, (match, color) => {
      // Не заменяем black, white и специальные цвета заливки
      const lowerColor = color.toLowerCase();
      if (lowerColor === '#000' || lowerColor === '#000000' || 
          lowerColor === '#fff' || lowerColor === '#ffffff' ||
          lowerColor === '#1e88e5' || lowerColor === '#64b5f6' ||
          lowerColor === '#eeeeee' || lowerColor === '#37474f' ||
          lowerColor === '#607d8b') {
        return match; // Оставляем как есть
      }
      return `stroke="currentColor"`;
    });
    
    sprites.add(`icon-${id}`, svgContent); // id будет icon-save, icon-edit и т.д.
  }
});

fs.mkdirSync(path.dirname(spritePath), { recursive: true });
fs.writeFileSync(spritePath, sprites.toString({ inline: true }));

console.log('✅ Спрайт успешно создан:', spritePath);

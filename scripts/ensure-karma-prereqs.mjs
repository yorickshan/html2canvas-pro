import { copyFileSync, existsSync } from 'fs';

const required = ['build/testrunner.js', 'dist/html2canvas-pro.js'];

for (const file of required) {
    if (!existsSync(file)) {
        console.error(`Missing ${file}. Run "npm run build" before "npm run karma".`);
        process.exit(1);
    }
}

if (!existsSync('tests/assets/image.jpg')) {
    copyFileSync('tests/assets/image_1.jpg', 'tests/assets/image.jpg');
}

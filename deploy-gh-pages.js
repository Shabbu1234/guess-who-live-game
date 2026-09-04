import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  console.log('Building production bundle...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('Switching to gh-pages branch...');
  execSync('git checkout -B gh-pages', { stdio: 'inherit' });

  console.log('Copying dist files to root...');
  fs.writeFileSync('dist/.nojekyll', '');
  const distFiles = fs.readdirSync('dist');
  distFiles.forEach(f => {
    fs.cpSync(path.join('dist', f), path.join('.', f), { recursive: true, force: true });
  });

  execSync('git add index.html assets .nojekyll', { stdio: 'inherit' });
  execSync('git commit -m "Deploy dist with .nojekyll to GitHub Pages root"', { stdio: 'inherit' });
  execSync('git push origin gh-pages --force', { stdio: 'inherit' });
  execSync('git checkout master', { stdio: 'inherit' });

  console.log('🎉 GitHub Pages Deployed Successfully!');
} catch (e) {
  console.error('Deployment error:', e);
}

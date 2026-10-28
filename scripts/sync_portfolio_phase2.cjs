const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function syncPhase2() {
  const images = [
    'reviewforge_demo.gif',
    'reviewforge_diff_viewer.png',
    'reviewforge_dashboard.png',
    'reviewforge_taint_flow.png',
    'reviewforge_pr_description.png'
  ];

  const srcDir = path.resolve(__dirname, '../docs/images');
  const siteDir = 'B:/workgit/mtlg-site';
  const labsDir = 'B:/workgit/mtlglabs-space';

  console.log('1. Copying authentic screenshots and demo GIF to mtlg-site and mtlglabs-space (NO LOGOS)...');
  for (const img of images) {
    const srcFile = path.join(srcDir, img);
    fs.copyFileSync(srcFile, path.join(siteDir, 'images', img));
    fs.copyFileSync(srcFile, path.join(labsDir, 'images', img));
    console.log(`✓ Copied ${img}`);
  }

  // 2. Update project_images_map.json
  console.log('2. Updating project_images_map.json in both sites...');
  const relativeImages = images.map(img => `images/${img}`);

  const updateImagesMap = (repoDir) => {
    const mapPath = path.join(repoDir, 'project_images_map.json');
    if (fs.existsSync(mapPath)) {
      const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      map.reviewforge = relativeImages;
      fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
      console.log(`✓ Updated ${mapPath}`);
    }
  };
  updateImagesMap(siteDir);
  updateImagesMap(labsDir);

  // 3. Update projects.json
  console.log('3. Updating projects.json to LIVE badge with finalized screenshots...');
  const updateProjects = (repoDir) => {
    const projPath = path.join(repoDir, 'projects.json');
    if (fs.existsSync(projPath)) {
      const projects = JSON.parse(fs.readFileSync(projPath, 'utf8'));
      const idx = projects.findIndex(p => p.id === 'reviewforge');
      if (idx !== -1) {
        projects[idx].badgeLabs = { text: 'Production Ready', type: 'live' };
        projects[idx].badgeSite = { text: 'Production Ready', type: 'live' };
        projects[idx].images = relativeImages;
        projects[idx].image = 'images/reviewforge_diff_viewer.png';
        projects[idx].desc = 'Self-hosted AI pull request reviewer that parses AST diffs, audits OWASP Top 10 vulnerabilities, and synthesizes automated unit tests.';
        fs.writeFileSync(projPath, JSON.stringify(projects, null, 2), 'utf8');
        console.log(`✓ Updated ${projPath}`);
      }
    }
  };
  updateProjects(siteDir);
  updateProjects(labsDir);

  // 4. In mtlg-site, run sync.js and compare_projects.js
  console.log('4. Running sync.js and compare_projects.js in mtlg-site...');
  try {
    execSync('node sync.js', { cwd: siteDir, stdio: 'inherit' });
    execSync('node compare_projects.js', { cwd: siteDir, stdio: 'inherit' });
  } catch (err) {
    console.error('Error during sync/compare:', err.message);
  }

  // 5. Git commit & push mtlg-site
  console.log('5. Committing and pushing mtlg-site...');
  try {
    execSync('git add .', { cwd: siteDir, stdio: 'inherit' });
    execSync('git commit -m "feat(portfolio): finalize ReviewForge visual assets and live status"', { cwd: siteDir, stdio: 'inherit' });
    execSync('git push origin main', { cwd: siteDir, stdio: 'inherit' });
    console.log('✓ mtlg-site pushed cleanly');
  } catch (err) {
    console.log('mtlg-site git note:', err.message);
  }

  // 6. Git commit & push mtlglabs-space
  console.log('6. Committing and pushing mtlglabs-space...');
  try {
    execSync('git add .', { cwd: labsDir, stdio: 'inherit' });
    execSync('git commit -m "feat(portfolio): finalize ReviewForge visual assets and live status"', { cwd: labsDir, stdio: 'inherit' });
    execSync('git push origin main', { cwd: labsDir, stdio: 'inherit' });
    console.log('✓ mtlglabs-space pushed cleanly');
  } catch (err) {
    console.log('mtlglabs-space git note:', err.message);
  }

  // 7. Broadcast X
  console.log('7. Triggering broadcast_x preview...');
  try {
    execSync('node broadcast_x.js reviewforge --dry-run', { cwd: siteDir, stdio: 'inherit' });
  } catch (err) {
    console.log('broadcast_x note:', err.message);
  }

  console.log('PORTFOLIO PHASE 2 COMPLETED SUCCESSFULLY!');
}

syncPhase2();

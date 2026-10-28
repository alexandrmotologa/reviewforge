const fs = require('fs');
const path = require('path');
const { Resvg } = require('B:/workgit/node_modules/@resvg/resvg-js');

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <!-- Electric Cyan Optic and Vector Gradient -->
    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <!-- Radiant Forge Gold Accent for Raptor Hook Beak -->
    <linearGradient id="forge-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="60%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>

    <!-- Titanium Steel Beak Plates -->
    <linearGradient id="titanium-light" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>

    <linearGradient id="titanium-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>

    <!-- Volumetric Architectural Shadow -->
    <filter id="subtle-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="0.2" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- Massive Hexagonal Architectural Gateway Frame -->
      <polygon points="
        0,-410
        355,-205
        355,205
        0,410
        -355,205
        -355,-205
      " fill="none" stroke="#0f172a" stroke-width="36" stroke-linejoin="round" />

      <!-- Inner Precision Telemetry Ring -->
      <polygon points="
        0,-375
        324,-187
        324,187
        0,375
        -324,187
        -324,-187
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.45" stroke-dasharray="16, 12" />

      <!-- 100% Watertight Solid Falcon Silhouette Base (Zero-Leak Principle) -->
      <path d="
        M 0,-355
        L 85,-320 L 175,-275 L 230,-190 L 290,-90 L 320,40 L 285,175 L 295,270 L 205,335 L 105,370 L 0,385
        L -105,370 L -205,335 L -295,270 L -285,175 L -320,40 L -290,-90 L -230,-190 L -175,-275 L -85,-320
        Z
      " fill="#05080e" />

      <!-- ==================== CROWN & AERIAL CREST ==================== -->
      <!-- Center Crown Keel -->
      <polygon points="0,-355 -85,-320 0,-275" fill="#334155" />
      <polygon points="0,-355 85,-320 0,-275" fill="#1e293b" />

      <!-- Swept Crest Feathers -->
      <polygon points="-85,-320 -175,-275 -120,-225 0,-275" fill="#475569" />
      <polygon points="85,-320 175,-275 120,-225 0,-275" fill="#0f172a" />

      <!-- Upper Ear Crests -->
      <polygon points="-175,-275 -220,-305 -170,-190 -120,-225" fill="#334155" />
      <polygon points="175,-275 220,-305 170,-190 120,-225" fill="#1e293b" />

      <!-- ==================== PREDATORY FOREHEAD & BROW ==================== -->
      <!-- Center Forehead V-Keel -->
      <polygon points="0,-275 -65,-205 0,-155" fill="#475569" />
      <polygon points="0,-275 65,-205 0,-155" fill="#1e293b" />

      <!-- Heavy Overhanging Brow Shelves (Aggressive Scowl) -->
      <polygon points="0,-155 -65,-205 -150,-175 -50,-130" fill="#334155" />
      <polygon points="0,-155 65,-205 150,-175 50,-130" fill="#0f172a" />

      <!-- Lateral Temporal Plates -->
      <polygon points="-170,-190 -230,-190 -195,-105 -150,-175" fill="#1e293b" />
      <polygon points="170,-190 230,-190 195,-105 150,-175" fill="#0b0f19" />

      <polygon points="-230,-190 -290,-90 -230,-30 -195,-105" fill="#334155" />
      <polygon points="230,-190 290,-90 230,-30 195,-105" fill="#1e293b" />

      <!-- ==================== INTENSE RAPTOR OPTICS (EYES) ==================== -->
      <!-- Deep Recessed Eye Socket Cavity -->
      <polygon points="-50,-130 -150,-175 -135,-85 -45,-95" fill="#020408" />
      <polygon points="50,-130 150,-175 135,-85 45,-95" fill="#020408" />

      <!-- Electric Cyan Iris (Sharp Downward Predatory Cant) -->
      <polygon points="-58,-120 -138,-150 -125,-96 -52,-102" fill="url(#cyan-glow)" />
      <polygon points="58,-120 138,-150 125,-96 52,-102" fill="url(#cyan-glow)" />

      <!-- Vertical Slit Pupils -->
      <polygon points="-98,-135 -94,-134 -103,-104 -107,-105" fill="#04060a" />
      <polygon points="98,-135 94,-134 103,-104 107,-105" fill="#04060a" />

      <!-- Eye Specular Highlights -->
      <polygon points="-75,-128 -70,-127 -72,-122 -77,-123" fill="#ffffff" />
      <polygon points="75,-128 70,-127 72,-122 77,-123" fill="#ffffff" />

      <!-- ==================== BEAK BRIDGE (CERE) ==================== -->
      <!-- Upper Bridge of Beak -->
      <polygon points="0,-155 -50,-130 -42,-25 0,-45" fill="#64748b" />
      <polygon points="0,-155 50,-130 42,-25 0,-45" fill="#1e293b" />

      <!-- Side Mandible Joints -->
      <polygon points="-50,-130 -45,-95 -85,-15 -42,-25" fill="#334155" />
      <polygon points="50,-130 45,-95 85,-15 42,-25" fill="#0f172a" />

      <!-- ==================== PROUD HOOKED FORGE BEAK ==================== -->
      <!-- Upper Titanium Beak Armor -->
      <polygon points="0,-45 -42,-25 -38,75 0,115" fill="url(#titanium-light)" />
      <polygon points="0,-45 42,-25 38,75 0,115" fill="url(#titanium-dark)" />

      <!-- Lateral Cutting Edges -->
      <polygon points="-42,-25 -85,-15 -65,65 -38,75" fill="#475569" />
      <polygon points="42,-25 85,-15 65,65 38,75" fill="#1e293b" />

      <!-- Prominent Curved Talon Beak Hook (Forge Amber Gold) -->
      <polygon points="0,75 -38,75 -24,155 0,195" fill="url(#forge-gold)" />
      <polygon points="0,75 38,75 24,155 0,195" fill="#d97706" />

      <!-- Underside Beak Recess (Talon Return) -->
      <polygon points="0,195 -24,155 -12,130 0,135" fill="#92400e" />
      <polygon points="0,195 24,155 12,130 0,135" fill="#78350f" />

      <!-- ==================== AERODYNAMIC CHEEKS & MALAR FACETS ==================== -->
      <!-- Malar Feathers -->
      <polygon points="-195,-105 -135,-85 -165,15 -230,-30" fill="#1e293b" />
      <polygon points="195,-105 135,-85 165,15 230,-30" fill="#0b0f19" />

      <polygon points="-135,-85 -85,-15 -105,75 -165,15" fill="#0a0d16" />
      <polygon points="135,-85 85,-15 105,75 165,15" fill="#0a0d16" />

      <!-- Sweeping Flanges -->
      <polygon points="-290,-90 -320,40 -245,65 -230,-30" fill="#334155" />
      <polygon points="290,-90 320,40 245,65 230,-30" fill="#1e293b" />

      <polygon points="-320,40 -285,175 -215,160 -245,65" fill="#1e293b" />
      <polygon points="320,40 285,175 215,160 245,65" fill="#0f172a" />

      <!-- Sub-Beak Cheek Struts -->
      <polygon points="-245,65 -215,160 -135,145 -165,15" fill="#334155" />
      <polygon points="245,65 215,160 135,145 165,15" fill="#1e293b" />

      <polygon points="-165,15 -105,75 -65,65 -75,140 -135,145" fill="#1e293b" />
      <polygon points="165,15 105,75 65,65 75,140 135,145" fill="#0f172a" />

      <!-- ==================== GORGET & CHEST BREASTPLATE (DAG WING VECTORS) ==================== -->
      <!-- Chin Throat Armor -->
      <polygon points="0,135 -38,75 -75,140 0,185" fill="#1e293b" />
      <polygon points="0,135 38,75 75,140 0,185" fill="#0f172a" />

      <!-- Mid Gorget Diamond -->
      <polygon points="0,185 -75,140 -85,235 0,265" fill="#334155" />
      <polygon points="0,185 75,140 85,235 0,265" fill="#1e293b" />

      <!-- Central Breastplate V-Shield -->
      <polygon points="0,265 -85,235 -95,335 0,385" fill="#475569" />
      <polygon points="0,265 85,235 95,335 0,385" fill="#1e293b" />

      <!-- Outer Folded Wing Mantle (DAG Vectors) -->
      <polygon points="-285,175 -215,160 -145,225 -225,245" fill="#334155" />
      <polygon points="285,175 215,160 145,225 225,245" fill="#1e293b" />

      <polygon points="-215,160 -135,145 -75,140 -85,235 -145,225" fill="#1e293b" />
      <polygon points="215,160 135,145 75,140 85,235 145,225" fill="#0f172a" />

      <polygon points="-285,175 -295,270 -225,295 -225,245" fill="#1e293b" />
      <polygon points="285,175 295,270 225,295 225,245" fill="#0b0f19" />

      <!-- Wing Primary Flight Feathers (Angular Low-Poly Edge) -->
      <polygon points="-225,245 -145,225 -85,235 -155,305" fill="#475569" />
      <polygon points="225,245 145,225 85,235 155,305" fill="#1e293b" />

      <polygon points="-295,270 -205,335 -150,355 -155,305 -225,295" fill="#1e293b" />
      <polygon points="295,270 205,335 150,355 155,305 225,295" fill="#0f172a" />

      <!-- Lower Keel Plates -->
      <polygon points="-155,305 -85,235 -95,335 -150,355" fill="#334155" />
      <polygon points="155,305 85,235 95,335 150,355" fill="#1e293b" />

      <polygon points="-150,355 -95,335 0,385 -105,370" fill="#1e293b" />
      <polygon points="150,355 95,335 0,385 105,370" fill="#0b0f19" />

      <!-- ==================== PRECISION SEAM ACCENTS ==================== -->
      <line x1="0" y1="-355" x2="0" y2="-45" stroke="#00f5ff" stroke-width="2" opacity="0.45" />
      <line x1="-175" y1="-275" x2="-120" y2="-225" stroke="#00f5ff" stroke-width="1.5" opacity="0.4" />
      <line x1="175" y1="-275" x2="120" y2="-225" stroke="#00f5ff" stroke-width="1.5" opacity="0.4" />
      <line x1="0" y1="195" x2="0" y2="385" stroke="#00f5ff" stroke-width="2" opacity="0.45" />

    </g>
  </g>
</svg>`;
}

async function renderLogo() {
  const outputDir = path.resolve(__dirname, '../docs/images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svg = buildLogoSvg();
  const svgPath = path.join(outputDir, 'logo.svg');
  const pngPath = path.join(outputDir, 'logo.png');

  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('✓ Wrote refined logo.svg');

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 }
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  fs.writeFileSync(pngPath, pngBuffer);
  console.log('✓ Wrote refined logo.png at 1024x1024 (' + pngBuffer.length + ' bytes)');
}

renderLogo().catch(err => {
  console.error('Error rendering logo:', err);
  process.exit(1);
});

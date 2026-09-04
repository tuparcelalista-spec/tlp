const fs = require('fs');

// 1. Update parcela.html
let html = fs.readFileSync('frontend-v2/parcela.html', 'utf8');
const galleryRegex = /<!-- Bento Gallery -->[\s\S]*?<\/section>/;
const premiumGallery = `<!-- Bento Gallery Premium -->
    <section class="v3-gallery">
      <div class="v3-gallery-main">
        <img id="v3-img-1" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Vista principal">
      </div>
      <div class="v3-gallery-sub">
        <div><img id="v3-img-2" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Vista detalle 1"></div>
        <div class="v3-gallery-corner-tr"><img id="v3-img-3" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Vista detalle 2"></div>
        <div><img id="v3-img-4" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Vista detalle 3"></div>
        <div class="v3-gallery-corner-br"><img id="v3-img-5" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Vista detalle 4"></div>
      </div>
      <button class="v3-gallery-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        Mostrar todas las fotos
      </button>
    </section>`;
html = html.replace(galleryRegex, premiumGallery);
fs.writeFileSync('frontend-v2/parcela.html', html);

// 2. Update parcela.css
let css = fs.readFileSync('frontend-v2/css/parcela.css', 'utf8');
const cssRegex = /\/\* Bento Gallery \*\/[\s\S]*?\/\* Content Grid \*\//;
const premiumCss = `/* Premium Bento Gallery */
.v3-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  position: relative;
  margin-bottom: 40px;
  border-radius: 12px;
  height: 500px;
}
.v3-gallery-main {
  height: 100%;
  overflow: hidden;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  background: #e2e8f0;
}
.v3-gallery-sub {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  height: 100%;
}
.v3-gallery-sub div {
  overflow: hidden;
  background: #e2e8f0;
  position: relative;
}
.v3-gallery-corner-tr { border-top-right-radius: 12px; }
.v3-gallery-corner-br { border-bottom-right-radius: 12px; }

.v3-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease, filter 0.4s ease;
  filter: brightness(0.95);
  opacity: 0; /* Starts hidden for JS fade-in */
}
.v3-gallery img:hover {
  transform: scale(1.03);
  filter: brightness(1.05);
  cursor: pointer;
}
.v3-gallery-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: white;
  color: #222;
  border: 1px solid #222;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s;
  z-index: 10;
}
.v3-gallery-btn:hover {
  background: #f7f7f7;
  transform: scale(1.02);
}

/* Content Grid */`;
css = css.replace(cssRegex, premiumCss);

// Fix media query for gallery
const mqRegex = /\.v3-gallery {[\s\S]*?grid-template-columns: 1fr;[\s\S]*?height: auto;[\s\S]*?}[\s\S]*?\.v3-gallery-main {[\s\S]*?height: 300px;[\s\S]*?}[\s\S]*?\.v3-gallery-sub {[\s\S]*?display: none;[\s\S]*?}/;
const newMq = `.v3-gallery {
    grid-template-columns: 1fr;
    height: auto;
    border-radius: 0;
    margin-left: -16px;
    margin-right: -16px;
  }
  .v3-gallery-main {
    height: 300px;
    border-radius: 0;
  }
  .v3-gallery-sub {
    display: none;
  }`;
css = css.replace(mqRegex, newMq);
fs.writeFileSync('frontend-v2/css/parcela.css', css);

// 3. Update parcela.js
let js = fs.readFileSync('frontend-v2/js/parcela.js', 'utf8');
const jsRegex = /if \(\$\("v3-img-3"\) && images\.length > 2\) \{ \$\("v3-img-3"\)\.src = images\[2\]; \$\("v3-img-3"\)\.style\.opacity = "1"; \}/;
const newJs = `if ($("v3-img-3") && images.length > 2) { $("v3-img-3").src = images[2]; $("v3-img-3").style.opacity = "1"; }
        if ($("v3-img-4") && images.length > 3) { $("v3-img-4").src = images[3]; $("v3-img-4").style.opacity = "1"; }
        if ($("v3-img-5") && images.length > 4) { $("v3-img-5").src = images[4]; $("v3-img-5").style.opacity = "1"; }`;
js = js.replace(jsRegex, newJs);
fs.writeFileSync('frontend-v2/js/parcela.js', js);

console.log('Premium gallery injected');

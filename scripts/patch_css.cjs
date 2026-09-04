const fs = require('fs');
let css = fs.readFileSync('frontend-v2/css/index-premium.css', 'utf8');

const responsiveFix = `
/* --- COMPREHENSIVE RESPONSIVE FIXES PARA EL HERO --- */
@media (max-width: 1024px) {
  .tpl-hero-content {
    grid-template-columns: 1fr !important;
    gap: 30px !important;
    padding: 0 15px !important;
    width: 100% !important;
    box-sizing: border-box;
  }
  .tpl-hero-text {
    text-align: center !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    padding-left: 0 !important;
  }
  .tpl-hero-text h1 {
    font-size: clamp(2rem, 6vw, 3.5rem) !important;
    word-wrap: break-word;
  }
  .tpl-hero-text p {
    margin: 0 auto 20px !important;
    max-width: 600px !important;
  }
  .tpl-search-widget {
    width: 100% !important;
    max-width: 500px !important;
    margin: 0 auto !important;
    grid-column: auto !important;
    box-sizing: border-box !important;
  }
}

@media (max-width: 600px) {
  .tpl-hero-consolidated {
    padding-top: 100px !important;
    padding-bottom: 40px !important;
  }
  .tpl-search-widget {
    transform: none !important; /* Quitar el scale(0.92) que distorsionaba */
    padding: 20px !important;
  }
  .tpl-search-widget .combo-budget-quick {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 4px !important;
  }
  .tpl-search-widget .combo-budget-quick button {
    padding: 8px 0 !important;
    font-size: 0.75rem !important;
    min-width: 0 !important;
  }
  .combo-budget-input-wrap input {
    font-size: 0.85rem !important;
  }
  .tpl-eyebrow {
    font-size: 0.7rem !important;
    white-space: normal;
    text-align: center;
  }
}
`;

fs.writeFileSync('frontend-v2/css/index-premium.css', css + '\n' + responsiveFix, 'utf8');
console.log('CSS responsive overrides appended!');

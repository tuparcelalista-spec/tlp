import fs from 'fs';
import path from 'path';

const seoData = {
  'index.html': {
    title: 'Tu Parcela Lista | Innovación y Tecnología en Bienes Raíces Rurales',
    desc: 'Descubre parcelas y campos en Chile con tecnología de punta. TPL aporta conocimiento e innovación a la venta de terrenos para tu proyecto de vida rural.',
    keys: 'parcelas en chile, campos en chile, venta de parcelas, terrenos rurales, tecnología inmobiliaria, innovación en bienes raíces, tu parcela lista'
  },
  'plataforma/publicar/index.html': {
    title: 'Publica tu Parcela | Tasación Inteligente y Venta Rápida - TPL',
    desc: 'Vende tu terreno con el respaldo de la tecnología. En TPL usamos tasación inteligente e innovación digital para conectar tu propiedad rural con compradores serios.',
    keys: 'tasación inteligente, publicar parcela, vender terreno chile, innovación en venta de parcelas, tecnología inmobiliaria rural'
  },
  'informe-premium.html': {
    title: 'Tasación Inteligente de Parcelas | Algoritmo Predictivo TPL',
    desc: 'Conocimiento y tecnología al servicio de tu inversión. Obtén el valor real de campos en Chile mediante nuestro modelo matemático de tasación inteligente.',
    keys: 'tasación de parcelas, evaluar terreno, informe premium, algoritmo inmobiliario, tasación inteligente, valorización rural'
  },
  'plataforma/tpl-business-v2/index.html': {
    title: 'TPL Business | Tecnología y CRM para Inversiones Rurales',
    desc: 'La innovación definitiva en la venta de parcelas. Gestiona tus campos en Chile con nuestro CRM avanzado, informes de mercado y herramientas tecnológicas.',
    keys: 'crm inmobiliario, saas inmobiliario, software venta parcelas, gestión de terrenos, innovación inmobiliaria, red tpl'
  },
  'campo-chileno.html': {
    title: 'El Campo Chileno | Conocimiento Rural y Estilo de Vida - TPL',
    desc: 'Acércate al mundo rural de Chile. Guías prácticas, cultura agrícola y el conocimiento necesario para tomar la mejor decisión al adquirir campos y parcelas.',
    keys: 'campo chileno, vida rural chile, sur de chile, conocimiento rural, cultura agrícola, terrenos sureños'
  },
  'parcela.html': {
    title: 'Campo en Venta | Innovación Rural - Tu Parcela Lista',
    desc: 'Descubre esta propiedad rural en Chile. Explora precio, ubicación y atributos mediante la plataforma tecnológica de Tu Parcela Lista.',
    keys: 'parcela en venta, campo en venta chile, comprar terreno rural, innovación rural, tpl'
  },
  'proyecto.html': {
    title: 'Proyecto Inmobiliario | Innovación Rural - Tu Parcela Lista',
    desc: 'Explora este proyecto inmobiliario rural en Chile. Atributos, precios y diseño mediante la plataforma tecnológica de Tu Parcela Lista.',
    keys: 'proyecto inmobiliario rural, loteo chile, parcelación, innovación rural, tpl'
  },
  'red-partner-v2/index.html': {
    title: 'Red Partner TPL | Únete a la Innovación en Venta de Parcelas',
    desc: 'Integra la tecnología a tu negocio. Accede a tasación inteligente, CRM especializado y amplía tu cartera de clientes de campos en Chile con TPL.',
    keys: 'corredor de propiedades, red partner tpl, asociados inmobiliarios, innovación en ventas, tecnología para corredores'
  }
};

const baseDir = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2';

Object.entries(seoData).forEach(([file, data]) => {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the <head> section
    const headMatch = content.match(/<head>([\s\S]*?)<\/head>/i);
    if (!headMatch) return;
    
    let head = headMatch[1];
    
    // Remove existing title
    head = head.replace(/<title>[\s\S]*?<\/title>/gi, '');
    // Remove existing meta description
    head = head.replace(/<meta\s+name="description"[\s\S]*?>/gi, '');
    // Remove existing meta keywords
    head = head.replace(/<meta\s+name="keywords"[\s\S]*?>/gi, '');
    // Remove existing og:title and og:description
    head = head.replace(/<meta\s+property="og:(title|description|type)"[\s\S]*?>/gi, '');
    
    // Remove existing og:image and icon links
    head = head.replace(/<meta\s+property="og:image"[\s\S]*?>/gi, '');
    head = head.replace(/<link\s+rel="i?con"[\s\S]*?>/gi, '');
    
    // Build new tags
    const newTags = `
  <title>${data.title}</title>
  <meta name="description" content="${data.desc}">
  <meta name="keywords" content="${data.keys}">
  <meta property="og:title" content="${data.title}">
  <meta property="og:description" content="${data.desc}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://www.parcelalista.cl/image/logo_compartir.png">
  <link rel="icon" type="image/png" href="/image/favicon.png">
  <link rel="apple-touch-icon" href="/image/favicon-512.png">
`;
    
    // Insert new tags at the top of <head>
    head = newTags + head;
    
    // Replace head in content
    content = content.replace(/<head>[\s\S]*?<\/head>/i, '<head>' + head + '</head>');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated SEO for:', file);
  } else {
    console.warn('❌ File not found:', filePath);
  }
});

const fs = require('fs');
let code = fs.readFileSync('frontend-v2/js/index.js', 'utf8');

const regex = /const catalog = \(\) => \{[\s\S]*?fuenteDatos: 'supabase'\s*\};\s*\}/;

const fixedBlock = `const catalog = () => {
    try {
      const local = (typeof parcelas !== "undefined" && Array.isArray(parcelas)) ? parcelas.filter(Boolean) : [];
      if (!remoteCatalog.length) return local;
      const seen = new Set(remoteCatalog.map((item) => normalize(item.id || item.codigo)));
      return [...remoteCatalog, ...local.filter((item) => !seen.has(normalize(item.id || item.codigo)))];
    } catch { return remoteCatalog; }
  };

  function mapRemoteProperty(row) {
    const local = (() => {
      try {
        return ((typeof parcelas !== "undefined" && Array.isArray(parcelas)) ? parcelas : []).find((item) =>
          [item.id, item.codigo, item.slug, item.source_legacy_id]
            .some((value) => normalize(value) === normalize(row.codigo || row.id))
        ) || {};
      } catch { return {}; }
    })();
    const meta = (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) || {};
    const remoteImages = Array.isArray(meta.imagenes) ? meta.imagenes.filter(Boolean) : (Array.isArray(row.imagenes) ? row.imagenes.filter(Boolean) : []);
    const localImages = Array.isArray(local.imagenes) ? local.imagenes.filter(Boolean) : [];
    const imagenes = [...new Set([...remoteImages, row.imagen, ...localImages, local.imagen].filter(Boolean))];
    
    return {
      ...local,
      id: row.codigo || row.id,
      canonicalId: row.id,
      codigo: row.codigo || '',
      nombre: row.titulo || \`\${Number(row.superficie_m2)>=10000 ? 'Campo':'Parcela'} en \${row.comuna||'Chile'}\`,
      descripcion: row.descripcion || '', region: row.region || '', comuna: row.comuna || '', sector: row.sector || '',
      lat: row.lat, lng: row.lng, tamano: row.superficie_m2, superficie: row.superficie_m2,
      precio: row.precio_publicado ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(row.precio_publicado)) : 'Consultar', precioNumero: Number(row.precio_publicado)||0,
      rol: row.rol_situacion, electricidad: row.electricidad, luz: row.electricidad, agua: row.agua, acceso: row.acceso,
      topografia: row.topografia, suelo: row.suelo, exposicion: row.exposicion, vista_principal: row.vista_principal,
      vegetacion: row.vegetacion, cierre_perimetral: row.cierre_perimetral, porton: row.porton, condominio: row.condominio,
      atributos_naturales: row.atributos_naturales, casa_datos: row.casa_datos, diagnostico: row.diagnostico,
      destacada: row.destacada, oportunidad_tpl: row.oportunidad_tpl,
      imagenes,
      imagen: imagenes[0] || '',
      fuenteDatos: 'supabase'
    };
  }`;

code = code.replace(regex, fixedBlock);
fs.writeFileSync('frontend-v2/js/index.js', code);
console.log('Fixed index.js');

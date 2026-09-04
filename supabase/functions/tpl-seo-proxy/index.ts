import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

serve(async (req) => {
  const url = new URL(req.url);
  const propertyId = url.searchParams.get("id");

  // Si no hay ID o no es una peticion GET, pasar directamente
  if (!propertyId || req.method !== "GET") {
    return new Response("Missing ID", { status: 400 });
  }

  // 1. Fetch de los datos de la parcela desde Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: prop, error } = await supabase
    .from("tpl_propiedades_publicas_v1")
    .select("titulo, descripcion, precio, comuna, region, imagenes")
    .eq("codigo", propertyId)
    .single();

  if (error || !prop) {
    return new Response("Parcela no encontrada", { status: 404 });
  }

  // 2. Extraer datos para el proxy SEO
  const esc = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const titulo = esc(prop.titulo || `Parcela en ${prop.comuna || 'Chile'}`);
  const descripcion = esc(prop.descripcion ? prop.descripcion.substring(0, 150) + '...' : `Hermosa parcela disponible en ${prop.comuna || ''}, ${prop.region || ''}.${prop.precio ? ' ' + prop.precio + '.' : ''}`);
  const imagen = esc(prop.imagenes?.[0] || 'https://tuparcelalista.cl/default-og.jpg');
  const urlCanonica = esc(`https://tuparcelalista.cl/parcela.html?id=${propertyId}`);

  // 3. Obtener el HTML base estatico de parcela.html (ejemplo de fetch al bucket o dominio)
  // En produccion real se lee de la ruta raiz donde este alojado parcela.html
  let htmlBase = '<!DOCTYPE html><html><head><title>TPL</title></head><body></body></html>';
  try {
     const resHtml = await fetch('https://tuparcelalista.cl/parcela.html');
     if (resHtml.ok) htmlBase = await resHtml.text();
  } catch(e) { /* fallback local */ }

  // 4. Inyeccion de Meta Tags SSR (Server-Side Rendering) en el HEAD
  const metaTags = `
    <title>${titulo} | Tu Parcela Lista</title>
    <meta name="description" content="${descripcion}">
    <link rel="canonical" href="${urlCanonica}" />

    <!-- Open Graph (Facebook/WhatsApp) -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${urlCanonica}">
    <meta property="og:title" content="${titulo}">
    <meta property="og:description" content="${descripcion}">
    <meta property="og:image" content="${imagen}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${urlCanonica}">
    <meta name="twitter:title" content="${titulo}">
    <meta name="twitter:description" content="${descripcion}">
    <meta name="twitter:image" content="${imagen}">
  `;

  // Reemplazar o insertar antes del cierre del <head>
  const htmlInyectado = htmlBase.replace('</head>', metaTags + '</head>');

  // 5. Devolver al bot o usuario el HTML ya pre-renderizado con los metadatos puros
  return new Response(htmlInyectado, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

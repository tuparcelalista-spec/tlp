import { Resend } from 'resend';

const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error("❌ ERROR: Debes proporcionar tu API Key de Resend al ejecutar el comando.");
  console.log("Ejemplo: node scripts/test_resend.mjs re_123456789...");
  process.exit(1);
}

const resend = new Resend(API_KEY);

async function sendTestEmail() {
  try {
    console.log("⏳ Enviando correo de prueba a tuparcelalista@gmail.com...");
    const data = await resend.emails.send({
      from: 'Soporte TPL <soporte@parcelalista.cl>',
      to: ['tuparcelalista@gmail.com'],
      subject: '¡Bienvenido al Plan TPL Pro! (Prueba Local)',
      html: `<h1>¡Hola Propietario, gracias por mejorar tu plan!</h1>
             <p>Tu pago ha sido procesado exitosamente. Ahora tu cuenta tiene los privilegios del <strong>Plan TPL Pro</strong>.</p>
             <ul>
               <li>Puedes publicar hasta 50 propiedades.</li>
               <li>Generar Informes Premium ilimitados.</li>
               <li>Acceso a TPL Studio (pronto).</li>
             </ul>
             <p>Entra a <a href="https://www.parcelalista.cl/plataforma/tpl-business-v2/">TPL Business</a> para empezar a usar tus nuevos beneficios.</p>
             <br><br><small>El Equipo de Tu Parcela Lista</small>`
    });

    console.log("✅ ¡Correo enviado exitosamente!");
    console.log("Revisa la bandeja de entrada o la carpeta de Spam de tuparcelalista@gmail.com.");
    console.log("Detalles del servidor:", data);
  } catch (error) {
    console.error("❌ Hubo un error al enviar el correo:");
    console.error(error);
  }
}

sendTestEmail();

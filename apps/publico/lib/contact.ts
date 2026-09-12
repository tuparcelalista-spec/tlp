/**
 * P2-02 — Configuración centralizada de contacto por WhatsApp.
 *
 * Utiliza `NEXT_PUBLIC_WHATSAPP_PHONE` con fallback al número canónico
 * oficial de Tu Parcela Lista (formato E.164 sin "+", solo dígitos: 56988508361).
 */

export const DEFAULT_WHATSAPP_PHONE = "56988508361";

export function getWhatsAppPhone(): string {
  const envPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
  if (envPhone && envPhone.trim()) {
    const clean = envPhone.replace(/\D/g, "");
    if (clean.length >= 8) return clean;
  }
  return DEFAULT_WHATSAPP_PHONE;
}

export const WHATSAPP_PHONE = getWhatsAppPhone();

export function buildWhatsAppLink(message: string, phone: string = WHATSAPP_PHONE): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

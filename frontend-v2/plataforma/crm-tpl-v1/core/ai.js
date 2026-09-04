// core/ai.js
/**
 * AI helper for the CRM TPL v1.
 * Currently a lightweight stub that simulates a market analysis.
 * In production this could call Google Gemini or another LLM service.
 *
 * @param {object} targetParcel  - The parcel being analysed.
 * @param {Array<object>} similarParcels - Top similar market parcels.
 * @returns {Promise<string>} A textual market analysis.
 */
export async function generateMarketAnalysis(targetParcel, similarParcels) {
  try {
    const { getClient } = await import('./supabase.js');
    const client = getClient();
    const { data, error } = await client.functions.invoke('gemini-tasacion-summary', {
      body: {
        targetParcel,
        similarParcels
      }
    });

    if (error) throw error;
    return data.summaryHtml || "No se pudo generar el análisis.";
  } catch (err) {
    console.error("Error calling Gemini API:", err);
    throw err;
  }
}

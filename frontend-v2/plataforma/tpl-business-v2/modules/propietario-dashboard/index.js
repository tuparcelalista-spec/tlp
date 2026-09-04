import { store } from '../../core/store.js';

export function render() {
    // Attempt to get data from store, provide fallback for preview if store is empty or missing
    const data = store?.getState?.()?.propietario || {
        name: "Propietario",
        parcelStatus: "Active",
        tasacion: "$450,000",
        progress: 68
    };

    return `
        <div class="dashboard-container" style="padding: 2rem; max-width: 1200px; margin: 0 auto; font-family: var(--font-primary, system-ui, sans-serif); color: var(--color-text-main, #1f2937);">
            <header style="margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h1 style="margin: 0; font-size: 2rem; font-weight: 700; color: var(--color-text-dark, #111827);">Owner Dashboard</h1>
                    <p style="margin: 0.5rem 0 0; color: var(--color-text-muted, #6b7280);">Welcome back, ${data.name}. Here is an overview of your property.</p>
                </div>
                <button style="padding: 0.6rem 1.2rem; background: var(--color-background-alt, #f3f4f6); border: 1px solid var(--color-border, #d1d5db); border-radius: var(--radius-md, 6px); cursor: pointer; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='var(--color-border, #e5e7eb)'" onmouseout="this.style.background='var(--color-background-alt, #f3f4f6)'">Download Report</button>
            </header>

            <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                
                <!-- Parcel Status Card -->
                <div class="stat-card" style="background: white; border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-lg, 12px); padding: 1.5rem; box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));">
                    <h3 style="margin: 0 0 1rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted, #6b7280);">Parcel Status</h3>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: var(--color-success, #10b981);"></span>
                        <span style="font-size: 1.5rem; font-weight: 600;">${data.parcelStatus}</span>
                    </div>
                    <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--color-text-muted, #6b7280);">All legal and technical requirements met.</p>
                </div>

                <!-- Valuation Card -->
                <div class="stat-card" style="background: white; border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-lg, 12px); padding: 1.5rem; box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));">
                    <h3 style="margin: 0 0 1rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted, #6b7280);">Current Valuation (Tasación)</h3>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--color-primary-dark, #1d4ed8);">${data.tasacion}</div>
                    <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--color-success, #10b981); display: flex; align-items: center; gap: 0.25rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        +5.2% from last year
                    </p>
                </div>
            </div>

            <!-- Project Execution Progress -->
            <div class="progress-section" style="background: white; border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-lg, 12px); padding: 2rem; box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; font-size: 1.25rem; font-weight: 600;">Project Execution Progress</h2>
                    <span style="font-size: 1.25rem; font-weight: 700; color: var(--color-primary, #2563eb);">${data.progress}%</span>
                </div>
                
                <div class="progress-bar-bg" style="width: 100%; height: 12px; background-color: var(--color-background-alt, #f3f4f6); border-radius: 999px; overflow: hidden; margin-bottom: 1rem;">
                    <div class="progress-bar-fill" style="width: ${data.progress}%; height: 100%; background: linear-gradient(90deg, var(--color-primary, #3b82f6) 0%, var(--color-primary-dark, #1d4ed8) 100%); border-radius: 999px; transition: width 1s ease-in-out;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--color-text-muted, #6b7280);">
                    <span>Phase 1: Planning</span>
                    <span>Phase 2: Construction</span>
                    <span>Phase 3: Completion</span>
                </div>
            </div>
        </div>
    `;
}

export function init() {
    // Add any necessary interactive logic or store subscriptions here
    console.log("Propietario Dashboard initialized.");
}

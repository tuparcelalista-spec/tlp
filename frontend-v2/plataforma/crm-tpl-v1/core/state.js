// state.js
// Centralized state manager with a simple publish/subscribe pattern

const state = {
    // Existing core fields
    snapshot: {},
    command: {},
    uf: 0,
    currentView: '',
    
    // Extracted from legacy app.js
    mode: "normal", // normal | parcela | combo
    viewMode: "grid", // grid | map
    budget: 0,
    wantedRooms: "all",
    wantedMeters: 0,
    searchPreference: "economic",
    familyProfile: "couple",
    recommendationActive: false,
    homeGridLimit: 40,
    selectedParcela: null,
    selectedCasa: null,
    selectedFundacion: null,
    installationService: false,
    userCoords: null,
    selectedExtras: new Map(),
    roomFilter: "all",
    projectChangeMode: localStorage.getItem("tplReturnToCotizador") || "",
    houseImageIndices: new Map(),
    filters: {
        text: "",
        gps: false,
        economic: false,
        size: false,
        water: false,
        river: false,
        native: false,
        payment: false,
        commune: "all"
    }
};

const listeners = [];

/**
 * Subscribe to state changes
 * @param {Function} listener Callback function when state changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
}

/**
 * Update the state and notify listeners
 * @param {Object} partialState Object containing the state keys to update
 */
export function setState(partialState) {
    Object.assign(state, partialState);
    listeners.forEach(listener => listener(state));
}

/**
 * Update a specific filter and notify listeners
 * @param {String} key The filter key
 * @param {any} value The filter value
 */
export function setFilter(key, value) {
    state.filters[key] = value;
    listeners.forEach(listener => listener(state));
}

export function arr(key) {
    if (!state.snapshot || !state.snapshot[key]) return [];
    return Array.isArray(state.snapshot[key]) ? state.snapshot[key] : [];
}

export default state;

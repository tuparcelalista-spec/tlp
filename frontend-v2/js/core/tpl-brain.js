(function (window) {
  'use strict';

  const KEYS = Object.freeze({
    actors: 'tpl_core_actors_v1',
    properties: 'tpl_core_properties_v1',
    projects: 'tpl_core_projects_v1',
    needs: 'tpl_core_needs_v1',
    agreements: 'tpl_core_agreements_v1',
    services: 'tpl_core_services_v1',
    studio: 'tpl_studio_profiles_v1',
    approvals: 'tpl_studio_approvals_v1',
    events: 'tpl_core_events_v1'
  });

  const now = () => new Date().toISOString();
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const read = key => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (_) { return []; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function seed() {
    if (!read(KEYS.actors).length) {
      write(KEYS.actors, [
        { id: 'actor-owner-demo', name: 'María González', kind: 'persona', roles: ['propietario'], commune: 'Quillón', region: 'Ñuble', workMode: 'autogestion', services: ['publicacion', 'estadisticas'], email: 'maria@example.cl' },
        { id: 'actor-partner-demo', name: 'Construcciones del Sur', kind: 'empresa', roles: ['partner'], commune: 'Concepción', region: 'Biobío', workMode: 'autogestion', services: ['red_partner', 'studio_mark_ii'], email: 'contacto@construccionesdelsur.cl' },
        { id: 'actor-buyer-demo', name: 'Ana Muñoz', kind: 'persona', roles: ['comprador'], commune: 'Concepción', region: 'Biobío', services: ['proyecto_tpl'], email: 'ana@example.cl' }
      ]);
    }
    if (!read(KEYS.properties).length) {
      write(KEYS.properties, [{ id: 'property-demo', ownerId: 'actor-owner-demo', name: 'Parcela Los Aromos', commune: 'Quillón', surface: 5000, price: 22000000, status: 'publicada', managementMode: 'autogestion', truthScore: 78 }]);
    }
    if (!read(KEYS.projects).length) {
      write(KEYS.projects, [{ id: 'TPL-DEMO-001', propertyId: 'property-demo', buyerId: 'actor-buyer-demo', ownerId: 'actor-owner-demo', phase: 3, status: 'negociacion', objective: 'Comprar parcela y preparar proyecto familiar' }]);
    }
    if (!read(KEYS.needs).length) {
      write(KEYS.needs, [
        { id: 'need-fence-demo', projectId: 'TPL-DEMO-001', propertyId: 'property-demo', type: 'cerco', title: 'Construcción de cerco perimetral', status: 'detectada', source: 'publicador', details: { meters: 240, terrain: 'semiplano' } },
        { id: 'need-water-demo', projectId: 'TPL-DEMO-001', propertyId: 'property-demo', type: 'agua', title: 'Solución de agua por confirmar', status: 'por_verificar', source: 'diagnostico' }
      ]);
    }
  }

  function emit(type, payload) {
    const events = read(KEYS.events);
    events.unshift({ id: uid('evt'), type, payload, createdAt: now() });
    write(KEYS.events, events.slice(0, 500));
    window.dispatchEvent(new CustomEvent('tpl:brain', { detail: { type, payload } }));
  }

  function add(collection, data, prefix) {
    const items = read(KEYS[collection]);
    const record = { id: data.id || uid(prefix), ...data, createdAt: data.createdAt || now(), updatedAt: now() };
    items.unshift(record);
    write(KEYS[collection], items);
    emit(`${collection}.created`, record);
    return record;
  }

  function update(collection, id, patch) {
    const items = read(KEYS[collection]);
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return null;
    items[index] = { ...items[index], ...patch, updatedAt: now() };
    write(KEYS[collection], items);
    emit(`${collection}.updated`, items[index]);
    return items[index];
  }

  function createApproval(data) {
    return add('approvals', { status: 'pendiente', ...data }, 'approval');
  }

  function projectContext(projectId) {
    const project = read(KEYS.projects).find(item => item.id === projectId);
    if (!project) return null;
    const property = read(KEYS.properties).find(item => item.id === project.propertyId);
    const actors = read(KEYS.actors);
    return {
      project,
      property,
      buyer: actors.find(item => item.id === project.buyerId),
      owner: actors.find(item => item.id === project.ownerId),
      needs: read(KEYS.needs).filter(item => item.projectId === projectId),
      agreements: read(KEYS.agreements).filter(item => item.projectId === projectId)
    };
  }

  function recommendPartner(need) {
    const partners = read(KEYS.actors).filter(actor => actor.roles?.includes('partner'));
    return partners
      .map(actor => ({ ...actor, score: (actor.services || []).some(service => service.includes(need.type)) ? 95 : 65 }))
      .sort((a, b) => b.score - a.score);
  }

  seed();
  window.TPLBrain = Object.freeze({
    KEYS,
    read: collection => read(KEYS[collection]),
    addActor: data => add('actors', data, 'actor'),
    addProperty: data => add('properties', data, 'property'),
    addProject: data => add('projects', data, 'project'),
    addNeed: data => add('needs', data, 'need'),
    addAgreement: data => add('agreements', data, 'agreement'),
    addStudioProfile: data => add('studio', data, 'studio'),
    createApproval,
    update,
    projectContext,
    recommendPartner,
    emit
  });
})(window);

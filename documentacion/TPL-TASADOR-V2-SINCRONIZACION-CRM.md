# TPL Tasador V2 - Sincronización CRM

## Validación de Sincronización
La arquitectura del CRM extrae la información a través de las funciones `getLatestCrmValuation()` y `getValuationSummary()`. No existe una refactorización de estas funciones, dado que han sido probadas y validadas para extraer el historial descendentemente.

## Verificación de Vigencia y Versión

Se ha desarrollado un script para validar automáticamente todas las parcelas con tasaciones e informar discrepancias donde el CRM pudiera estar leyendo versiones desactualizadas o usando campos blend antiguos.

### Instrucciones:
```bash
node scripts/verificar-sincronizacion-crm.mjs
```

### Criterios Validados por el Script:
- Verifica que cada propiedad en `tpl_propiedades` tenga como última tasación vigente un registro con `version_motor = tpl-land-engine-v2.3-unified`.
- Confirma que `resultado.valorFinal` esté poblado (es la única métrica final).
- Se audita que `marketBlend.marketWeight = 0`, garantizando que no existe blend comunal activo inyectado durante las llamadas a DB.
- Verifica que *Tasador = Worker = DB = CRM* (el resultado unificado es equivalente en toda la cadena de lectura).

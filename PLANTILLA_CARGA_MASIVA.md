# Plantilla de Carga Masiva de Ventas

## Formato del Archivo Excel

El archivo debe contener las siguientes columnas (en este orden exacto):

| Nombre de afiliado | CUIL | Teléfono | Tipo de venta | Obra social anterior | Obra social vendida | Fecha | Supervisor | Asesor | Validador | Datos extra |
|-------------------|------|----------|---------------|---------------------|-------------------|-------|------------|-------------------|-------------------|-------------|
| Juan Pérez | 20123456789 | 1123456789 | alta | OSDE | Binimed | 2024-01-15 | Facundo Tevez | Milagros Santucho | Facundo Tevez | Afiliado con familiares |

## Descripción de Columnas

### Campos Obligatorios

1. **Nombre de afiliado**: Nombre completo del afiliado
2. **CUIL**: Exactamente 11 dígitos numéricos
3. **Teléfono**: 10 dígitos numéricos (sin guiones ni espacios)
4. **Tipo de venta**: "alta" o "cambio"
5. **Obra social anterior**: Nombre de la obra social anterior
6. **Obra social vendida**: "Binimed", "Meplife" o "TURF"
7. **Fecha**: Formato YYYY-MM-DD (ej: 2024-01-15)
8. **Asesor**: Nombre completo del asesor (debe coincidir exactamente con el nombre en el sistema)
9. **Validador**: Nombre completo del validador (debe coincidir exactamente con el nombre en el sistema)

### Campos Opcionales

10. **Supervisor**: Nombre completo del supervisor (solo para Gerencia/Auditor)
11. **Datos extra**: Información adicional sobre la venta

## Notas Importantes

- **Nombres de Usuario**: Los campos Asesor, Validador y Supervisor deben contener los **nombres completos** de los usuarios tal como aparecen en el sistema. La búsqueda NO distingue entre mayúsculas y minúsculas.
- **Validación de Duplicados**: El sistema rechazará automáticamente filas donde el CUIL Y el teléfono ya estén registrados juntos.
- **Asignación de Turnos**: El sistema asignará automáticamente el primer turno disponible para la fecha especificada.
- **Reporte de Rechazos**: Si hay filas rechazadas, se descargará automáticamente un archivo Excel con los detalles.

## Nombres de Columnas Alternativos

El sistema acepta variaciones en los nombres de columnas:

- **Nombre de afiliado**: También acepta "Nombre" o "nombre"
- **Teléfono**: También acepta "Telefono" o "telefono"
- **Tipo de venta**: También acepta "Tipo" o "tipo"
- **Obra social anterior**: También acepta "OS Anterior" o "obraSocialAnterior"
- **Obra social vendida**: También acepta "OS Vendida" o "obraSocialVendida"
- **Fecha**: También acepta "fecha"
- **Supervisor**: También acepta "supervisor"
- **Asesor**: También acepta "asesor"
- **Validador**: También acepta "validador"
- **Datos extra**: También acepta "datosExtra"

## Ejemplo de Uso

1. Descarga esta plantilla y completa los datos
2. Guarda el archivo como .xlsx o .csv
3. En la página "Pautar auditoría / Venta", haz clic en el botón "📤 Carga Masiva"
4. Selecciona tu archivo
5. Espera a que se procese
6. Si hay rechazos, revisa el archivo de reporte descargado automáticamente

# 📊 IMPORTAR ACTIVOS DESDE EXCEL - Guía Completa

## 🎯 ¿Cómo hacer?

### 1. **Preparar tu archivo Excel**

#### Opción A: Crear desde cero

Abre Excel/Google Sheets y crea una tabla con estas columnas:

```
┌─────────┬────────┬──────────┬────────┬─────┬───────────┬──────────────┐
│ ficha   │ marca  │ modelo   │ tipo   │ año │ chasis    │ ubicacion... │
├─────────┼────────┼──────────┼────────┼─────┼───────────┼──────────────┤
│ VEH001  │ Toyota │ Hilux    │ Camión │2020 │ABC123XYZ  │ Taller       │
│ VEH002  │ Ford   │ Transit  │ Furgon │2019 │DEF456UVW  │ Garaje       │
│ VEH003  │ Hummer │ H2       │ SUV    │2018 │GHI789RST  │ Almacén      │
│ VEH004  │ Iveco  │ Daily    │ Furgon │2021 │JKL012MNO  │ Taller       │
└─────────┴────────┴──────────┴────────┴─────┴───────────┴──────────────┘
```

#### Columnas OBLIGATORIAS:
- **ficha** - Identificador único (ej: VEH001, #001)
- **marca** - Marca del vehículo (Toyota, Ford, etc.)
- **modelo** - Modelo (Hilux, Transit, etc.)
- **tipo** - Tipo (Camión, SUV, Furgón, etc.)

#### Columnas OPCIONALES:
```
año              → Año del vehículo (número)
chasis           → Número de chasis
placa            → Placa/matrícula
color            → Color
ubicacion_actual → Dónde está guardado
estado           → Estado general
fecha_compra     → Fecha de compra (YYYY-MM-DD)
valor_unitario   → Valor en dinero
observacion      → Notas/comentarios
```

### 2. **Guardar el archivo**

**Opción 1: Excel**
```
File → Save As
Tipo: Excel Workbook (.xlsx)
Nombre: mis_activos.xlsx
```

**Opción 2: CSV (más compatible)**
```
File → Save As
Tipo: CSV (Comma delimited) (.csv)
Nombre: mis_activos.csv
```

**Opción 3: Google Sheets**
```
File → Download
Selecciona: "Microsoft Excel (.xlsx)"
o "Comma-separated values (.csv)"
```

### 3. **Ir a la app y importar**

1. **Login** en la app
2. **Sidebar → Administrador** (solo ADMIN puede)
3. Botón verde **"Importar Activos desde Excel/CSV"**
4. Haz clic en el área o arrastra tu archivo
5. Revisa la vista previa
6. Botón **"Importar X Activos"**

---

## 📋 Ejemplo Completo

### Tu archivo Excel:
```
ficha   | marca  | modelo    | tipo      | año  | chasis      | ubicacion_actual
--------|--------|-----------|-----------|------|-------------|------------------
VEH001  | Toyota | Hilux     | Camión    | 2020 | ABC123XYZ   | Taller Principal
VEH002  | Ford   | Transit   | Furgón    | 2019 | DEF456UVW   | Almacén Este
VEH003  | Hummer | H2        | SUV       | 2018 | GHI789RST   | Garaje Anexo
VEH004  | Iveco  | Daily     | Furgón    | 2021 | JKL012MNO   | Taller Principal
VEH005  | Volvo  | FM        | Camión    | 2017 | MNO345PQR   | Almacén Este
```

### Lo que pasa en la app:
```
1. Subes el archivo
   ↓
2. App valida los datos
   ↓
   ✓ ficha: VEH001 → Válido
   ✓ marca: Toyota → Válido
   ✓ modelo: Hilux → Válido
   ✓ tipo: Camión → Válido
   (Opcional: año, chasis, ubicación → Válido)
   ↓
3. Muestra vista previa (primeros 5)
   ↓
4. Haces clic en "Importar 5 Activos"
   ↓
5. Barra de progreso
   ↓
6. ✅ "5 activos importados exitosamente"
```

### Resultado en la app:
Ahora verás en tu inventario:
- VEH001 - Toyota Hilux (Camión) 2020
- VEH002 - Ford Transit (Furgón) 2019
- VEH003 - Hummer H2 (SUV) 2018
- VEH004 - Iveco Daily (Furgón) 2021
- VEH005 - Volvo FM (Camión) 2017

---

## ✅ Validaciones

La app verifica automáticamente:

### ❌ Rechaza si:
```
• Falta el campo "ficha"
• Falta el campo "marca"
• Falta el campo "modelo"
• Falta el campo "tipo"
• La ficha contiene caracteres inválidos
• El año no es un número
• El valor unitario no es un número
```

### ✅ Acepta:
```
• Campos opcionales en blanco
• Espacios en blanco (se limpian)
• Mayúsculas/minúsculas (se normalizan)
• Fechas en formato YYYY-MM-DD
• Números con decimales
```

---

## 🎨 Formatos de Ejemplo

### CSV (si lo haces manual):
```csv
ficha,marca,modelo,tipo,año,chasis,ubicacion_actual
VEH001,Toyota,Hilux,Camión,2020,ABC123XYZ,Taller
VEH002,Ford,Transit,Furgón,2019,DEF456UVW,Garaje
```

### Excel (estructura visual):
```
A          B      C          D        E    F           G
ficha      marca  modelo     tipo     año  chasis      ubicacion
────────────────────────────────────────────────────────────────
VEH001     Toyota Hilux      Camión   2020 ABC123XYZ   Taller
VEH002     Ford   Transit    Furgón   2019 DEF456UVW   Garaje
```

---

## 🚀 Tips Importantes

1. **Sin encabezados dobles**
   ```
   ❌ Malo:
   ficha | marca
   ficha | marca   ← Línea repetida
   VEH001| Toyota

   ✅ Bueno:
   ficha | marca
   VEH001| Toyota
   ```

2. **Sin espacios innecesarios**
   ```
   ❌ " VEH001 " → Se limpia a "VEH001"
   ✅ "VEH001" → Bien
   ```

3. **Mayúsculas en ficha**
   ```
   ✅ VEH001 (recomendado)
   ✓ veh001 (se normaliza a VEH001)
   ```

4. **Archivo con muchos activos**
   ```
   Si tienes +1000 activos:
   • La app los importa en lotes de 50
   • Ve la barra de progreso
   • No cierres la ventana durante la importación
   ```

5. **Errores comunes**
   ```
   ❌ Caracteres especiales en ficha: "VEH-001@" → Rechazado
   ✅ Guiones están OK: "VEH-001" → Aceptado
   
   ❌ Año inválido: "2020a" → Rechazado
   ✅ Año válido: "2020" → Aceptado
   ```

---

## 📱 Desde Móvil

También puedes hacer upload desde móvil:
1. Guarda el Excel como CSV
2. Abre la app desde Chrome/Safari
3. Administrador → Importar
4. Toca el área de upload
5. Selecciona el archivo desde tu gestor de archivos

---

## 🔍 Troubleshooting

### "Se encontraron X errores"
```
Significa que algunas filas tienen problemas.
Revisa:
- ¿Faltan datos obligatorios (ficha, marca, modelo, tipo)?
- ¿Hay caracteres especiales?
- ¿Los años y precios son números?
```

### "El archivo no carga"
```
Intenta:
- Verificar que sea CSV o Excel (.xlsx)
- No tener el archivo abierto en Excel
- Guardar como UTF-8 si es CSV
```

### "Importó pero falta información"
```
Probable: Los campos opcionales estaban vacíos.
Si necesitabas esa información:
- Vuelve a descargar el archivo
- Completa los campos
- Importa de nuevo
```

---

## 💡 Consejos para mejor resultado

```
1. Antes de importar:
   ✓ Revisa los datos en Excel
   ✓ Verifica no haya duplicados
   ✓ Completa campos obligatorios

2. Durante la importación:
   ✓ No cierres la ventana
   ✓ Mantén conexión a internet
   ✓ Revisa la vista previa

3. Después de importar:
   ✓ Verifica en "Inventario"
   ✓ Si falta info, edita manualmente
   ✓ Revisa el panel de administrador
```

---

## 📞 ¿Necesitas ayuda?

Si algo no funciona:
1. Revisa que tu archivo tenga las 4 columnas mínimas
2. Verifica no haya caracteres extraños
3. Prueba con un solo activo primero
4. Si persiste, contacta soporte

---

**¡Listo para cargar todos tus activos!** 🎉

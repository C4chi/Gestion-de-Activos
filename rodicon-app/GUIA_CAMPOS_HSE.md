# 📚 TIPOS DE CAMPOS HSE - Guía Visual

## ☑️ CHECKBOX (Casilla de Verificación)

```
¿Para qué sirve?
 • Preguntas SÍ/NO
 • Confirmaciones
 • Checklists
 • Auditorías

Visual:
┌─────────────────────────┐
│ ☑ ¿Se usan cascos?      │ ← Marcado/Sin marcar
└─────────────────────────┘

Ejemplo en Inspección:
- ☑ ¿Equipos certificados?
- ☑ ¿Area limpia?
- ☑ ¿Señalización presente?

Scoring:
Si se marca = +10 puntos (configurable)
Si no se marca = 0 puntos
```

---

## 🔘 SINGLE SELECT (Opción Única - Botones)

```
¿Para qué sirve?
 • Seleccionar UNA opción de varias
 • Escala de cumplimiento
 • Validaciones rápidas
 • Estados/Niveles

Visual:
┌──────────────────────────────┐
│ 🟢 Conforme          Botón   │
│ 🟡 Necesita Mejora   Botón   │
│ 🔴 No Conforme       Botón   │
└──────────────────────────────┘

Ejemplo en Inspección:
├─ Estado de señalización
│  └─ [🟢 Conforme] [🟡 Parcial] [🔴 Incumple]
├─ Limpieza del área
│  └─ [🟢 Excelente] [🟡 Bueno] [🔴 Malo]
└─ Equipamiento
   └─ [🟢 OK] [🟡 Requiere] [🔴 Falta]

Scoring:
Cada opción puede tener puntos diferentes:
- 🟢 Conforme = 10 pts
- 🟡 Necesita mejora = 5 pts
- 🔴 No conforme = 0 pts

FOLLOW-UP:
Si seleccionas "No conforme" → Pide:
  📸 Foto (evidencia)
  📝 Nota (descripción)
```

---

## 📝 TEXT (Texto Corto)

```
¿Para qué sirve?
 • Nombres
 • Números de serie
 • Códigos
 • Respuestas cortas

Visual:
┌────────────────────────────┐
│ Inspector: [Juan Perez   ] │
└────────────────────────────┘

Validación (opcional):
✓ Mínimo de caracteres
✓ Máximo de caracteres
✓ Patrón (ej: solo números)

Ejemplo:
- Inspector: _____________
- Número de serie: _____________
```

---

## 📄 TEXTAREA (Texto Largo)

```
¿Para qué sirve?
 • Observaciones
 • Comentarios detallados
 • Descripciones de problemas
 • Recomendaciones

Visual:
┌─────────────────────────────────┐
│ Observaciones generales:        │
│ ┌───────────────────────────────┐│
│ │                               ││ ← Área grande
│ │ Se encontraron 3 tuberías...  ││    para escribir
│ │                               ││
│ └───────────────────────────────┘│
└─────────────────────────────────┘

Ejemplo:
- Problemas encontrados: ____________
- Acciones correctivas: _____________
```

---

## 🔢 NUMBER (Número)

```
¿Para qué sirve?
 • Cantidades
 • Medidas
 • Valores numéricos
 • Conteos

Visual:
┌─────────────────────┐
│ Caídas este mes: [3] │
└─────────────────────┘

Validación:
✓ Valor mínimo
✓ Valor máximo
✓ Decimales (sí/no)

Ejemplo:
- Temperatura (°C): _________
- Caídas este mes: _________
- Equipos revisados: _________
```

---

## 🎯 SELECT (Menú Desplegable)

```
¿Para qué sirve?
 • Lista larga de opciones
 • Selección única
 • Categorías
 • Departamentos

Visual:
┌──────────────────────────┐
│ Departamento: ▼          │
│ ├─ Taller                │
│ ├─ Almacén               │
│ ├─ Oficina               │
│ └─ Transporte            │
└──────────────────────────┘

Diferencia con Single Select:
- SELECT → Menú desplegable (ahorra espacio)
- SINGLE SELECT → Botones visibles (mejor UX)
```

---

## 🚙 ASSET (Seleccionar Activo)

```
¿Para qué sirve?
 • Asociar inspección a un vehículo/equipo
 • Carga activos disponibles automáticamente
 • Vincula datos del activo

Visual:
┌──────────────────────────────┐
│ Vehículo: ▼                  │
│ ├─ #001 - Toyota 2015        │
│ ├─ #002 - Hummer 2018        │
│ ├─ #003 - Iveco 2020         │
│ └─ #004 - Ford 2019          │
└──────────────────────────────┘

Datos capturados:
- ID del activo
- Ficha
- Marca y modelo
- Status actual

Ejemplo:
Selecciona: #002 - Hummer 2018
└─ Vincula toda la inspección a este vehículo
```

---

## 📍 LOCATION (Ubicación)

```
¿Para qué sirve?
 • Ubicación dónde se hizo la inspección
 • Se carga desde ubicaciones de activos
 • Geolocalización de inspecciones

Visual:
┌──────────────────────────┐
│ Ubicación: ▼             │
│ ├─ Taller Principal       │
│ ├─ Almacén Este           │
│ ├─ Oficina Central        │
│ └─ Garaje Anexo           │
└──────────────────────────┘

Vinculación automática:
Si selecciona Asset → Sugiere ubicación del activo
```

---

## 🖊️ SIGNATURE (Firma)

```
¿Para qué sirve?
 • Capturar firma del inspector
 • Prueba de conformidad
 • Responsabilidad

Visual:
┌────────────────────────────┐
│ Firma del Inspector:       │
│ ┌──────────────────────────┐│
│ │  ┌─────────────────────┐ ││
│ │  │ Juan [firma]    │ ││ ← Dibuja o escribe
│ │  │                 │ ││
│ │  └─────────────────────┘ ││
│ │  [Limpiar] [Guardar]     ││
│ └──────────────────────────┘│
└────────────────────────────┘

Opciones:
✓ Dibujar firma
✓ Escribir nombre (texto)
```

---

## 📸 PHOTO (Fotografía)

```
¿Para qué sirve?
 • Capturar evidencias
 • Documentar problemas
 • Fotografía de cumplimiento

Visual:
┌─────────────────────────┐
│ Fotografía:             │
│ ┌───────────────────────┐│
│ │    📷 Abre cámara    ││
│ │   (selecciona foto)   ││
│ └───────────────────────┘│
│ [Capturar] [Galería]   │
└─────────────────────────┘

Almacenamiento:
✓ Se convierte en base64
✓ Se guarda en la inspección
✓ Aparece en el PDF

Ejemplo de uso:
- Foto de incumplimiento
- Foto de área limpia (cumplimiento)
- Foto de equipo dañado
```

---

## 🌊 CAMPOS CONDICIONALES (Follow-up)

```
¿Qué son?

Campos que aparecen SOLO si se selecciona
una opción específica.

Ejemplo:

┌────────────────────────────────┐
│ ¿Hay problemas de seguridad?   │
│ [SÍ] [NO]                      │
└────────────────────────────────┘
       ↓ Si selecciona SÍ
┌────────────────────────────────┐
│ ⚡ Campos requeridos:          │
│                                │
│ 📸 Adjuntar foto de evidencia  │
│ 📝 Describir el problema       │
│ ⚙️ Acciones correctivas        │
└────────────────────────────────┘

Tipos de Follow-up:
1. requirePhoto = Pide una foto
2. requireNote = Pide comentario
3. requireField = Campo adicional

Configuración:
En el Template Builder:
- Selecciona opción
- Marca "Requiere foto/nota"
- Define el label

Flujo:
Usuario selecciona opción → Campos follow-up aparecen
                         → Debe llenar para continuar
                         → Se guardan como parte de la respuesta
```

---

## 📊 SCORING (Puntuación)

```
Sistema automático de calificación

Configuración en Template:
✓ Habilitado: SÍ/NO
✓ Escala: 0-100
✓ Mínimo requerido: 70%

Cálculo:
Cada opción tiene puntos → Se suman al final
→ Se calcula porcentaje
→ Se compara con mínimo
→ PASÓ o NO PASÓ

Ejemplo:

Template "Inspección Seguridad"
- Mínimo requerido: 70%

Pregunta 1: ¿Cascos? (10 pts)
 [✓] Sí = 10 pts

Pregunta 2: ¿Guantes? (10 pts)
 [🟡] Parcial = 5 pts

Pregunta 3: ¿Cinturones? (10 pts)
 [✗] No = 0 pts

Total: 15 pts de 30 = 50%
Resultado: ❌ NO PASÓ (Requiere 70%)
```

---

## 🎓 Flujo Completo de Inspección

```
1. ADMIN/HSE Crea Template
   ├─ Nombre: "Inspección Seguridad Taller"
   ├─ Secciones: 3
   └─ Scoring: Habilitado (70% mínimo)

2. Define Secciones y Campos
   Sección 1: DATOS INICIALES
   ├─ Asset (obligatorio) - SINGLE SELECT
   ├─ Ubicación (obligatorio) - LOCATION
   └─ Inspector - TEXT

   Sección 2: INSPECCIÓN
   ├─ ¿Se usan cascos? - CHECKBOX (10 pts)
   ├─ Estado EPE - SINGLE SELECT (10 pts)
   │  └─ Si "No conforme" → Requiere foto + nota
   └─ Equipos certificados? - CHECKBOX (10 pts)

   Sección 3: EVIDENCIA
   ├─ Observaciones - TEXTAREA
   ├─ Fotos - PHOTO (2-5 fotos)
   └─ Firma - SIGNATURE

3. Inspector Abre Inspección
   ├─ Selecciona template
   ├─ Abre en pestaña nueva (mobile friendly)
   └─ Inicia en Sección 1

4. Completa Página por Página
   ├─ Llena datos requeridos
   ├─ Valida en tiempo real
   └─ Botón "Siguiente"

5. Sistema Calcula Score
   ├─ En tiempo real muestra %
   ├─ Barra visual roja/verde
   └─ Avisa si no alcanza mínimo

6. Completa Inspección
   ├─ Se guarda en base de datos
   ├─ Se genera PDF automáticamente
   └─ Status: COMPLETED

7. Descarga/Comparte PDF
   ├─ Incluye todas las respuestas
   ├─ Fotos integradas
   ├─ Score final
   └─ Listo para imprimir
```

---

## 🎯 Resumen de Cuándo Usar Cada Campo

| Tipo | Usar Cuando... | Ejemplo |
|------|---|---|
| **Checkbox** | Sí/No simple | ¿Equipos calibrados? |
| **Single Select** | 2-5 opciones visuales | Nivel de cumplimiento |
| **Select** | Muchas opciones | Departamento (20+ options) |
| **Text** | Entrada corta | Nombre inspector |
| **Textarea** | Comentarios largos | Observaciones |
| **Number** | Valores numéricos | Cantidad de incidentes |
| **Asset** | Seleccionar equipo | Vehículo inspeccionado |
| **Location** | Ubicación | Dónde se hizo |
| **Photo** | Evidencia visual | Foto de problema |
| **Signature** | Firma/conformidad | Firma inspector |

---

**Ahora que entienden todos los campos, ¡pueden crear inspecciones complejas y robustas!** 🚀

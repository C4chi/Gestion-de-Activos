# 🏗️ ARQUITECTURA DEL SISTEMA SAP - RODICON
## Diagrama de Componentes y Capas

**Versión:** 1.0  
**Fecha:** 7 de Enero 2026  

---

## 📐 ARQUITECTURA DE CAPAS (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ Desktop  │ Tablet   │ Mobile   │ Reports  │ Dashboards   │  │
│  │ Browser  │ Responsive│ Responsive│ PDF/Excel│ Real-time   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                    React 19 + Tailwind CSS
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│                  APPLICATION BUSINESS LAYER                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  State Management (Zustand/Redux)                       │   │
│  │  ├─ AuthContext (User, Roles, Permissions)             │   │
│  │  ├─ DataContext (Assets, Purchases, etc)               │   │
│  │  └─ UIContext (Modal state, filters, etc)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Custom Hooks (Business Logic)                          │   │
│  │  ├─ useInventoryManagement()                            │   │
│  │  ├─ usePurchasingWorkflow()                             │   │
│  │  ├─ useMaintenanceManagement()                          │   │
│  │  ├─ useSafetyWorkflow()                                 │   │
│  │  ├─ useWorkshopWorkflow()                               │   │
│  │  └─ useFormValidation()                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Service Layer (API Client)                             │   │
│  │  ├─ supabaseService.js                                  │   │
│  │  ├─ inventoryService.js                                 │   │
│  │  ├─ purchasingService.js                                │   │
│  │  ├─ maintenanceService.js                               │   │
│  │  ├─ safetyService.js                                    │   │
│  │  └─ integrationService.js                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                          REST API
                    (Supabase PostgREST)
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE & BACKEND LAYER                      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  PostgreSQL Database (via Supabase)                  │      │
│  │  ├─ Core Tables (7 main tables)                      │      │
│  │  ├─ Analytics Views                                  │      │
│  │  ├─ Audit Trail                                      │      │
│  │  ├─ RLS Policies (Security)                          │      │
│  │  ├─ Triggers & Functions                             │      │
│  │  └─ Full-text Search                                 │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  External Services                                    │      │
│  │  ├─ SendGrid (Email)                                 │      │
│  │  ├─ Microsoft Teams (Chat)                           │      │
│  │  ├─ Google Drive (Documents)                         │      │
│  │  ├─ S3 (File Storage)                                │      │
│  │  └─ Auth0 (Future OAuth2)                            │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

HORIZONTAL LAYERS
├─ Security & Authentication (en todas las capas)
├─ Logging & Monitoring (Sentry, PostHog)
├─ Caching & Performance (React Query, Redis)
└─ Error Handling & Validation (Zod, Custom validators)
```

---

## 🗂️ ESTRUCTURA DE CARPETAS FINAL

```
rodicon-app/
│
├─ public/
│  ├─ favicon.ico
│  ├─ manifest.json
│  └─ robots.txt
│
├─ src/
│  │
│  ├─ components/                    # Componentes reutilizables
│  │  ├─ Inventory/
│  │  │  ├─ InventoryAlerts.jsx
│  │  │  ├─ MovementLog.jsx
│  │  │  ├─ ABCAnalysis.jsx
│  │  │  └─ InventoryDashboard.jsx
│  │  │
│  │  ├─ Purchasing/
│  │  │  ├─ SupplierManagement.jsx
│  │  │  ├─ ApprovalWorkflow.jsx
│  │  │  ├─ QualityInspection.jsx
│  │  │  ├─ PurchaseAnalytics.jsx
│  │  │  └─ CommentModal.jsx
│  │  │
│  │  ├─ Workshop/
│  │  │  ├─ WorkOrderForm.jsx
│  │  │  ├─ TechnicianAssignment.jsx
│  │  │  ├─ WorkOrderCard.jsx
│  │  │  └─ UpdateWorkStatusModal.jsx
│  │  │
│  │  ├─ Safety/
│  │  │  ├─ IncidentManagement.jsx
│  │  │  ├─ IncidentInvestigation.jsx
│  │  │  ├─ HSEMetrics.jsx
│  │  │  ├─ AuditChecklist.jsx
│  │  │  └─ SafetyFormModal.jsx
│  │  │
│  │  ├─ Dashboards/
│  │  │  ├─ ExecutiveDashboard.jsx
│  │  │  ├─ OperationsDashboard.jsx
│  │  │  ├─ FinancialDashboard.jsx
│  │  │  └─ HSEDashboard.jsx
│  │  │
│  │  ├─ Reports/
│  │  │  ├─ ReportBuilder.jsx
│  │  │  ├─ ScheduledReports.jsx
│  │  │  └─ ReportHistory.jsx
│  │  │
│  │  ├─ Admin/
│  │  │  ├─ UserManagement.jsx
│  │  │  ├─ RoleManagement.jsx
│  │  │  ├─ SystemConfig.jsx
│  │  │  ├─ AuditLog.jsx
│  │  │  ├─ BackupManagement.jsx
│  │  │  ├─ SystemHealth.jsx
│  │  │  └─ SecurityCenter.jsx
│  │  │
│  │  ├─ Integrations/
│  │  │  ├─ IntegrationSettings.jsx
│  │  │  ├─ EmailConfig.jsx
│  │  │  └─ APIKeyManagement.jsx
│  │  │
│  │  ├─ Common/
│  │  │  ├─ GenericFormModal.jsx
│  │  │  ├─ NotificationCenter.jsx
│  │  │  ├─ SkeletonLoader.jsx
│  │  │  ├─ StatusBadge.jsx
│  │  │  ├─ FullScreenModal.jsx
│  │  │  └─ PinModal.jsx
│  │  │
│  │  ├─ Layout/
│  │  │  ├─ Sidebar.jsx
│  │  │  ├─ TopBar.jsx
│  │  │  ├─ Footer.jsx
│  │  │  └─ MainLayout.jsx
│  │  │
│  │  └─ Charts/
│  │     ├─ LineChart.jsx
│  │     ├─ BarChart.jsx
│  │     ├─ PieChart.jsx
│  │     └─ TrendChart.jsx
│  │
│  ├─ hooks/                         # Custom React Hooks
│  │  ├─ useInventoryManagement.js
│  │  ├─ usePurchasingWorkflow.js
│  │  ├─ usePurchasingAdvanced.js
│  │  ├─ useMaintenanceManagement.js
│  │  ├─ useSafetyWorkflow.js
│  │  ├─ useSafetyAdvanced.js
│  │  ├─ useWorkshopWorkflow.js
│  │  ├─ useFormValidation.js
│  │  ├─ useNotifications.js
│  │  ├─ useAuth.js
│  │  ├─ useLocalStorage.js
│  │  └─ useDebounce.js
│  │
│  ├─ services/                      # API & Business Logic
│  │  ├─ supabaseClient.js
│  │  ├─ supabaseService.js
│  │  ├─ inventoryService.js
│  │  ├─ purchasingService.js
│  │  ├─ maintenanceService.js
│  │  ├─ safetyService.js
│  │  ├─ workshopService.js
│  │  ├─ reportService.js
│  │  ├─ authService.js
│  │  ├─ storageService.js
│  │  └─ integrations/
│  │     ├─ emailService.js
│  │     ├─ teamsService.js
│  │     ├─ googleDriveService.js
│  │     ├─ accountingService.js
│  │     └─ hrService.js
│  │
│  ├─ context/                       # React Context
│  │  ├─ AuthContext.jsx
│  │  ├─ DataContext.jsx
│  │  ├─ UIContext.jsx
│  │  └─ NotificationContext.jsx
│  │
│  ├─ utils/                         # Utilities & Helpers
│  │  ├─ validators.js
│  │  ├─ formatters.js
│  │  ├─ calculations.js
│  │  ├─ dateUtils.js
│  │  ├─ stringUtils.js
│  │  ├─ arrayUtils.js
│  │  ├─ constants.js
│  │  └─ errorHandler.js
│  │
│  ├─ types/                         # TypeScript Types
│  │  ├─ asset.types.ts
│  │  ├─ purchase.types.ts
│  │  ├─ maintenance.types.ts
│  │  ├─ safety.types.ts
│  │  ├─ user.types.ts
│  │  └─ common.types.ts
│  │
│  ├─ __tests__/                     # Test Files
│  │  ├─ unit/
│  │  │  ├─ hooks/
│  │  │  ├─ services/
│  │  │  └─ utils/
│  │  ├─ integration/
│  │  └─ e2e/
│  │
│  ├─ assets/                        # Static Assets
│  │  ├─ images/
│  │  ├─ icons/
│  │  ├─ fonts/
│  │  └─ styles/
│  │
│  ├─ docs/                          # Documentation
│  │  ├─ API.md
│  │  ├─ ARCHITECTURE.md
│  │  ├─ SETUP.md
│  │  └─ TROUBLESHOOTING.md
│  │
│  ├─ App.jsx                        # Main App
│  ├─ App.css
│  ├─ AppContext.jsx                 # (Deprecado - migrado a context/)
│  ├─ main.jsx                       # Entry Point
│  └─ index.css                      # Global Styles
│
├─ .github/
│  └─ workflows/                     # CI/CD
│     ├─ test.yml
│     ├─ lint.yml
│     ├─ build.yml
│     └─ deploy.yml
│
├─ docs/                             # Documentation
│  ├─ ARCHITECTURE.md
│  ├─ API.md
│  ├─ SETUP.md
│  ├─ DEPLOYMENT.md
│  ├─ SECURITY.md
│  ├─ TROUBLESHOOTING.md
│  └─ RUNBOOK.md
│
├─ .env.example
├─ .env.local                        # (No versionado)
├─ .gitignore
├─ eslint.config.js
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ package.json
├─ package-lock.json
├─ jest.config.js
│
└─ supabase/
   ├─ migrations/
   │  ├─ 001_initial_schema.sql
   │  ├─ 002_inventory_module.sql
   │  ├─ 003_purchasing_module.sql
   │  ├─ 004_maintenance_module.sql
   │  ├─ 005_safety_module.sql
   │  ├─ 006_reporting_module.sql
   │  └─ 007_admin_module.sql
   │
   ├─ functions/
   │  ├─ generate_requisition_number.sql
   │  ├─ calculate_abc_analysis.sql
   │  ├─ update_asset_status.sql
   │  ├─ calculate_hse_metrics.sql
   │  └─ sync_to_accounting.sql
   │
   ├─ policies/
   │  ├─ assets_rls.sql
   │  ├─ purchases_rls.sql
   │  ├─ maintenance_rls.sql
   │  ├─ safety_rls.sql
   │  └─ audit_log_rls.sql
   │
   └─ views/
      ├─ current_inventory.sql
      ├─ purchase_analytics.sql
      ├─ maintenance_metrics.sql
      ├─ hse_metrics.sql
      └─ audit_trail.sql
```

---

## 📦 COMPONENTES PRINCIPALES POR MÓDULO

### Módulo 1: INVENTARIO (Inventory Management)

```
InventoryView (Container)
│
├─ InventoryAlerts (Smart Alerts)
│  ├─ Low Stock Warning
│  ├─ Insurance Expiry Alert
│  ├─ Maintenance Due Alert
│  └─ Action Buttons
│
├─ InventorySearch & Filter
│  ├─ Search Input
│  ├─ Category Filter
│  ├─ Status Filter
│  └─ Date Range Filter
│
├─ InventoryTable/Grid
│  ├─ Asset Details
│  ├─ Current Stock
│  ├─ Movement History
│  ├─ Last Updated
│  └─ Action Buttons
│
├─ MovementLog
│  ├─ Entry/Exit Register
│  ├─ Movement Type
│  ├─ Reference Document
│  ├─ Timestamp
│  └─ User Info
│
├─ ABCAnalysis
│  ├─ Classification Chart
│  ├─ Concentration Analysis
│  ├─ Recommendation Engine
│  └─ Export Report
│
└─ InventoryDashboard
   ├─ KPI Cards (Total, By Category, etc)
   ├─ Stock Trend Chart
   ├─ Rotation Analysis
   └─ Alerts Summary

HOOKS UTILIZADOS
├─ useInventoryManagement()
├─ useFormValidation()
├─ useNotifications()
└─ useLocalStorage()

ESTADO LOCAL
├─ selectedAsset
├─ movements
├─ alerts
├─ filters
└─ searchQuery
```

### Módulo 2: COMPRAS (Purchasing Management)

```
PurchasingManagement (Container)
│
├─ SupplierManagement (NEW)
│  ├─ Supplier Catalog
│  ├─ Contact List
│  ├─ Performance Metrics
│  ├─ Add/Edit Supplier
│  └─ Rating & Review
│
├─ PurchaseRequisition
│  ├─ Create New Req
│  ├─ Line Items Form
│  ├─ Automatic Numbering
│  ├─ Attachment Support
│  └─ Submit Button
│
├─ ApprovalWorkflow (NEW)
│  ├─ Pending Approvals
│  ├─ Approval Rules
│  ├─ Multi-level Approval
│  ├─ Comments & History
│  └─ Approve/Reject
│
├─ PurchaseCard
│  ├─ Req Number
│  ├─ Status Badge
│  ├─ Amount
│  ├─ Supplier
│  ├─ Timeline
│  └─ Action Buttons
│
├─ CommentModal
│  ├─ Partial Reception Comment
│  ├─ Expected Delivery Date
│  ├─ Quality Issues
│  └─ Save Button
│
├─ QualityInspection (NEW)
│  ├─ Inspection Checklist
│  ├─ Photos/Evidence
│  ├─ Non-conformance Report
│  ├─ Action Items
│  └─ Sign-off
│
└─ PurchaseAnalytics (NEW)
   ├─ Spending by Supplier
   ├─ Price Variance Analysis
   ├─ Delivery Performance
   ├─ Cost Trends
   └─ Supplier Scorecard

HOOKS UTILIZADOS
├─ usePurchasingWorkflow() [existente, mejorado]
├─ usePurchasingAdvanced() [nuevo]
├─ useFormValidation()
└─ useNotifications()

WORKFLOW
Requisición → Aprobación → Orden → Recepción → Facturación
                                   ↓
                         (Parcial con comentarios)
```

### Módulo 3: MANTENIMIENTO (Maintenance Management)

```
WorkshopMonitor (Container)
│
├─ MaintenancePlan (NEW)
│  ├─ PP Schedule
│  ├─ Interval Calculation
│  ├─ Asset-wise Plan
│  ├─ Plan View (Gantt optional)
│  └─ Alerts
│
├─ WorkOrderForm (NEW)
│  ├─ Create from Plan
│  ├─ Create from Demand
│  ├─ Asset Selection
│  ├─ Service Type
│  ├─ Technician Assignment
│  └─ Priority
│
├─ WorkOrderCard
│  ├─ WO Number
│  ├─ Asset Info
│  ├─ Status
│  ├─ Technician
│  ├─ Timeline
│  └─ Actions
│
├─ TechnicianAssignment (NEW)
│  ├─ Available Technicians
│  ├─ Skills/Certifications
│  ├─ Workload
│  ├─ Availability Calendar
│  └─ Assign Button
│
├─ MtoDetailModal
│  ├─ Full Work Order Details
│  ├─ Work History
│  ├─ Parts Used
│  ├─ Time Spent
│  ├─ Cost Breakdown
│  └─ Close Button
│
├─ ReliabilityMetrics (NEW)
│  ├─ MTBF Chart
│  ├─ MTTR Chart
│  ├─ OEE Calculation
│  ├─ Failure Analysis
│  └─ Trend Analysis
│
└─ DowntimeAnalysis (NEW)
   ├─ Downtime Events
   ├─ Root Cause
   ├─ Impact on Production
   ├─ Cost Analysis
   └─ Prevention Measures

HOOKS UTILIZADOS
├─ useWorkshopWorkflow() [existente, mejorado]
├─ useMaintenanceManagement() [nuevo]
├─ useFormValidation()
└─ useNotifications()

KPIs CALCULADOS
├─ MTBF: Mean Time Between Failures
├─ MTTR: Mean Time To Repair
├─ OEE: Overall Equipment Effectiveness
├─ Availability %
└─ Maintenance Cost/Hour
```

### Módulo 4: SEGURIDAD HSE (Safety Management)

```
SafetyCenter (Container)
│
├─ IncidentManagement
│  ├─ Incident Report Form
│  ├─ Classification (Near-miss to Fatal)
│  ├─ Incident List
│  ├─ Status Tracking
│  └─ Notification to Stakeholders
│
├─ IncidentInvestigation (NEW)
│  ├─ Root Cause Analysis
│  ├─ 5-Why Method
│  ├─ Evidence Collection
│  ├─ Photo/Video Upload
│  ├─ Witness Statements
│  └─ Investigation Timeline
│
├─ SafetyFormModal
│  ├─ Initial Report Form
│  ├─ Mandatory Fields
│  ├─ Photo Evidence
│  ├─ Severity Assessment
│  └─ Submit Button
│
├─ CorrectiveActions
│  ├─ Action Items
│  ├─ Responsibility Assignment
│  ├─ Due Date Tracking
│  ├─ Implementation Status
│  └─ Follow-up Tasks
│
├─ HSEMetrics (NEW)
│  ├─ TRIFR (Total Recordable Incident Rate)
│  ├─ LTIFR (Lost Time Incident Frequency)
│  ├─ Severity Rate
│  ├─ Compliance Index %
│  ├─ Trend Analysis
│  └─ Industry Comparison
│
├─ SafetyAudit (NEW)
│  ├─ Audit Checklist
│  ├─ Findings Register
│  ├─ Non-conformance Report
│  ├─ Corrective Actions
│  ├─ Audit Trail
│  └─ Closing Report
│
├─ TrainingRecords (NEW)
│  ├─ Training Catalog
│  ├─ Attendance Register
│  ├─ Certification Tracking
│  ├─ Expiry Alerts
│  ├─ Competence Assessment
│  └─ Training Report
│
└─ ComplianceTracking (NEW)
   ├─ Legal Requirements
   ├─ Regulatory Obligations
   ├─ Compliance Status
   ├─ Evidence Documentation
   ├─ Action Items
   └─ Audit Readiness

HOOKS UTILIZADOS
├─ useSafetyWorkflow() [existente, mejorado]
├─ useSafetyAdvanced() [nuevo]
├─ useFormValidation()
└─ useNotifications()

HSE FRAMEWORK
├─ ISO 45001:2018 (Occupational Health & Safety)
├─ ISO 14001:2015 (Environmental Management)
├─ ISO 9001:2015 (Quality Management)
└─ Local Regulations (country-specific)
```

---

## 🔄 DATA FLOW EXAMPLE: Complete Requisition Workflow

```
USER INTERFACE
│
└─ PurchasingManagement Component
   └─ Opens RequisitionModal
      │
      ├─ User fills form (asset, items, supplier, etc)
      │
      └─ usePurchasingWorkflow Hook
         │
         ├─ validateFormData()
         ├─ generateRequisitionNumber()  [SQL Function]
         │
         └─ purchasingService.createRequisition()
            │
            ├─ Call Supabase API
            │
            └─ Supabase (Backend)
               │
               ├─ INSERT into purchase_orders (RLS Check)
               ├─ INSERT into purchase_items
               ├─ UPDATE assets (status = ESPERA REPUESTO)
               ├─ INSERT into audit_log
               │
               └─ Triggers fire
                  ├─ send_email_notification()
                  ├─ send_teams_notification()
                  └─ create_timeline_entry()
                     │
                     └─ Realtime Subscription
                        │
                        └─ UI Updates
                           │
                           ├─ Toast notification
                           ├─ Purchase list refreshes
                           ├─ Alert appears in dashboard
                           └─ Assigned user notified
```

---

## 🔐 SECURITY ARCHITECTURE

```
┌─────────────────────────────────────────┐
│        FRONTEND SECURITY                 │
├─────────────────────────────────────────┤
│ • PIN Authentication (Current)           │
│ • JWT Token Storage (SessionStorage)     │
│ • CSRF Protection (Supabase default)     │
│ • Input Validation (Zod)                 │
│ • XSS Prevention (React auto-escaping)   │
│ • CORS Policy (Supabase configured)      │
└─────────────────────────────────────────┘
           ↑
        HTTPS/TLS 1.3
           ↓
┌─────────────────────────────────────────┐
│        BACKEND SECURITY                  │
├─────────────────────────────────────────┤
│ • Row Level Security (RLS Policies)      │
│ • Role-Based Access Control (RBAC)       │
│ • Parameter Validation (PostgREST)       │
│ • SQL Injection Prevention (Parameterized)
│ • Audit Trail (Complete logging)         │
│ • Encryption at Rest (Supabase)          │
└─────────────────────────────────────────┘
           ↑
     PostgreSQL 15+
           ↓
┌─────────────────────────────────────────┐
│        DATA SECURITY                     │
├─────────────────────────────────────────┤
│ • RLS Policies (All tables)              │
│ • Sensitive data encryption              │
│ • PII masking in logs                    │
│ • Backup encryption                      │
│ • Data retention policies                │
│ • GDPR compliance                        │
└─────────────────────────────────────────┘
```

---

## 📊 DATABASE SCHEMA (Simplified View)

```
Core Tables (25+ total)
│
├─ USERS & ACCESS
│  ├─ app_users (Authentication & Roles)
│  ├─ user_permissions (Granular access)
│  └─ user_audit_log (Activity tracking)
│
├─ INVENTORY (Assets Management)
│  ├─ assets (Main inventory)
│  ├─ inventory_movements (Stock transactions)
│  ├─ inventory_alerts (Smart notifications)
│  └─ abc_analysis (ABC classification)
│
├─ PURCHASING (Requisitions & Orders)
│  ├─ purchase_orders (Main requisitions)
│  ├─ purchase_items (Line items)
│  ├─ suppliers (Vendor master)
│  ├─ supplier_contacts (Contact info)
│  ├─ purchase_approvals (Approval workflow)
│  └─ quality_inspections (QA checks)
│
├─ MAINTENANCE (MTO & Work Orders)
│  ├─ maintenance_logs (History)
│  ├─ maintenance_plans (PP schedule)
│  ├─ work_orders (Maintenance jobs)
│  ├─ technician_assignments (Resource allocation)
│  └─ reliability_metrics (KPI calculations)
│
├─ SAFETY (HSE Management)
│  ├─ safety_reports (Incident reports)
│  ├─ incidents (Detailed incidents)
│  ├─ incident_investigations (Root cause analysis)
│  ├─ safety_audits (Internal audits)
│  ├─ audit_findings (Non-conformances)
│  ├─ training_records (Capacity building)
│  └─ hse_metrics (KPI calculations)
│
├─ OPERATIONS (Support)
│  ├─ audit_log (Complete audit trail)
│  ├─ system_parameters (Config storage)
│  ├─ notifications (In-app messages)
│  └─ attachments (File references)
│
└─ ANALYTICS (Reporting)
   ├─ purchase_analytics (Spending reports)
   ├─ maintenance_metrics (Performance KPIs)
   ├─ hse_metrics (Safety KPIs)
   └─ financial_summary (Cost analysis)

RELATIONSHIPS
assets ──→ inventory_movements
         ──→ maintenance_logs
         ──→ safety_reports
         ──→ purchase_orders

purchase_orders ──→ purchase_items
               ──→ purchase_approvals
               ──→ quality_inspections

work_orders ──→ technician_assignments
            ──→ reliability_metrics

safety_reports ──→ incident_investigations
              ──→ safety_audits
```

---

## 🎯 INTEGRATION POINTS

```
RODICON SAP
│
├─ Email Service (SendGrid)
│  ├─ Requisition notifications
│  ├─ Approval reminders
│  ├─ Incident alerts
│  ├─ Report distribution
│  └─ Scheduled reports
│
├─ Chat Service (Microsoft Teams)
│  ├─ Incident notifications
│  ├─ Approval requests
│  ├─ MTO status updates
│  ├─ Dashboard alerts
│  └─ Daily summary
│
├─ Document Service (Google Drive)
│  ├─ Technical documentation
│  ├─ Attachment storage
│  ├─ Report archival
│  ├─ Evidence files
│  └─ OCR invoice processing
│
├─ Accounting System (IF EXISTS)
│  ├─ GL entry synchronization
│  ├─ Budget tracking
│  ├─ Cost center allocation
│  ├─ PO to Invoice matching
│  └─ Financial reporting
│
├─ HR System (IF EXISTS)
│  ├─ Employee import
│  ├─ Technician assignment
│  ├─ Competence management
│  ├─ Training tracking
│  └─ Cost allocation
│
├─ Warehouse System (IF EXISTS)
│  ├─ Stock synchronization
│  ├─ Picking notifications
│  ├─ Barcode scanning
│  ├─ Real-time movements
│  └─ Discrepancy alerts
│
└─ External Analytics (PostHog, Sentry)
   ├─ User behavior tracking
   ├─ Error logging
   ├─ Performance monitoring
   └─ Feature usage metrics
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
Developer Workstation
        ↓
   GitHub Repo
        ↓
   GitHub Actions (CI/CD Pipeline)
   ├─ Lint Check
   ├─ Unit Tests
   ├─ Build Verification
   ├─ Security Scan
   └─ Deploy to Staging
        ↓
Staging Environment
├─ Supabase Staging DB
├─ Test Data
├─ Performance Testing
└─ UAT Verification
        ↓
Production Deployment
├─ Vercel/Netlify (CDN)
├─ Supabase Production DB
├─ S3 Storage
└─ SendGrid Integration
        ↓
Monitoring & Support
├─ Sentry (Error Tracking)
├─ PostHog (Analytics)
├─ DataDog (Performance)
└─ On-call Support Team
```

---

## ✅ COMPLETION CHECKLIST

```
Architecture
- [ ] All diagrams reviewed
- [ ] Data flow validated
- [ ] Component hierarchy approved
- [ ] Security architecture assessed
- [ ] Integration points identified

Implementation
- [ ] Database schema created
- [ ] API endpoints defined
- [ ] Component structure established
- [ ] Hooks implemented
- [ ] Services created
- [ ] Tests written

Deployment
- [ ] CI/CD pipeline functional
- [ ] Staging environment ready
- [ ] Production environment ready
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Disaster recovery tested

Documentation
- [ ] Architecture documented
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Setup guide written
- [ ] Troubleshooting guide complete
- [ ] Runbook prepared
```

---

**Documento preparado por:** AI Architecture Team  
**Última actualización:** 7 de Enero 2026  
**Próxima revisión:** Post-Fase 2  

Esta arquitectura proporciona una base sólida para escalar RODICON de un sistema de gestión de activos básico a una plataforma ERP completa.

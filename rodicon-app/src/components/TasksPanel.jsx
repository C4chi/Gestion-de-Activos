import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, CheckCircle2, Clock3, Eye, Filter, ImagePlus, Mail, Pencil, Plus, RefreshCw, Send, Trash2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const DEFAULT_FORM = {
  title: '',
  description: '',
  assigned_to: [],
  due_date: '',
  task_kind: 'GENERAL',
  recurrence_type: 'NONE',
  reminderDaysBefore: [7, 3, 1, 0],
  payment_amount: '',
  priority: 'MEDIA',
  status: 'PENDIENTE',
  reminderHoursBefore: 24,
  reminderEveryHours: 24,
  reminderInApp: true,
  reminderEmail: true,
};

const QUICK_REMINDER_HOURS = [4, 8, 12, 24, 48, 72];
const QUICK_REMINDER_DAYS = [15, 7, 3, 1, 0];
const QUICK_TASK_FILTERS = ['TODAS', 'VENCIDAS', 'VENCEN_HOY', 'SIN_FOTO'];

const PRIORITY_BADGE_STYLES = {
  BAJA: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  MEDIA: 'bg-amber-50 text-amber-700 border border-amber-200',
  ALTA: 'bg-orange-50 text-orange-700 border border-orange-200',
  CRITICA: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const TASK_TEMPLATES = [
  {
    key: 'compras-semanal',
    label: 'Compras semanales',
    title: 'Revisión semanal de compras',
    description: 'Validar solicitudes, cotizaciones y órdenes pendientes de la semana.',
    priority: 'MEDIA',
    reminderHoursBefore: 24,
    reminderEveryHours: 24,
  },
  {
    key: 'cierre-mensual',
    label: 'Cierre mensual',
    title: 'Cierre mensual de pendientes',
    description: 'Consolidar tareas abiertas y actualizar estatus para cierre de mes.',
    priority: 'ALTA',
    reminderHoursBefore: 48,
    reminderEveryHours: 24,
  },
  {
    key: 'hse-seguimiento',
    label: 'Seguimiento HSE',
    title: 'Seguimiento de hallazgos HSE',
    description: 'Dar seguimiento a observaciones y acciones correctivas pendientes.',
    priority: 'CRITICA',
    reminderHoursBefore: 12,
    reminderEveryHours: 12,
  },
];

export default function TasksPanel({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [taskAssignees, setTaskAssignees] = useState([]);
  const [taskPhotos, setTaskPhotos] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingReminders, setProcessingReminders] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [quickTaskFilter, setQuickTaskFilter] = useState('TODAS');
  const [activePage, setActivePage] = useState('CREATE');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newTaskFiles, setNewTaskFiles] = useState([]);
  const [detailTask, setDetailTask] = useState(null);
  const [detailUploading, setDetailUploading] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [editAssigneeSearch, setEditAssigneeSearch] = useState('');

  const isAdminGlobal = currentUser?.rol === 'ADMIN_GLOBAL';

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('id,nombre,nombre_usuario,email')
      .order('nombre', { ascending: true });

    if (error) throw error;
    setUsers(data || []);
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(200);

    if (error) throw error;

    setTasks(data || []);
  }, []);

  const fetchTaskAssignees = useCallback(async () => {
    const { data, error } = await supabase
      .from('task_assignees')
      .select('id,task_id,user_id,created_at')
      .limit(1000);

    if (error) throw error;
    setTaskAssignees(data || []);
  }, []);

  const fetchReminders = useCallback(async () => {
    const { data, error } = await supabase
      .from('task_reminders')
      .select('id,task_id,remind_at,repeat_every_hours,channels,sent_at,in_app_sent,email_queued,attempts,created_at')
      .order('remind_at', { ascending: true })
      .limit(400);

    if (error) throw error;
    setReminders(data || []);
  }, []);

  const fetchTaskPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from('task_photos')
      .select('id,task_id,url,storage_path,file_name,uploaded_by,created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    setTaskPhotos(data || []);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchTasks(), fetchTaskAssignees(), fetchTaskPhotos(), fetchReminders()]);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      toast.error(`Error cargando tareas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [fetchReminders, fetchTaskAssignees, fetchTaskPhotos, fetchTasks, fetchUsers]);

  const uploadFilesForTask = useCallback(async (taskId, files) => {
    if (!Array.isArray(files) || files.length === 0) return [];

    const uploadedRows = [];

    for (const file of files) {
      if (!file || !file.type?.startsWith('image/')) continue;

      const safeName = file.name?.replace(/\s+/g, '-').toLowerCase() || 'foto.jpg';
      const path = `public/tasks/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('uploads')
        .getPublicUrl(path);

      uploadedRows.push({
        task_id: taskId,
        url: publicData?.publicUrl,
        storage_path: path,
        file_name: file.name,
        uploaded_by: currentUser?.id || null,
      });
    }

    if (uploadedRows.length > 0) {
      const { error: insertError } = await supabase
        .from('task_photos')
        .insert(uploadedRows);

      if (insertError) throw insertError;
    }

    return uploadedRows;
  }, [currentUser?.id]);

  const dispatchEmails = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('task-email-dispatch', {
        body: {},
      });

      if (error) throw error;
      return data || { processed: 0, sent: 0, failed: 0 };
    } catch (error) {
      console.warn('No se pudo ejecutar dispatcher de email:', error?.message || error);
      return { processed: 0, sent: 0, failed: 0 };
    }
  }, []);

  const processReminders = useCallback(async (silent = false) => {
    try {
      setProcessingReminders(true);
      const { data, error } = await supabase.rpc('process_task_reminders', { p_limit: 100 });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : null;
      const processed = row?.reminders_processed || 0;
      const inApp = row?.in_app_notifications || 0;
      const emails = row?.emails_queued || 0;

      if (processed > 0 && !silent) {
        toast.success(`Recordatorios procesados: ${processed} (app: ${inApp}, email: ${emails})`);
      }

      return { processed, inApp, emails };
    } catch (error) {
      console.error('Error procesando recordatorios:', error);
      if (!silent) {
        toast.error(`Error procesando recordatorios: ${error.message}`);
      }
      return { processed: 0, inApp: 0, emails: 0, error: true };
    } finally {
      setProcessingReminders(false);
    }
  }, []);

  const processAllPendingNow = useCallback(async () => {
    try {
      setBulkSending(true);

      const openTaskIds = tasks
        .filter((task) => ['PENDIENTE', 'EN_PROGRESO'].includes(task.status))
        .map((task) => task.id);

      if (openTaskIds.length === 0) {
        toast('No hay tareas pendientes para recordar.');
        return;
      }

      const pendingReminders = reminders.filter(
        (reminder) => !reminder.sent_at && openTaskIds.includes(reminder.task_id)
      );

      if (pendingReminders.length === 0) {
        toast('No hay recordatorios pendientes por enviar.');
        return;
      }

      const reminderIds = pendingReminders.map((reminder) => reminder.id);
      const forceNowIso = new Date(Date.now() - 60000).toISOString();

      const { error: updateError } = await supabase
        .from('task_reminders')
        .update({ remind_at: forceNowIso })
        .in('id', reminderIds);

      if (updateError) throw updateError;

      const result = await processReminders(true);
      const dispatchResult = await dispatchEmails();
      await fetchReminders();

      toast.success(
        `Pendientes enviados ahora. Procesados: ${result.processed || 0}, emails enviados: ${dispatchResult.sent || 0}`
      );
    } catch (error) {
      console.error('Error enviando pendientes:', error);
      toast.error(`No se pudieron enviar pendientes: ${error.message}`);
    } finally {
      setBulkSending(false);
    }
  }, [dispatchEmails, fetchReminders, processReminders, reminders, tasks]);

  const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const normalizeDateInput = (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed);
      const isDateTimeWithoutTimezone = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed);

      if (!hasTimezone && isDateTimeWithoutTimezone) {
        return `${trimmed.replace(' ', 'T')}Z`;
      }

      return trimmed;
    };

    const parseDateValue = (value) => {
      const date = new Date(normalizeDateInput(value));
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const date = parseDateValue(isoDate);
    if (!date) return '';
    const pad = (num) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseDbDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value !== 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const trimmed = value.trim();
    const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed);
    const isDateTimeWithoutTimezone = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed);
    const normalized = (!hasTimezone && isDateTimeWithoutTimezone)
      ? `${trimmed.replace(' ', 'T')}Z`
      : trimmed;

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getNextDueDateByRecurrence = (dueDate, recurrenceType) => {
    if (!dueDate || !(dueDate instanceof Date)) return null;

    if (recurrenceType === 'WEEKLY') {
      return new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (recurrenceType === 'BIWEEKLY') {
      return new Date(dueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    if (recurrenceType === 'MONTHLY') {
      const nextDate = new Date(dueDate.getTime());
      const originalDay = nextDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (nextDate.getDate() < originalDay) {
        nextDate.setDate(0);
      }
      return nextDate;
    }

    return null;
  };

  const buildReminderPayloads = ({
    taskId,
    dueDate,
    channels,
    taskKind,
    recurrenceType,
    reminderDaysBefore,
    reminderHoursBefore,
    repeatEveryHours,
  }) => {
    const safeDueDate = dueDate ? (dueDate instanceof Date ? dueDate : new Date(dueDate)) : null;
    const hasDueDate = safeDueDate && !Number.isNaN(safeDueDate.getTime());

    const isRecurringPayment = taskKind !== 'GENERAL' && recurrenceType !== 'NONE';

    if (isRecurringPayment) {
      if (!hasDueDate) return [];

      const daysBeforeList = [...new Set((reminderDaysBefore || []).map(Number).filter((value) => Number.isFinite(value) && value >= 0))];
      const sortedDays = daysBeforeList.length > 0 ? daysBeforeList.sort((a, b) => b - a) : [7, 3, 1, 0];

      return sortedDays.map((daysBefore) => ({
        task_id: taskId,
        remind_at: new Date(safeDueDate.getTime() - daysBefore * 24 * 60 * 60 * 1000).toISOString(),
        repeat_every_hours: null,
        channels,
      }));
    }

    const safeHoursBefore = Number.isFinite(Number(reminderHoursBefore)) && Number(reminderHoursBefore) >= 0
      ? Number(reminderHoursBefore)
      : 24;

    const safeRepeatEveryHours = Number.isFinite(Number(repeatEveryHours)) && Number(repeatEveryHours) > 0
      ? Number(repeatEveryHours)
      : 24;

    const nextReminderAt = hasDueDate
      ? new Date(safeDueDate.getTime() - safeHoursBefore * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + safeRepeatEveryHours * 60 * 60 * 1000).toISOString();

    return [
      {
        task_id: taskId,
        remind_at: nextReminderAt,
        repeat_every_hours: recurrenceType === 'NONE' ? safeRepeatEveryHours : null,
        channels,
      },
    ];
  };

  const notifyTaskAssignment = async ({ taskId, title, assigneeIds, dueDate, channels }) => {
    const uniqueAssigneeIds = [...new Set((assigneeIds || []).map(Number).filter((value) => Number.isFinite(value)))];
    if (uniqueAssigneeIds.length === 0) return;

    const dueDateLabel = dueDate ? parseDbDate(dueDate)?.toLocaleString() || 'Sin fecha límite' : 'Sin fecha límite';

    const inAppRows = uniqueAssigneeIds
      .filter((userId) => userId !== currentUser?.id)
      .map((userId) => ({
        usuario_id: userId,
        tipo: 'GENERAL',
        titulo: '📌 Nueva tarea asignada',
        contenido: `Se te asignó la tarea "${title}". Fecha límite: ${dueDateLabel}.`,
        entidad_id: String(taskId),
        entidad_tipo: 'task',
        metadata: {
          task_id: taskId,
          source: 'task_assignment',
          due_date: dueDate || null,
        },
      }));

    if (inAppRows.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(inAppRows);

      if (notificationError) {
        console.warn('No se pudieron crear notificaciones de asignación:', notificationError.message);
      }
    }

    if ((channels || []).includes('email')) {
      const recipients = uniqueAssigneeIds
        .map((userId) => usersById.get(userId))
        .filter((user) => user?.email)
        .map((user) => ({
          to_email: user.email,
          body: `<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h2 style="margin:0 0 12px 0;">📌 Nueva tarea asignada</h2>
            <p style="margin:0 0 8px 0;">Hola <strong>${(user.nombre || user.nombre_usuario || 'Usuario')}</strong>, se te asignó una tarea.</p>
            <p style="margin:0 0 8px 0;"><strong>Tarea:</strong> ${title}</p>
            <p style="margin:0;"><strong>Fecha límite:</strong> ${dueDateLabel}</p>
          </div>`,
        }));

      if (recipients.length > 0) {
        const emailRows = recipients.map((recipient) => ({
          task_id: taskId,
          reminder_id: null,
          to_email: recipient.to_email,
          subject: `Nueva tarea asignada: ${title}`,
          body: recipient.body,
        }));

        const { error: queueError } = await supabase
          .from('task_email_queue')
          .insert(emailRows);

        if (queueError) {
          console.warn('No se pudo encolar email de asignación:', queueError.message);
        }
      }
    }
  };

  const getPriorityBadgeClass = (priority) => PRIORITY_BADGE_STYLES[priority] || 'bg-slate-100 text-slate-700 border border-slate-200';

  const applyTemplate = () => {
    const template = TASK_TEMPLATES.find((item) => item.key === selectedTemplate);
    if (!template) return;

    setForm((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      priority: template.priority,
      reminderHoursBefore: template.reminderHoursBefore,
      reminderEveryHours: template.reminderEveryHours,
    }));
  };

  const snoozeReminder = async (reminder, hours) => {
    const parsedHours = Number(hours);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) return;

    try {
      const baseDate = parseDbDate(reminder.remind_at) || new Date();
      const nextDate = new Date(Math.max(Date.now(), baseDate.getTime()) + parsedHours * 60 * 60 * 1000);

      const { error } = await supabase
        .from('task_reminders')
        .update({
          remind_at: nextDate.toISOString(),
          sent_at: null,
          in_app_sent: false,
          email_queued: false,
          processed_by: null,
        })
        .eq('id', reminder.id);

      if (error) throw error;

      toast.success(`Recordatorio pospuesto ${parsedHours}h`);
      await fetchReminders();
    } catch (error) {
      console.error('Error posponiendo recordatorio:', error);
      toast.error(`No se pudo posponer recordatorio: ${error.message}`);
    }
  };

  const editReminder = async (reminder) => {
    const currentDate = formatDateForInput(reminder.remind_at);
    const remindAtInput = window.prompt('Nueva fecha/hora (YYYY-MM-DDTHH:mm)', currentDate);
    if (!remindAtInput) return;

    const includeInApp = window.confirm('¿Mantener canal en app? (Aceptar = Sí, Cancelar = No)');
    const includeEmail = window.confirm('¿Mantener canal email? (Aceptar = Sí, Cancelar = No)');

    const channels = [];
    if (includeInApp) channels.push('in_app');
    if (includeEmail) channels.push('email');

    if (channels.length === 0) {
      toast.error('Debe quedar al menos un canal de recordatorio');
      return;
    }

    const remindAtDate = new Date(remindAtInput);
    if (Number.isNaN(remindAtDate.getTime())) {
      toast.error('Fecha inválida');
      return;
    }

    try {
      const { error } = await supabase
        .from('task_reminders')
        .update({
          remind_at: remindAtDate.toISOString(),
          channels,
          sent_at: null,
          in_app_sent: false,
          email_queued: false,
          processed_by: null,
        })
        .eq('id', reminder.id);

      if (error) throw error;

      toast.success('Recordatorio actualizado');
      await fetchReminders();
    } catch (error) {
      console.error('Error actualizando recordatorio:', error);
      toast.error(`Error actualizando recordatorio: ${error.message}`);
    }
  };

  const deleteReminder = async (reminderId) => {
    const confirmed = window.confirm('¿Eliminar este recordatorio?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('task_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('Recordatorio eliminado');
      await fetchReminders();
    } catch (error) {
      console.error('Error eliminando recordatorio:', error);
      toast.error(`Error eliminando recordatorio: ${error.message}`);
    }
  };

  const sendReminderNow = async (task) => {
    try {
      const existing = reminders.find((reminder) => reminder.task_id === task.id && !reminder.sent_at);
      const forceNowIso = new Date(Date.now() - 60000).toISOString();

      if (existing) {
        const { error: updateError } = await supabase
          .from('task_reminders')
          .update({ remind_at: forceNowIso })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('task_reminders')
          .insert([
            {
              task_id: task.id,
              remind_at: forceNowIso,
              channels: ['in_app', 'email'],
            },
          ]);

        if (insertError) throw insertError;
      }

      await processReminders(true);
      const dispatchResult = await dispatchEmails();
      await fetchReminders();

      toast.success(`Recordatorio enviado. Emails enviados: ${dispatchResult.sent || 0}`);
    } catch (error) {
      console.error('Error enviando recordatorio inmediato:', error);
      toast.error(`No se pudo enviar recordatorio: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!isAdminGlobal) return;

    loadInitialData();
    processReminders();

    const intervalId = window.setInterval(() => {
      processReminders();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [isAdminGlobal, loadInitialData, processReminders]);

  const usersById = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      map.set(user.id, user);
    });
    return map;
  }, [users]);

  const assigneeIdsByTask = useMemo(() => {
    const map = new Map();
    taskAssignees.forEach((row) => {
      const list = map.get(row.task_id) || [];
      list.push(row.user_id);
      map.set(row.task_id, list);
    });
    return map;
  }, [taskAssignees]);

  const filteredTasks = useMemo(() => {
    const priorityWeight = {
      CRITICA: 4,
      ALTA: 3,
      MEDIA: 2,
      BAJA: 1,
    };

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    return tasks
      .filter((task) => (filterStatus === 'ALL' ? true : task.status === filterStatus))
      .filter((task) => {
        if (quickTaskFilter === 'TODAS') return true;

        const dueDate = parseDbDate(task.due_date);
        const photosCount = taskPhotos.filter((photo) => photo.task_id === task.id).length;

        if (quickTaskFilter === 'SIN_FOTO') {
          return photosCount === 0;
        }

        if (!dueDate) return false;
        if (quickTaskFilter === 'VENCIDAS') {
          return dueDate.getTime() < Date.now() && !['COMPLETADA', 'CANCELADA'].includes(task.status);
        }

        if (quickTaskFilter === 'VENCEN_HOY') {
          return dueDate >= todayStart && dueDate <= todayEnd;
        }

        return true;
      })
      .sort((firstTask, secondTask) => {
        const firstDue = parseDbDate(firstTask.due_date);
        const secondDue = parseDbDate(secondTask.due_date);
        const firstOpen = !['COMPLETADA', 'CANCELADA'].includes(firstTask.status);
        const secondOpen = !['COMPLETADA', 'CANCELADA'].includes(secondTask.status);
        const firstOverdue = firstOpen && firstDue && firstDue.getTime() < Date.now();
        const secondOverdue = secondOpen && secondDue && secondDue.getTime() < Date.now();

        if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1;

        const priorityDiff = (priorityWeight[secondTask.priority] || 0) - (priorityWeight[firstTask.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;

        const firstDueTime = firstDue?.getTime() || Number.MAX_SAFE_INTEGER;
        const secondDueTime = secondDue?.getTime() || Number.MAX_SAFE_INTEGER;
        return firstDueTime - secondDueTime;
      });
  }, [tasks, filterStatus, quickTaskFilter, taskPhotos]);

  const resetForm = () => setForm(DEFAULT_FORM);

  const createTask = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    if (!Array.isArray(form.assigned_to) || form.assigned_to.length === 0) {
      toast.error('Debe seleccionar un responsable');
      return;
    }

    const dueDate = form.due_date ? new Date(form.due_date) : null;
    if (form.due_date && dueDate && Number.isNaN(dueDate.getTime())) {
      toast.error('Fecha límite inválida');
      return;
    }

    const channels = [];
    if (form.reminderInApp) channels.push('in_app');
    if (form.reminderEmail) channels.push('email');

    if (channels.length === 0) {
      toast.error('Seleccione al menos un canal de recordatorio');
      return;
    }

    const isPaymentTask = form.task_kind !== 'GENERAL';
    const recurrenceType = form.recurrence_type || 'NONE';
    const reminderDaysBefore = [...new Set((form.reminderDaysBefore || []).map(Number).filter((value) => Number.isFinite(value) && value >= 0))];

    if (isPaymentTask && recurrenceType === 'NONE') {
      toast.error('Para pagos recurrentes selecciona una recurrencia');
      return;
    }

    if (isPaymentTask && !dueDate) {
      toast.error('Las tareas de pago requieren fecha límite');
      return;
    }

    try {
      setSubmitting(true);

      const taskPayload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        assigned_to: Number(form.assigned_to[0]),
        due_date: dueDate ? dueDate.toISOString() : null,
        task_kind: form.task_kind,
        recurrence_type: recurrenceType,
        reminder_days_before: isPaymentTask ? reminderDaysBefore : null,
        payment_amount: isPaymentTask && form.payment_amount !== '' ? Number(form.payment_amount) : null,
        priority: form.priority,
        status: form.status,
        created_by: currentUser?.id,
      };

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([taskPayload])
        .select('id')
        .single();

      if (taskError) throw taskError;

      const assigneeRows = [...new Set(form.assigned_to.map((value) => Number(value)).filter((value) => Number.isFinite(value)))].map((userId) => ({
        task_id: taskData.id,
        user_id: userId,
      }));

      if (assigneeRows.length > 0) {
        const { error: assigneesError } = await supabase
          .from('task_assignees')
          .insert(assigneeRows);

        if (assigneesError) throw assigneesError;
      }

      const reminderPayloads = buildReminderPayloads({
        taskId: taskData.id,
        dueDate,
        channels,
        taskKind: form.task_kind,
        recurrenceType,
        reminderDaysBefore,
        reminderHoursBefore: form.reminderHoursBefore,
        repeatEveryHours: form.reminderEveryHours,
      });

      const { error: reminderError } = await supabase
        .from('task_reminders')
        .insert(reminderPayloads);

      if (reminderError) throw reminderError;

      if (newTaskFiles.length > 0) {
        await uploadFilesForTask(taskData.id, newTaskFiles);
      }

      await notifyTaskAssignment({
        taskId: taskData.id,
        title: form.title.trim(),
        assigneeIds: form.assigned_to,
        dueDate: dueDate ? dueDate.toISOString() : null,
        channels,
      });

      toast.success('Tarea creada correctamente');
      resetForm();
      setNewTaskFiles([]);
      await Promise.all([fetchTasks(), fetchTaskAssignees(), fetchTaskPhotos(), fetchReminders()]);
      await processReminders();
    } catch (error) {
      console.error('Error creando tarea:', error);
      toast.error(`Error creando tarea: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadPhotosToDetailTask = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!detailTask || files.length === 0) return;

    try {
      setDetailUploading(true);
      await uploadFilesForTask(detailTask.id, files);
      toast.success('Fotos cargadas a la tarea');
      await fetchTaskPhotos();
    } catch (error) {
      console.error('Error subiendo fotos de tarea:', error);
      toast.error(`No se pudieron subir fotos: ${error.message}`);
    } finally {
      setDetailUploading(false);
      event.target.value = '';
    }
  };

  const deleteTaskPhoto = async (photo) => {
    const confirmed = window.confirm('¿Eliminar esta foto de la tarea?');
    if (!confirmed) return;

    try {
      if (photo.storage_path) {
        await supabase.storage.from('uploads').remove([photo.storage_path]);
      }

      const { error } = await supabase
        .from('task_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;
      toast.success('Foto eliminada');
      await fetchTaskPhotos();
    } catch (error) {
      console.error('Error eliminando foto:', error);
      toast.error(`No se pudo eliminar foto: ${error.message}`);
    }
  };

  const updateTaskStatus = async (task, status) => {
    try {
      const payload = {
        status,
        completed_at: status === 'COMPLETADA' ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', task.id);

      if (error) throw error;

      const shouldCreateNext = status === 'COMPLETADA' && (task.recurrence_type || 'NONE') !== 'NONE';

      if (shouldCreateNext) {
        const currentDueDate = parseDbDate(task.due_date);
        const nextDueDate = getNextDueDateByRecurrence(currentDueDate, task.recurrence_type);

        if (nextDueDate) {
          const { data: nextTask, error: nextTaskError } = await supabase
            .from('tasks')
            .insert([
              {
                title: task.title,
                description: task.description || null,
                assigned_to: task.assigned_to,
                due_date: nextDueDate.toISOString(),
                task_kind: task.task_kind || 'GENERAL',
                recurrence_type: task.recurrence_type || 'NONE',
                reminder_days_before: Array.isArray(task.reminder_days_before) ? task.reminder_days_before : null,
                payment_amount: task.payment_amount || null,
                source_task_id: task.id,
                priority: task.priority,
                status: 'PENDIENTE',
                created_by: currentUser?.id || task.created_by,
              },
            ])
            .select('id')
            .single();

          if (nextTaskError) throw nextTaskError;

          const assigneeIds = (assigneeIdsByTask.get(task.id) || (task.assigned_to ? [task.assigned_to] : []))
            .map(Number)
            .filter((value) => Number.isFinite(value));

          if (assigneeIds.length > 0) {
            const assigneeRows = [...new Set(assigneeIds)].map((userId) => ({ task_id: nextTask.id, user_id: userId }));
            const { error: assigneesError } = await supabase
              .from('task_assignees')
              .insert(assigneeRows);

            if (assigneesError) throw assigneesError;
          }

          const channels = ['in_app', 'email'];
          const reminderPayloads = buildReminderPayloads({
            taskId: nextTask.id,
            dueDate: nextDueDate,
            channels,
            taskKind: task.task_kind || 'GENERAL',
            recurrenceType: task.recurrence_type || 'NONE',
            reminderDaysBefore: task.reminder_days_before,
            reminderHoursBefore: 24,
            repeatEveryHours: 24,
          });

          if (reminderPayloads.length > 0) {
            const { error: remindersError } = await supabase
              .from('task_reminders')
              .insert(reminderPayloads);

            if (remindersError) throw remindersError;
          }
        }
      }

      toast.success('Estado actualizado');
      await Promise.all([fetchTasks(), fetchTaskAssignees(), fetchReminders()]);
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      toast.error(`Error actualizando estado: ${error.message}`);
    }
  };

  const openEditTask = (task) => {
    const existingReminder = reminders
      .filter((reminder) => reminder.task_id === task.id)
      .sort((a, b) => (parseDbDate(b.created_at)?.getTime() || 0) - (parseDbDate(a.created_at)?.getTime() || 0))[0] || null;

    const assigneeIds = (assigneeIdsByTask.get(task.id) || (task.assigned_to ? [task.assigned_to] : [])).map(String);

    setEditModal({
      taskId: task.id,
      title: task.title || '',
      description: task.description || '',
      due_date: formatDateForInput(task.due_date),
      assigned_to: assigneeIds,
      reminderEveryHours: String(existingReminder?.repeat_every_hours || 24),
      reminderId: existingReminder?.id || null,
      reminderChannels: existingReminder?.channels || ['in_app', 'email'],
    });
  };

  const saveEditedTask = async (event) => {
    event.preventDefault();
    if (!editModal) return;

    const trimmedTitle = editModal.title?.trim();
    if (!trimmedTitle) {
      toast.error('El título es obligatorio');
      return;
    }

    const dueDate = editModal.due_date ? new Date(editModal.due_date) : null;
    if (editModal.due_date && dueDate && Number.isNaN(dueDate.getTime())) {
      toast.error('Fecha límite inválida');
      return;
    }

    const parsedAssigneeIds = [...new Set(
      (editModal.assigned_to || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && usersById.has(value))
    )];

    if (parsedAssigneeIds.length === 0) {
      toast.error('Debe seleccionar al menos un responsable');
      return;
    }

    const parsedEveryHours = Number(editModal.reminderEveryHours);
    if (!Number.isFinite(parsedEveryHours) || parsedEveryHours <= 0) {
      toast.error('La frecuencia debe ser mayor que 0 horas');
      return;
    }

    const now = Date.now();
    const nextByCadence = now + parsedEveryHours * 60 * 60 * 1000;
    const dueMs = dueDate ? dueDate.getTime() : Number.MAX_SAFE_INTEGER;
    const nextReminderAtMs = dueDate ? (dueMs > now ? Math.min(dueMs, nextByCadence) : now + 60 * 1000) : nextByCadence;
    const nextReminderAtIso = new Date(nextReminderAtMs).toISOString();

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: trimmedTitle,
          description: editModal.description?.trim() || null,
          assigned_to: parsedAssigneeIds[0],
          due_date: dueDate ? dueDate.toISOString() : null,
        })
        .eq('id', editModal.taskId);

      if (error) throw error;

      const { error: deleteAssigneesError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', editModal.taskId);

      if (deleteAssigneesError) throw deleteAssigneesError;

      const assigneeRows = parsedAssigneeIds.map((userId) => ({ task_id: editModal.taskId, user_id: userId }));
      const { error: insertAssigneesError } = await supabase
        .from('task_assignees')
        .insert(assigneeRows);

      if (insertAssigneesError) throw insertAssigneesError;

      if (editModal.reminderId) {
        const { error: updateReminderError } = await supabase
          .from('task_reminders')
          .update({
            repeat_every_hours: parsedEveryHours,
            remind_at: nextReminderAtIso,
            sent_at: null,
            in_app_sent: false,
            email_queued: false,
            processed_by: null,
          })
          .eq('id', editModal.reminderId);

        if (updateReminderError) throw updateReminderError;
      } else {
        const { error: insertReminderError } = await supabase
          .from('task_reminders')
          .insert([
            {
              task_id: editModal.taskId,
              remind_at: nextReminderAtIso,
              repeat_every_hours: parsedEveryHours,
              channels: editModal.reminderChannels,
            },
          ]);

        if (insertReminderError) throw insertReminderError;
      }

      await notifyTaskAssignment({
        taskId: editModal.taskId,
        title: trimmedTitle,
        assigneeIds: parsedAssigneeIds,
        dueDate: dueDate ? dueDate.toISOString() : null,
        channels: editModal.reminderChannels,
      });

      toast.success('Tarea actualizada');
      setEditModal(null);
      await Promise.all([fetchTasks(), fetchTaskAssignees(), fetchReminders()]);
    } catch (error) {
      console.error('Error editando tarea:', error);
      toast.error(`Error editando tarea: ${error.message}`);
    }
  };

  const deleteTask = async (taskId) => {
    const confirmed = window.confirm('¿Eliminar esta tarea? También se eliminarán sus recordatorios.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Tarea eliminada');
      await Promise.all([fetchTasks(), fetchTaskAssignees(), fetchReminders()]);
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      toast.error(`Error eliminando tarea: ${error.message}`);
    }
  };

  if (!isAdminGlobal) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          Este módulo es exclusivo para ADMIN_GLOBAL.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="text-indigo-600" size={26} />
            Tareas y Recordatorios
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Seguimiento de tareas con avisos en la app y cola de correo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadInitialData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Recargar
          </button>
          <button
            type="button"
            onClick={processReminders}
            disabled={processingReminders}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Mail size={16} />
            {processingReminders ? 'Procesando...' : 'Procesar recordatorios'}
          </button>
          <button
            type="button"
            onClick={processAllPendingNow}
            disabled={bulkSending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Send size={16} />
            {bulkSending ? 'Enviando...' : 'Enviar pendientes ahora'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm inline-flex gap-2">
        <button
          type="button"
          onClick={() => setActivePage('CREATE')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
            activePage === 'CREATE'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Crear tarea
        </button>
        <button
          type="button"
          onClick={() => setActivePage('LIST')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
            activePage === 'LIST'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Listado y recordatorios
        </button>
      </div>

      {activePage === 'CREATE' && (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-green-600" />
          Nueva tarea
        </h3>

        <form onSubmit={createTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla rápida (opcional)</label>
              <select
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar plantilla...</option>
                {TASK_TEMPLATES.map((template) => (
                  <option key={template.key} value={template.key}>{template.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={applyTemplate}
              disabled={!selectedTemplate}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              Aplicar plantilla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ej: Validar compras de marzo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
              <input
                type="text"
                value={assigneeSearch}
                onChange={(event) => setAssigneeSearch(event.target.value)}
                placeholder="Buscar responsable..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
              />
              <div className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm max-h-[160px] overflow-y-auto space-y-2">
                {users
                  .filter((user) => {
                    const search = assigneeSearch.trim().toLowerCase();
                    if (!search) return true;
                    const label = (user.nombre || user.nombre_usuario || `Usuario ${user.id}`).toLowerCase();
                    return label.includes(search);
                  })
                  .map((user) => {
                  const userId = String(user.id);
                  const checked = (form.assigned_to || []).map(String).includes(userId);

                  return (
                    <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setForm((prev) => {
                            const currentIds = (prev.assigned_to || []).map(String);
                            const nextIds = currentIds.includes(userId)
                              ? currentIds.filter((id) => id !== userId)
                              : [...currentIds, userId];

                            return { ...prev, assigned_to: nextIds };
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{user.nombre || user.nombre_usuario || `Usuario ${user.id}`}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Selecciona uno o varios responsables.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Opcional para seguimiento periódico. Se muestra en hora local del navegador.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="BAJA">BAJA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="ALTA">ALTA</option>
                <option value="CRITICA">CRÍTICA</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de tarea</label>
              <select
                value={form.task_kind}
                onChange={(event) => setForm((prev) => ({ ...prev, task_kind: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="GENERAL">GENERAL</option>
                <option value="PAGO_TARJETA">PAGO TARJETA</option>
                <option value="PAGO_PRESTAMO">PAGO PRÉSTAMO</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrencia</label>
              <select
                value={form.recurrence_type}
                onChange={(event) => setForm((prev) => ({ ...prev, recurrence_type: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="NONE">Sin recurrencia</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
          </div>

          {form.task_kind !== 'GENERAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (opcional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.payment_amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, payment_amount: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recordar días antes</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REMINDER_DAYS.map((days) => {
                    const active = (form.reminderDaysBefore || []).includes(days);
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setForm((prev) => {
                            const current = prev.reminderDaysBefore || [];
                            const next = current.includes(days)
                              ? current.filter((value) => value !== days)
                              : [...current, days].sort((first, second) => second - first);
                            return { ...prev, reminderDaysBefore: next };
                          });
                        }}
                        className={`text-xs px-2 py-1 rounded-full border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {days === 0 ? 'Mismo día' : `${days} días`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Detalle de la tarea"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fotografías (opcional)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setNewTaskFiles(Array.from(event.target.files || []))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {newTaskFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{newTaskFiles.length} foto(s) seleccionada(s)</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas antes del aviso</label>
              <input
                type="number"
                min="0"
                value={form.reminderHoursBefore}
                onChange={(event) => setForm((prev) => ({ ...prev, reminderHoursBefore: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia (cada cuántas horas)</label>
              <input
                type="number"
                min="1"
                value={form.reminderEveryHours}
                onChange={(event) => setForm((prev) => ({ ...prev, reminderEveryHours: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_REMINDER_HOURS.map((hours) => {
                  const active = Number(form.reminderEveryHours) === hours;
                  return (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, reminderEveryHours: String(hours) }))}
                      className={`text-xs px-2 py-1 rounded-full border transition ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {hours}h
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-6 md:mt-0">
              <input
                type="checkbox"
                checked={form.reminderInApp}
                onChange={(event) => setForm((prev) => ({ ...prev, reminderInApp: event.target.checked }))}
                className="rounded border-gray-300"
              />
              Recordatorio en app
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-6 md:mt-0">
              <input
                type="checkbox"
                checked={form.reminderEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, reminderEmail: event.target.checked }))}
                className="rounded border-gray-300"
              />
              Recordatorio por correo
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            <Plus size={16} />
            {submitting ? 'Creando...' : 'Crear tarea'}
          </button>
        </form>
      </div>
      )}

      {activePage === 'LIST' && (
      <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock3 size={18} className="text-blue-600" />
            Listado de tareas
          </h3>

          <div className="flex items-center gap-2 text-sm">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1"
            >
              <option value="ALL">Todas</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="EN_PROGRESO">En progreso</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_TASK_FILTERS.map((filterKey) => {
            const active = quickTaskFilter === filterKey;
            const labels = {
              TODAS: 'Todas',
              VENCIDAS: 'Vencidas',
              VENCEN_HOY: 'Vencen hoy',
              SIN_FOTO: 'Sin foto',
            };

            return (
              <button
                key={filterKey}
                type="button"
                onClick={() => setQuickTaskFilter(filterKey)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {labels[filterKey]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Cargando tareas...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-sm text-gray-500">No hay tareas para este filtro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b border-gray-200">
                  <th className="py-2 pr-3">Título</th>
                  <th className="py-2 pr-3">Responsable</th>
                  <th className="py-2 pr-3">Vence</th>
                  <th className="py-2 pr-3">Prioridad</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const assigneeIds = assigneeIdsByTask.get(task.id) || (task.assigned_to ? [task.assigned_to] : []);
                  const assigneeNames = assigneeIds
                    .map((id) => usersById.get(id)?.nombre || usersById.get(id)?.nombre_usuario || `Usuario ${id}`)
                    .filter(Boolean);
                  const photosCount = taskPhotos.filter((photo) => photo.task_id === task.id).length;
                  const dueDateParsed = parseDbDate(task.due_date);
                  const dueLabel = dueDateParsed ? dueDateParsed.toLocaleString() : '-';
                  const pendingReminder = reminders.find((reminder) => reminder.task_id === task.id && !reminder.sent_at);

                  return (
                    <tr key={task.id} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => setDetailTask(task)}
                          className="font-medium text-gray-900 hover:text-blue-700 text-left"
                        >
                          {task.title}
                        </button>
                        {task.description && (
                          <div className="text-gray-500 text-xs mt-1 max-w-[420px]">{task.description}</div>
                        )}
                        {task.task_kind && task.task_kind !== 'GENERAL' && (
                          <div className="text-xs text-indigo-700 mt-1 font-medium">
                            {task.task_kind === 'PAGO_TARJETA' ? '💳 Pago de tarjeta' : '🏦 Pago de préstamo'}
                            {task.payment_amount ? ` · RD$ ${Number(task.payment_amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                            {task.recurrence_type && task.recurrence_type !== 'NONE' ? ` · ${task.recurrence_type}` : ''}
                          </div>
                        )}
                        {photosCount > 0 && (
                          <div className="text-xs text-blue-600 mt-1">📷 {photosCount} foto(s)</div>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-gray-700">
                        {assigneeNames.length > 0 ? assigneeNames.join(', ') : '-'}
                      </td>
                      <td className="py-3 pr-3 text-gray-700">{dueLabel}</td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          {task.status !== 'COMPLETADA' ? (
                            <button
                              type="button"
                              onClick={() => updateTaskStatus(task, 'COMPLETADA')}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                            >
                              <CheckCircle2 size={14} />
                              Completar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateTaskStatus(task, 'EN_PROGRESO')}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                            >
                              Reabrir
                            </button>
                          )}
                          {task.status !== 'COMPLETADA' && task.status !== 'CANCELADA' && (
                            <button
                              type="button"
                              onClick={() => sendReminderNow(task)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            >
                              <Send size={14} />
                              Recordar ahora
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditTask(task)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-50 text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil size={14} />
                            Editar tarea
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                            Eliminar tarea
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailTask(task)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <Eye size={14} />
                            Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recordatorios pendientes</h3>
        {reminders.filter((reminder) => !reminder.sent_at).length === 0 ? (
          <div className="text-sm text-gray-500">No hay recordatorios pendientes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b border-gray-200">
                  <th className="py-2 pr-3">Tarea</th>
                  <th className="py-2 pr-3">Programado</th>
                  <th className="py-2 pr-3">Canales</th>
                  <th className="py-2 pr-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reminders
                  .filter((reminder) => !reminder.sent_at)
                  .map((reminder) => {
                    const task = tasks.find((item) => item.id === reminder.task_id);
                    return (
                      <tr key={reminder.id} className="border-b border-gray-100">
                        <td className="py-3 pr-3 text-gray-800">{task?.title || `Tarea #${reminder.task_id}`}</td>
                        <td className="py-3 pr-3 text-gray-700">
                          {parseDbDate(reminder.remind_at)?.toLocaleString() || '-'}
                        </td>
                        <td className="py-3 pr-3 text-gray-700">
                          {(reminder.channels || []).join(', ')}
                          {reminder.repeat_every_hours ? ` · cada ${reminder.repeat_every_hours}h` : ''}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => task && sendReminderNow(task)}
                              disabled={!task}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                            >
                              <Send size={14} />
                              Enviar ahora
                            </button>
                            <button
                              type="button"
                              onClick={() => editReminder(reminder)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-50 text-slate-700 hover:bg-slate-100"
                            >
                              <Pencil size={14} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => snoozeReminder(reminder, 1)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              +1h
                            </button>
                            <button
                              type="button"
                              onClick={() => snoozeReminder(reminder, 4)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              +4h
                            </button>
                            <button
                              type="button"
                              onClick={() => snoozeReminder(reminder, 24)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              +24h
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteReminder(reminder.id)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {detailTask && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setDetailTask(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Detalle de tarea</h3>
              <button type="button" onClick={() => setDetailTask(null)} className="p-2 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[75vh]">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{detailTask.title}</h4>
                <p className="text-gray-600 mt-1">{detailTask.description || 'Sin descripción'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Prioridad</div>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeClass(detailTask.priority)}`}>
                      {detailTask.priority}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Vence</div>
                  <div className="font-semibold text-gray-800">{parseDbDate(detailTask.due_date)?.toLocaleString() || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Responsables</div>
                  <div className="font-semibold text-gray-800">
                    {(assigneeIdsByTask.get(detailTask.id) || (detailTask.assigned_to ? [detailTask.assigned_to] : []))
                      .map((id) => usersById.get(id)?.nombre || usersById.get(id)?.nombre_usuario || `Usuario ${id}`)
                      .join(', ') || '-'}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h5 className="font-semibold text-gray-900">Fotos</h5>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm cursor-pointer hover:bg-indigo-700">
                    <ImagePlus size={16} />
                    {detailUploading ? 'Subiendo...' : 'Añadir fotos'}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotosToDetailTask} disabled={detailUploading} />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {taskPhotos.filter((photo) => photo.task_id === detailTask.id).length === 0 ? (
                    <div className="text-sm text-gray-500 col-span-full">No hay fotos en esta tarea.</div>
                  ) : (
                    taskPhotos
                      .filter((photo) => photo.task_id === detailTask.id)
                      .map((photo) => (
                        <div key={photo.id} className="border rounded-lg p-2 bg-gray-50">
                          <a href={photo.url} target="_blank" rel="noreferrer">
                            <img src={photo.url} alt={photo.file_name || 'foto tarea'} className="w-full h-24 object-cover rounded" />
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteTaskPhoto(photo)}
                            className="mt-2 w-full inline-flex items-center justify-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={13} />
                            Eliminar foto
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Editar tarea</h3>
              <button type="button" onClick={() => setEditModal(null)} className="p-2 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEditedTask} className="p-4 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={editModal.title}
                    onChange={(event) => setEditModal((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
                  <input
                    type="datetime-local"
                    value={editModal.due_date}
                    onChange={(event) => setEditModal((prev) => ({ ...prev, due_date: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={editModal.description}
                  onChange={(event) => setEditModal((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsables</label>
                <input
                  type="text"
                  value={editAssigneeSearch}
                  onChange={(event) => setEditAssigneeSearch(event.target.value)}
                  placeholder="Buscar responsable..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
                />
                <div className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm max-h-[180px] overflow-y-auto space-y-2">
                  {users
                    .filter((user) => {
                      const search = editAssigneeSearch.trim().toLowerCase();
                      if (!search) return true;
                      const label = (user.nombre || user.nombre_usuario || `Usuario ${user.id}`).toLowerCase();
                      return label.includes(search);
                    })
                    .map((user) => {
                    const userId = String(user.id);
                    const checked = (editModal.assigned_to || []).includes(userId);
                    return (
                      <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setEditModal((prev) => {
                              const currentIds = prev.assigned_to || [];
                              const nextIds = currentIds.includes(userId)
                                ? currentIds.filter((id) => id !== userId)
                                : [...currentIds, userId];
                              return { ...prev, assigned_to: nextIds };
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{user.nombre || user.nombre_usuario || `Usuario ${user.id}`}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia (cada cuántas horas)</label>
                <input
                  type="number"
                  min="1"
                  value={editModal.reminderEveryHours}
                  onChange={(event) => setEditModal((prev) => ({ ...prev, reminderEveryHours: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_REMINDER_HOURS.map((hours) => {
                    const active = Number(editModal.reminderEveryHours) === hours;
                    return (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setEditModal((prev) => ({ ...prev, reminderEveryHours: String(hours) }))}
                        className={`text-xs px-2 py-1 rounded-full border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {hours}h
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setEditModal(null)} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

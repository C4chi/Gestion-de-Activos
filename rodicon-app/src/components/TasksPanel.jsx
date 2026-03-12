import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, CheckCircle2, Clock3, Filter, Mail, Pencil, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const DEFAULT_FORM = {
  title: '',
  description: '',
  assigned_to: '',
  due_date: '',
  priority: 'MEDIA',
  status: 'PENDIENTE',
  reminderHoursBefore: 24,
  reminderInApp: true,
  reminderEmail: true,
};

export default function TasksPanel({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingReminders, setProcessingReminders] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [form, setForm] = useState(DEFAULT_FORM);

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
      .select('id,title,description,assigned_to,due_date,priority,status,created_by,completed_at,created_at,updated_at')
      .order('due_date', { ascending: true })
      .limit(200);

    if (error) throw error;

    setTasks(data || []);
  }, []);

  const fetchReminders = useCallback(async () => {
    const { data, error } = await supabase
      .from('task_reminders')
      .select('id,task_id,remind_at,channels,sent_at,in_app_sent,email_queued,attempts,created_at')
      .order('remind_at', { ascending: true })
      .limit(400);

    if (error) throw error;
    setReminders(data || []);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchTasks(), fetchReminders()]);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      toast.error(`Error cargando tareas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [fetchReminders, fetchTasks, fetchUsers]);

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
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  const filteredTasks = useMemo(() => {
    if (filterStatus === 'ALL') return tasks;
    return tasks.filter((task) => task.status === filterStatus);
  }, [tasks, filterStatus]);

  const resetForm = () => setForm(DEFAULT_FORM);

  const createTask = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    if (!form.assigned_to) {
      toast.error('Debe seleccionar un responsable');
      return;
    }

    if (!form.due_date) {
      toast.error('Debe seleccionar fecha y hora límite');
      return;
    }

    const dueDate = new Date(form.due_date);
    if (Number.isNaN(dueDate.getTime())) {
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

    const hoursBefore = Number(form.reminderHoursBefore);
    const safeHoursBefore = Number.isFinite(hoursBefore) && hoursBefore >= 0 ? hoursBefore : 24;
    const remindAt = new Date(dueDate.getTime() - safeHoursBefore * 60 * 60 * 1000);

    try {
      setSubmitting(true);

      const taskPayload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        assigned_to: Number(form.assigned_to),
        due_date: dueDate.toISOString(),
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

      const reminderPayload = {
        task_id: taskData.id,
        remind_at: remindAt.toISOString(),
        channels,
      };

      const { error: reminderError } = await supabase
        .from('task_reminders')
        .insert([reminderPayload]);

      if (reminderError) throw reminderError;

      toast.success('Tarea creada correctamente');
      resetForm();
      await fetchTasks();
      await processReminders();
    } catch (error) {
      console.error('Error creando tarea:', error);
      toast.error(`Error creando tarea: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const payload = {
        status,
        completed_at: status === 'COMPLETADA' ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Estado actualizado');
      await fetchTasks();
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      toast.error(`Error actualizando estado: ${error.message}`);
    }
  };

  const editTask = async (task) => {
    const newTitle = window.prompt('Título de la tarea', task.title || '');
    if (!newTitle) return;

    const currentDue = formatDateForInput(task.due_date);
    const newDueInput = window.prompt('Fecha límite (YYYY-MM-DDTHH:mm)', currentDue);
    if (!newDueInput) return;

    const newDescription = window.prompt('Descripción', task.description || '') || null;

    const dueDate = new Date(newDueInput);
    if (Number.isNaN(dueDate.getTime())) {
      toast.error('Fecha límite inválida');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: newTitle.trim(),
          description: newDescription,
          due_date: dueDate.toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      toast.success('Tarea actualizada');
      await fetchTasks();
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
      await Promise.all([fetchTasks(), fetchReminders()]);
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

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-green-600" />
          Nueva tarea
        </h3>

        <form onSubmit={createTask} className="space-y-4">
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
              <select
                value={form.assigned_to}
                onChange={(event) => setForm((prev) => ({ ...prev, assigned_to: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Seleccione usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nombre || user.nombre_usuario || `Usuario ${user.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
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
          </div>

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
                  const assignee = usersById.get(task.assigned_to);
                  const dueLabel = task.due_date
                    ? new Date(task.due_date).toLocaleString()
                    : '-';
                  const pendingReminder = reminders.find((reminder) => reminder.task_id === task.id && !reminder.sent_at);

                  return (
                    <tr key={task.id} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-gray-500 text-xs mt-1 max-w-[420px]">{task.description}</div>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-gray-700">
                        {assignee?.nombre || assignee?.nombre_usuario || `Usuario ${task.assigned_to}`}
                      </td>
                      <td className="py-3 pr-3 text-gray-700">{dueLabel}</td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
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
                              onClick={() => updateTaskStatus(task.id, 'COMPLETADA')}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                            >
                              <CheckCircle2 size={14} />
                              Completar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateTaskStatus(task.id, 'EN_PROGRESO')}
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
                            onClick={() => editTask(task)}
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
                          {reminder.remind_at ? new Date(reminder.remind_at).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 pr-3 text-gray-700">{(reminder.channels || []).join(', ')}</td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
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
    </div>
  );
}

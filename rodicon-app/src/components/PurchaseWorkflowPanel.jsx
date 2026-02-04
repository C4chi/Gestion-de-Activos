import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatUtils';
import { formatDate } from '../utils/dateUtils';
import { useAppContext } from '../AppContext';
import { 
  getActiveWorkflow, 
  getApprovalHistory, 
  approvePurchaseAtLevel, 
  rejectPurchaseAtLevel,
  getNextApprovalLevel,
  canUserApproveLevel,
} from '../services/workflowService';
import toast from 'react-hot-toast';

/**
 * Componente de Workflow Visual para Purchase Orders
 * Muestra el progreso de aprobaciones multi-nivel
 */
const PurchaseWorkflowPanel = ({ purchase, onUpdate }) => {
  const { user } = useAppContext();
  const [workflow, setWorkflow] = useState(null);
  const [history, setHistory] = useState([]);
  const [nextLevel, setNextLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'

  useEffect(() => {
    loadWorkflowData();
  }, [purchase.id]);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      // Obtener workflow activo
      const { data: wf } = await getActiveWorkflow('PURCHASE_ORDER');
      setWorkflow(wf);

      // Obtener historial de aprobaciones
      const { data: hist } = await getApprovalHistory('PURCHASE_ORDER', purchase.id);
      setHistory(hist || []);

      // Obtener siguiente nivel
      const { data: next } = await getNextApprovalLevel(purchase.id);
      setNextLevel(next);
    } catch (error) {
      console.error('Error loading workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    setActionType('approve');
    setShowCommentModal(true);
  };

  const handleReject = () => {
    setActionType('reject');
    setShowCommentModal(true);
  };

  const submitAction = async () => {
    if (!nextLevel) return;

    const currentLevel = nextLevel.level;

    try {
      if (actionType === 'approve') {
        const { error } = await approvePurchaseAtLevel(
          purchase.id,
          currentLevel,
          user.id,
          user.nombre,
          comment || null
        );

        if (error) throw error;
        toast.success(`✅ Nivel ${currentLevel} aprobado`);
      } else {
        if (!comment.trim()) {
          toast.error('Debes proporcionar un motivo para rechazar');
          return;
        }

        const { error } = await rejectPurchaseAtLevel(
          purchase.id,
          currentLevel,
          user.id,
          user.nombre,
          comment
        );

        if (error) throw error;
        toast.success('❌ Orden de compra rechazada');
      }

      setShowCommentModal(false);
      setComment('');
      onUpdate && onUpdate();
      loadWorkflowData();
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast.error('Error al procesar aprobación');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">⚠️ No se encontró workflow configurado</p>
      </div>
    );
  }

  const levels = Array.isArray(workflow.levels) ? workflow.levels : JSON.parse(workflow.levels);
  const currentLevelNumber = purchase.nivel_aprobacion_actual || 0;
  const canApprove = nextLevel && canUserApproveLevel(workflow, nextLevel.level, user.rol);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          📋 Workflow de Aprobación
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          purchase.estado === 'RECHAZADO' ? 'bg-red-100 text-red-800' :
          purchase.estado === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {purchase.estado}
        </span>
      </div>

      {/* Stepper visual */}
      <div className="mb-6">
        <div className="flex items-center justify-between relative">
          {/* Línea de conexión */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0"></div>
          <div 
            className="absolute top-5 left-0 h-1 bg-blue-500 z-0 transition-all duration-500"
            style={{ width: `${(currentLevelNumber / levels.length) * 100}%` }}
          ></div>

          {/* Steps */}
          {levels.map((level, index) => {
            const isCompleted = currentLevelNumber >= level.level;
            const isCurrent = currentLevelNumber + 1 === level.level;
            const approval = history.find(h => h.level === level.level);

            return (
              <div key={level.level} className="flex flex-col items-center z-10 relative">
                {/* Círculo */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-100' :
                    'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? '✓' : level.level}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    isCompleted ? 'text-green-600' :
                    isCurrent ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {level.name}
                  </p>
                  {approval && (
                    <p className="text-xs text-gray-500 mt-1">
                      {approval.approver_name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Información del nivel actual */}
      {nextLevel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-900 mb-2">
            📌 Nivel Actual: {nextLevel.name}
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            {nextLevel.description}
          </p>
          <p className="text-xs text-blue-600">
            Roles autorizados: {nextLevel.roles.join(', ')}
          </p>
        </div>
      )}

      {/* Historial de aprobaciones */}
      {history.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center">
            <span className="mr-2">📜</span>
            Historial de Aprobaciones
          </h4>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${
                  item.action === 'APPROVED' ? 'bg-green-50 border-green-200' :
                  item.action === 'REJECTED' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {item.action === 'APPROVED' ? '✅ Aprobado' : 
                       item.action === 'REJECTED' ? '❌ Rechazado' : 
                       '⏳ Pendiente'} - {item.level_name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Por: {item.approver_name} • {formatDate(item.created_at, true)}
                    </p>
                    {item.comments && (
                      <p className="text-sm text-gray-700 mt-2 italic">
                        "{item.comments}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      {canApprove && purchase.estado !== 'RECHAZADO' && purchase.estado !== 'COMPLETADO' && (
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleApprove}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            ✅ Aprobar
          </button>
          <button
            onClick={handleReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            ❌ Rechazar
          </button>
        </div>
      )}

      {!canApprove && nextLevel && purchase.estado !== 'RECHAZADO' && purchase.estado !== 'COMPLETADO' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⚠️ No tienes permisos para aprobar en este nivel. Requiere rol: {nextLevel.roles.join(', ')}
        </div>
      )}

      {/* Modal de comentarios */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {actionType === 'approve' ? '✅ Aprobar' : '❌ Rechazar'} Orden
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {actionType === 'approve' 
                  ? 'Puedes agregar comentarios opcionales sobre esta aprobación.'
                  : 'Debes proporcionar un motivo para el rechazo.'}
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={actionType === 'approve' ? 'Comentarios (opcional)' : 'Motivo del rechazo (requerido)'}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                required={actionType === 'reject'}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setComment('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitAction}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    actionType === 'approve'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseWorkflowPanel;

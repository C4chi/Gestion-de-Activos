/**
 * useFormValidation.js
 * Hook reutilizable para validar formularios en toda la app
 * Evita duplicación de lógica de validación
 */

import { useState, useCallback } from 'react';

export const useFormValidation = (initialValues, onSubmit, validateFn) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: fieldValue
    }));
    
    // Limpiar error del campo cuando se empieza a editar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validar campo individual si existe validateFn
    if (validateFn) {
      const fieldError = validateFn(name, values[name]);
      if (fieldError) {
        setErrors(prev => ({
          ...prev,
          [name]: fieldError
        }));
      }
    }
  }, [values, validateFn]);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Validar todos los campos antes de enviar
    let newErrors = {};
    if (validateFn) {
      Object.keys(values).forEach(fieldName => {
        const error = validateFn(fieldName, values[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
        }
      });
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
        setValues(initialValues);
        setTouched({});
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, initialValues, onSubmit, validateFn]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError
  };
};

// Validadores comunes reutilizables
export const validators = {
  required: (value, fieldName = 'Campo') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} es requerido`;
    }
    return '';
  },

  minLength: (value, min, fieldName = 'Campo') => {
    if (value && value.length < min) {
      return `${fieldName} debe tener al menos ${min} caracteres`;
    }
    return '';
  },

  maxLength: (value, max, fieldName = 'Campo') => {
    if (value && value.length > max) {
      return `${fieldName} no puede exceder ${max} caracteres`;
    }
    return '';
  },

  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return 'Email inválido';
    }
    return '';
  },

  numeric: (value, fieldName = 'Campo') => {
    if (value && isNaN(value)) {
      return `${fieldName} debe ser un número`;
    }
    return '';
  },

  positiveNumber: (value, fieldName = 'Campo') => {
    if (value && (isNaN(value) || Number(value) < 0)) {
      return `${fieldName} debe ser un número positivo`;
    }
    return '';
  },

  url: (value) => {
    try {
      if (value) new URL(value);
    } catch {
      return 'URL inválida';
    }
    return '';
  }
};

// Composición de validadores
export const createValidator = (rules) => {
  return (fieldName, value) => {
    const fieldRules = rules[fieldName];
    if (!fieldRules) return '';

    for (let rule of fieldRules) {
      const error = rule(value);
      if (error) return error;
    }
    return '';
  };
};

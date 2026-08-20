import { useState, useCallback } from "react";

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validate?: (values: T) => ValidationErrors<T> | null;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (validate) {
        const currentErrors = validate(next) || {};
        setErrors(currentErrors);
      }
      return next;
    });
  }, [validate]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      
      const validationErrors = validate ? validate(values) : null;
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        const allTouched = Object.keys(values).reduce((acc, k) => {
          acc[k as keyof T] = true;
          return acc;
        }, {} as Record<keyof T, boolean>);
        setTouched(allTouched);
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    setValues,
    errors,
    setErrors,
    touched,
    isSubmitting,
    setFieldValue,
    handleBlur,
    handleSubmit,
    resetForm,
  };
}

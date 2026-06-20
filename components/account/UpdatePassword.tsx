import { useFormik } from 'formik';
import { useTranslation } from 'next-i18next';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Eye, EyeOff } from 'lucide-react';

import { defaultHeaders, passwordPolicies } from '@/lib/common';
import { maxLengthPolicies } from '@/lib/common';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const schema = Yup.object().shape({
  currentPassword: Yup.string().required().max(maxLengthPolicies.password),
  newPassword: Yup.string()
    .required()
    .min(passwordPolicies.minLength)
    .max(maxLengthPolicies.password),
});

const UpdatePassword = () => {
  const { t } = useTranslation('common');
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);

  const formik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      const response = await fetch('/api/password', {
        method: 'PUT',
        headers: defaultHeaders,
        body: JSON.stringify(values),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      toast.success(t('successfully-updated'));
      formik.resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="space-y-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-1">
            {t('password')}
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            {t('change-password-text')}
          </p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel
              htmlFor="currentPassword"
              className="font-mono text-xs uppercase tracking-wider"
            >
              {t('current-password')}
            </FieldLabel>
            <div className="relative">
              <Input
                id="currentPassword"
                type={isCurrentPasswordVisible ? 'text' : 'password'}
                name="currentPassword"
                placeholder={t('current-password')}
                value={formik.values.currentPassword}
                onChange={formik.handleChange}
                className={cn(
                  'font-mono text-sm pr-10',
                  formik.touched.currentPassword &&
                    formik.errors.currentPassword &&
                    'border-destructive'
                )}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setIsCurrentPasswordVisible(!isCurrentPasswordVisible)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isCurrentPasswordVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {formik.touched.currentPassword &&
              formik.errors.currentPassword && (
                <FieldDescription className="text-destructive font-mono text-xs">
                  {formik.errors.currentPassword}
                </FieldDescription>
              )}
          </Field>

          <Field>
            <FieldLabel
              htmlFor="newPassword"
              className="font-mono text-xs uppercase tracking-wider"
            >
              {t('new-password')}
            </FieldLabel>
            <div className="relative">
              <Input
                id="newPassword"
                type={isNewPasswordVisible ? 'text' : 'password'}
                name="newPassword"
                placeholder={t('new-password')}
                value={formik.values.newPassword}
                onChange={formik.handleChange}
                className={cn(
                  'font-mono text-sm pr-10',
                  formik.touched.newPassword &&
                    formik.errors.newPassword &&
                    'border-destructive'
                )}
                required
              />
              <button
                type="button"
                onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isNewPasswordVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {formik.touched.newPassword && formik.errors.newPassword && (
              <FieldDescription className="text-destructive font-mono text-xs">
                {formik.errors.newPassword}
              </FieldDescription>
            )}
            <FieldDescription className="font-mono text-xs">
              {t('password-must-be-at-least') || 'Must be at least'}{' '}
              {passwordPolicies.minLength}{' '}
              {t('characters-long') || 'characters long'}.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!formik.dirty || !formik.isValid || formik.isSubmitting}
            className="font-mono text-xs uppercase tracking-wider"
          >
            {formik.isSubmitting
              ? t('loading') || 'Loading...'
              : t('change-password')}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UpdatePassword;

import { useFormik } from 'formik';
import toast from 'react-hot-toast';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

import type { ApiResponse } from 'types';
import { defaultHeaders } from '@/lib/common';
import type { User } from '@prisma/client';
import { updateAccountSchema } from '@/lib/zod';
import { cn } from '@/lib/utils';

interface UpdateEmailProps {
  user: Partial<User>;
  allowEmailChange: boolean;
}

const UpdateEmail = ({ user, allowEmailChange }: UpdateEmailProps) => {
  const { t } = useTranslation('common');

  const formik = useFormik({
    initialValues: {
      email: user.email,
    },
    validateOnBlur: false,
    enableReinitialize: true,
    validate: (values) => {
      try {
        updateAccountSchema.parse(values);
      } catch (error: any) {
        return error.formErrors.fieldErrors;
      }
    },
    onSubmit: async (values) => {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: defaultHeaders,
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiResponse;
        toast.error(json.error.message);
        return;
      }

      toast.success(t('successfully-updated'));
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="space-y-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-1">
            {t('email-address')}
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            {t('email-address-description')}
          </p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email" className="font-mono text-xs uppercase tracking-wider">
              {t('email-address')}
            </FieldLabel>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder={t('your-email')}
              value={formik.values.email}
              onChange={formik.handleChange}
              className={cn(
                "font-mono text-sm",
                formik.touched.email && formik.errors.email && "border-destructive"
              )}
              required
              disabled={!allowEmailChange}
            />
            {formik.touched.email && formik.errors.email && (
              <FieldDescription className="text-destructive font-mono text-xs">
                {formik.errors.email}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!formik.dirty || !formik.isValid || formik.isSubmitting || !allowEmailChange}
            className="font-mono text-xs uppercase tracking-wider"
          >
            {formik.isSubmitting ? t('loading') || 'Loading...' : t('save-changes')}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UpdateEmail;

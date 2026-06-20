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
import { User } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { updateAccountSchema } from '@/lib/zod';
import { cn } from '@/lib/utils';

const UpdateName = ({ user }: { user: Partial<User> }) => {
  const { t } = useTranslation('common');
  const { update } = useSession();
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      name: user.name,
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

      await update({
        name: values.name,
      });

      router.replace('/settings/account');
      toast.success(t('successfully-updated'));
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="space-y-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-1">
            {t('name')}
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            {t('name-appearance')}
          </p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel
              htmlFor="name"
              className="font-mono text-xs uppercase tracking-wider"
            >
              {t('name')}
            </FieldLabel>
            <Input
              id="name"
              type="text"
              name="name"
              placeholder={t('your-name')}
              value={formik.values.name}
              onChange={formik.handleChange}
              className={cn(
                'font-mono text-sm',
                formik.touched.name &&
                  formik.errors.name &&
                  'border-destructive'
              )}
              required
            />
            {formik.touched.name && formik.errors.name && (
              <FieldDescription className="text-destructive font-mono text-xs">
                {formik.errors.name}
              </FieldDescription>
            )}
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
              : t('save-changes')}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UpdateName;

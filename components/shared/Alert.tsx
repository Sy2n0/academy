import React from 'react';
import { Alert as AlertComponent } from '@/components/ui/alert';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  status?: 'error' | 'success' | 'warning' | 'info';
}

const Alert = (props: AlertProps) => {
  const { children, className, variant, status, ...rest } = props;
  const resolvedVariant =
    variant ?? (status === 'error' ? 'destructive' : 'default');

  return (
    <AlertComponent
      variant={resolvedVariant}
      {...rest}
      className={`${className} rounded px-4 py-3`}
    >
      {children}
    </AlertComponent>
  );
};

export default Alert;

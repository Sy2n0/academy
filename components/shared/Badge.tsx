import { Badge as BaseBadge } from '@/components/ui/badge';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

const Badge = (props: BadgeProps) => {
  const { children, className, color, variant, ...rest } = props;
  
  const badgeVariant = variant || (color === 'error' ? 'destructive' : 'default');

  return (
    <BaseBadge
      variant={badgeVariant}
      {...rest}
      className={`rounded text-xs py-2 text-white ${className || ''}`}
    >
      {children}
    </BaseBadge>
  );
};

export default Badge;

import { Input } from '@/components/ui/input';
import { InputHTMLAttributes } from 'react';

interface InputWithLabelProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'color'
> {
  label: string | React.ReactNode;
  error?: string;
  descriptionText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'ghost'
    | 'link'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';
}

const InputWithLabel = (props: InputWithLabelProps) => {
  const { label, error, descriptionText, size, color, ...rest } = props;

  const classes = ['text-sm'];

  if (error) {
    classes.push('input-error');
  }

  return (
    <div className="form-control w-full">
      {typeof label === 'string' ? (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      ) : (
        label
      )}
      <Input className={classes.join(' ')} {...rest} />
      {(error || descriptionText) && (
        <label className="label">
          <span className={`label-text-alt ${error ? 'text-red-500' : ''}`}>
            {error || descriptionText}
          </span>
        </label>
      )}
    </div>
  );
};

export default InputWithLabel;

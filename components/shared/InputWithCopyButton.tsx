import { Input } from '@/components/ui/input';
import { InputHTMLAttributes } from 'react';

import { CopyToClipboardButton } from '@/components/shared';

interface InputWithCopyButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'color'> {
  label: string;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'link' | 'info' | 'success' | 'warning' | 'error';
}

const InputWithCopyButton = (props: InputWithCopyButtonProps) => {
  const { label, value, description, size, color, ...rest } = props;

  const id = label.replace(/ /g, '');

  return (
    <div className="form-control w-full">
      <div className="flex justify-between items-center">
        <label className="label pl-0" htmlFor={id}>
          <span className="label-text">{label}</span>
        </label>
        <CopyToClipboardButton value={value?.toString() || ''} />
      </div>
      <Input
        id={id}
        className="input input-bordered w-full text-sm"
        {...rest}
        value={value}
      />
      {description && (
        <label className="label">
          <span className="label-text-alt">{description}</span>
        </label>
      )}
    </div>
  );
};

export default InputWithCopyButton;

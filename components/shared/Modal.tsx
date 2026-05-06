import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  close: () => void;
  children: React.ReactNode;
}

interface BodyProps {
  children: React.ReactNode;
  className?: string;
}

const Modal = ({ open, close, children }: ModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent className="dark:border dark:border-gray-100">
        {children}
      </DialogContent>
    </Dialog>
  );
};

const Header = ({ children }: { children: React.ReactNode }) => {
  return <DialogHeader><DialogTitle>{children}</DialogTitle></DialogHeader>;
};

const Description = ({ children }: { children: React.ReactNode }) => {
  return <DialogDescription className="pt-1">{children}</DialogDescription>;
};

const Body = ({ children, className }: BodyProps) => {
  return <div className={cn("py-3", className)}>{children}</div>;
};

const Footer = ({ children }: { children: React.ReactNode }) => {
  return <DialogFooter className="flex justify-end gap-2">{children}</DialogFooter>;
};

Modal.Header = Header;
Modal.Description = Description;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;

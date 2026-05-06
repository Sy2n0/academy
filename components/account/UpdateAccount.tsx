import type { User } from '@prisma/client';
import UploadAvatar from './UploadAvatar';
import UpdateName from './UpdateName';
import UpdateEmail from './UpdateEmail';
import UpdateTheme from './UpdateTheme';
import env from '@/lib/env';
import { Separator } from '@/components/ui/separator';

interface UpdateAccountProps {
  user: Partial<User>;
  allowEmailChange: boolean;
}

const UpdateAccount = ({ user, allowEmailChange }: UpdateAccountProps) => {
  return (
    <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-6 md:p-8">
      <div className="space-y-8">
        <UpdateName user={user} />
        <Separator className="bg-border/30" />
        <UpdateEmail user={user} allowEmailChange={allowEmailChange} />
        <Separator className="bg-border/30" />
        <UploadAvatar user={user} />
        {env.darkModeEnabled && (
          <>
            <Separator className="bg-border/30" />
            <UpdateTheme />
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateAccount;

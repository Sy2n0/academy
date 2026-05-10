/* eslint-disable i18next/no-literal-string */
import toast from 'react-hot-toast';
import { useTranslation } from 'next-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

import type { ApiResponse } from 'types';
import type { User } from '@prisma/client';
import { defaultHeaders } from '@/lib/common';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const UploadAvatar = ({ user }: { user: Partial<User> }) => {
  const { t } = useTranslation('common');
  const { update } = useSession();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [image, setImage] = useState<string | null>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setImage(
      user.image ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`
    );
  }, [user]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files && e.dataTransfer.files[0];

    if (file) {
      onAvatarUpload(file);
    }
  };

  const onChangePicture = useCallback((e) => {
    const file = e.target.files[0];

    if (file) {
      onAvatarUpload(file);
    }
  }, []);

  const onAvatarUpload = (file: File) => {
    if (file.size / 1024 / 1024 > 2) {
      toast.error('File size too big (max 2MB)');
      return;
    }

    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      toast.error('File type not supported (.png or .jpg only)');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify({ image }),
    });

    setLoading(false);

    if (!response.ok) {
      const json = (await response.json()) as ApiResponse;
      toast.error(json.error.message);
      return;
    }

    // 세션 업데이트하여 sidebar와 landing page에 반영
    await update({
      image: image as string,
    });

    toast.success(t('successfully-updated'));
    
    // 페이지 새로고침하여 모든 컴포넌트에 반영 (세션 콜백에서 DB에서 최신 정보를 가져오므로 반영됨)
    router.replace(router.asPath);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-foreground mb-1">
            {t('avatar')}
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            {t('custom-avatar')} {t('avatar-type')}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <label
            htmlFor="image"
            className="group relative flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-full border border-border transition-all hover:border-accent"
          >
            <div
              className="absolute z-[5] h-full w-full rounded-full"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={onDrop}
            />
            <div
              className={cn(
                "absolute z-[3] flex h-full w-full flex-col items-center justify-center rounded-full transition-all",
                dragActive
                  ? 'cursor-copy border-2 border-accent bg-accent/10 opacity-100'
                  : '',
                image
                  ? 'opacity-0 group-hover:opacity-100 bg-background/80'
                  : 'bg-muted group-hover:bg-muted/80'
              )}
            >
              <Upload
                className={cn(
                  "h-6 w-6 text-muted-foreground transition-all duration-75",
                  dragActive ? 'scale-110 text-accent' : 'group-hover:scale-110 group-active:scale-95'
                )}
              />
            </div>
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={user.name}
                className="h-full w-full rounded-full object-cover"
              />
            )}
          </label>
          <div className="flex-1">
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onChangePicture}
            />
            <p className="font-mono text-xs text-muted-foreground">
              Drag and drop an image or click to upload
            </p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              PNG or JPG, max 2MB
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={(!image || image === user.image) || loading}
            className="font-mono text-xs uppercase tracking-wider"
          >
            {loading ? t('loading') || 'Loading...' : t('save-changes')}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UploadAvatar;

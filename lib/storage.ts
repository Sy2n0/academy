import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import path from 'path';

// S3 클라이언트 초기화
let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) {
    return s3Client;
  }

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT; // MinIO endpoint
  const region = process.env.S3_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    return null; // S3 설정이 없으면 null 반환
  }

  s3Client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true, // MinIO 호환
  });

  return s3Client;
}

const createdBuckets = new Set<string>();

async function ensureBucketExists(
  client: S3Client,
  bucket: string
): Promise<void> {
  if (createdBuckets.has(bucket)) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (e: any) {
      if (
        e?.name !== 'BucketAlreadyExists' &&
        e?.Code !== 'BucketAlreadyOwnedByYou'
      )
        throw e;
    }
  }
  createdBuckets.add(bucket);
}

/**
 * 파일을 객체 스토리지에 업로드
 */
export async function uploadFile(
  bucket: string,
  key: string,
  filePath: string | Buffer,
  contentType?: string
): Promise<string> {
  const client = getS3Client();

  if (!client) {
    // S3가 없으면 로컬 디스크에 저장
    return await uploadToLocalDisk(key, filePath);
  }

  await ensureBucketExists(client, bucket);

  const fileBuffer =
    typeof filePath === 'string' ? await fs.readFile(filePath) : filePath;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await client.send(command);
  return key;
}

/**
 * 파일을 로컬 디스크에 저장
 */
async function uploadToLocalDisk(
  key: string,
  filePath: string | Buffer
): Promise<string> {
  const storageDir = process.env.LOCAL_STORAGE_DIR || './storage';
  await fs.mkdir(storageDir, { recursive: true });

  const fullPath = path.join(storageDir, key);
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });

  if (typeof filePath === 'string') {
    await fs.copyFile(filePath, fullPath);
  } else {
    await fs.writeFile(fullPath, filePath);
  }

  return key;
}

/**
 * Presigned URL 생성 시 사용할 클라이언트 (브라우저에서 열 수 있도록 공개 주소 사용)
 */
function getSigningClient(): S3Client | null {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicEndpoint =
    process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || 'us-east-1';
  if (!accessKeyId || !secretAccessKey || !publicEndpoint) return null;
  return new S3Client({
    region,
    endpoint: publicEndpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export type GetFileUrlOptions = {
  expiresIn?: number;
  /** 다운로드 시 브라우저에 보일 파일명. 지정 시 S3 응답에 Content-Disposition: attachment 적용 */
  downloadFilename?: string;
};

/**
 * 파일 다운로드 URL 생성 (서명된 URL)
 * downloadFilename 지정 시 presigned URL로 접근해도 브라우저가 다운로드로 처리함
 */
export async function getFileUrl(
  bucket: string,
  key: string,
  options: number | GetFileUrlOptions = 3600
): Promise<string> {
  const opts =
    typeof options === 'number'
      ? { expiresIn: options }
      : { expiresIn: 3600, ...options };
  const client = getS3Client();

  if (!client) {
    return `/api/storage/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(opts.downloadFilename != null && {
      ResponseContentDisposition: `attachment; filename="${opts.downloadFilename.replace(/"/g, '\\"')}"`,
    }),
  });

  const signingClient = getSigningClient() ?? client;
  const url = await getSignedUrl(signingClient, command, {
    expiresIn: opts.expiresIn,
  });
  return url;
}

const toBuffer = async (body: any): Promise<Buffer> => {
  if (body == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<
    Uint8Array | Buffer | string
  >) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
      continue;
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export async function downloadFile(
  bucket: string,
  key: string
): Promise<Buffer> {
  const client = getS3Client();

  if (!client) {
    const storageDir = process.env.LOCAL_STORAGE_DIR || './storage';
    const filePath = path.join(storageDir, key);
    return await fs.readFile(filePath);
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);
  return await toBuffer((response as any).Body);
}

/**
 * 파일 삭제
 */
export async function deleteFile(bucket: string, key: string): Promise<void> {
  const client = getS3Client();

  if (!client) {
    // 로컬 스토리지인 경우
    const storageDir = process.env.LOCAL_STORAGE_DIR || './storage';
    const filePath = path.join(storageDir, key);
    await fs.unlink(filePath).catch(() => {
      // 파일이 없으면 무시
    });
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Machine 첨부 파일 업로드
 */
export async function uploadMachineAttachment(
  machineId: string,
  filePath: string | Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  const key = `machines/${machineId}/attachments/${fileName}`;
  const bucket = process.env.S3_BUCKET || 'hub-academy';

  return await uploadFile(bucket, key, filePath, contentType);
}

/**
 * Writeup 파일 업로드
 */
export async function uploadWriteupFile(
  writeupId: string,
  filePath: string | Buffer,
  fileName: string
): Promise<string> {
  const key = `writeups/${writeupId}/${fileName}`;
  const bucket = process.env.S3_BUCKET || 'hub-academy';
  return await uploadFile(bucket, key, filePath, 'application/octet-stream');
}

export async function uploadAssignmentSubmissionFile(
  assignmentId: string,
  userId: string,
  filePath: string | Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  const safeName =
    fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
  const key = `assignments/submissions/${assignmentId}/${userId}/${Date.now()}-${safeName}`;
  const bucket = process.env.S3_BUCKET || 'hub-academy';
  await uploadFile(
    bucket,
    key,
    filePath,
    contentType ?? 'application/octet-stream'
  );
  if (!getS3Client()) return `/api/storage/${key}`;
  return await getFileUrl(bucket, key, { downloadFilename: safeName });
}

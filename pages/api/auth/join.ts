import { hashPassword } from '@/lib/auth';
import { slugify } from '@/lib/server-common';
import { isEmailAllowed } from '@/lib/email/utils';
import { ApiError } from '@/lib/errors';
import { createTeam, getTeam, isTeamExists } from 'models/team';
import { createUser, getUser } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import { getInvitation, isInvitationExpired } from 'models/invitation';
import { validateRecaptcha } from '@/lib/recaptcha';
import { Team } from '@prisma/client';
import { userJoinSchema, validateWithSchema } from '@/lib/zod';

// TODO:
// Add zod schema validation

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    // 상세한 에러 로깅 (파일로도 저장)
    const errorDetails = {
      message: error.message,
      status: error.status,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    };

    console.error('=== Join API Error ===');
    console.error(JSON.stringify(errorDetails, null, 2));
    console.error('========================');

    // 응답이 이미 전송되었는지 확인
    if (!res.headersSent) {
      // 클라이언트에 상세 에러 정보 전달 (개발 환경에서만)
      res.status(status).json({
        error: {
          message,
          ...(process.env.NODE_ENV === 'development'
            ? { details: errorDetails }
            : {}),
        },
      });
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
}

// Signup the user
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name, password, team, inviteToken, recaptchaToken } = req.body;

  await validateRecaptcha(recaptchaToken);

  const invitation = inviteToken
    ? await getInvitation({ token: inviteToken })
    : null;

  let email: string = req.body.email;

  // When join via invitation
  if (invitation) {
    if (await isInvitationExpired(invitation.expires)) {
      throw new ApiError(400, 'Invitation expired. Please request a new one.');
    }

    if (invitation.sentViaEmail) {
      email = invitation.email!;
    }
  }

  validateWithSchema(userJoinSchema, {
    name,
    email,
    password,
  });

  if (!isEmailAllowed(email)) {
    throw new ApiError(
      400,
      `We currently only accept work email addresses for sign-up. Please use your work email to create an account. If you don't have a work email, feel free to contact our support team for assistance.`
    );
  }

  if (await getUser({ email })) {
    throw new ApiError(400, 'An user with this email already exists.');
  }

  // Check if team name is available
  if (!invitation) {
    if (!team) {
      throw new ApiError(400, 'A team name is required.');
    }

    const slug = slugify(team);

    validateWithSchema(userJoinSchema, { team, slug });

    const slugCollisions = await isTeamExists(slug);

    if (slugCollisions > 0) {
      throw new ApiError(400, 'A team with this slug already exists.');
    }
  }

  const user = await createUser({
    name,
    email,
    password: await hashPassword(password),
    emailVerified: new Date(), // 이메일 인증 없이 바로 인증된 것으로 처리
  });

  let userTeam: Team | null = null;

  // Create team if user is not invited
  // So we can create the team with the user as the owner
  try {
    if (!invitation) {
      userTeam = await createTeam({
        userId: user.id,
        name: team,
        slug: slugify(team),
      });
      console.log('Team created:', userTeam?.name);
    } else {
      userTeam = await getTeam({ slug: invitation.team.slug });
      console.log('Team retrieved:', userTeam?.name);
    }
  } catch (teamError) {
    console.error('Team creation/retrieval error:', teamError);
    // 팀 생성 실패해도 사용자는 생성되었으므로 계속 진행
  }

  // 메트릭 기록 (OpenTelemetry를 통해 외부 엔드포인트로 전송, 환경 변수가 설정되어 있지 않으면 기록되지 않음)
  // recordMetric('user.signup');

  // 응답 전송 (가입 성공)
  console.log('Sending success response for user:', user.email);
  try {
    if (res.headersSent) {
      console.error('Response headers already sent!');
      return;
    }

    res.status(201).json({
      data: {
        confirmEmail: false, // 이메일 인증 없이 바로 로그인 가능
      },
    });
    console.log('Success response sent for user:', user.email);
  } catch (error) {
    console.error('Error sending response:', error);
    console.error(
      'Error details:',
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    // 응답 전송 실패해도 가입은 완료되었으므로 에러만 로깅
  }
};

import { jwtDecode } from 'jwt-decode';
import { z } from 'zod';

// JWT Claims schema
const JwtClaims = z.object({
  sub: z.string(),
  org_id: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()).optional(),
  exp: z.number(),
});

type JwtClaims = z.infer<typeof JwtClaims>;

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = 'UNAUTHORIZED'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function validateAuth(authToken: string): Promise<JwtClaims> {
  if (!authToken.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authToken.split(' ')[1];

  try {
    const claims = jwtDecode<JwtClaims>(token);
    const result = JwtClaims.safeParse(claims);

    if (!result.success) {
      throw new AuthError('Invalid token claims');
    }

    // Validate token expiration
    if (result.data.exp * 1000 < Date.now()) {
      throw new AuthError('Token has expired');
    }

    return result.data;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Invalid token');
  }
}

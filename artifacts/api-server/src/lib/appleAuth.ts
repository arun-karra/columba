import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");
const appleJwks = createRemoteJWKSet(APPLE_JWKS_URL);

function getAppleAudience() {
  return process.env.APPLE_BUNDLE_ID ?? "com.columba.notes";
}

export type AppleIdentityTokenPayload = JWTPayload & {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
};

export async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<AppleIdentityTokenPayload> {
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience: getAppleAudience(),
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Apple identity token is missing a subject.");
  }

  return payload as AppleIdentityTokenPayload;
}

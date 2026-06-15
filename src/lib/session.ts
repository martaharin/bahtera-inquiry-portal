import { SignJWT, jwtVerify } from "jose";

const secretKey = new TextEncoder().encode(
  process.env.SESSION_SECRET
);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secretKey);
}

export async function decrypt(session: string) {
  const { payload } = await jwtVerify(
    session,
    secretKey,
    {
      algorithms: ["HS256"],
    }
  );

  return payload;
}
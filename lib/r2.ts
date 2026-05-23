import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `https://pub-yourpublichash.r2.dev/${key}`; // your public R2 URL
}

// # API for when a user uploads a profile picture
// import { uploadFile } from '@/lib/r2';

// export async function POST(req: Request) {
//   const formData = await req.formData();
//   const file = formData.get('file') as File;
//   const buffer = Buffer.from(await file.arrayBuffer());

//   const url = await uploadFile(`avatars/${Date.now()}-${file.name}`, buffer, file.type);

//   save url to DB
//   await sql`UPDATE admins SET profile_pic = ${url} WHERE id = ${adminId}`;

//   return Response.json({ url });
// }

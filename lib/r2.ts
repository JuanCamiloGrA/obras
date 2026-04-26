import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl || !endpoint) {
    throw new Error(
      "Faltan variables de entorno para R2: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME y R2_PUBLIC_BASE_URL.",
    );
  }

  return {
    bucket,
    endpoint,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
    accessKeyId,
    secretAccessKey,
  };
}

let cachedClient: S3Client | null = null;
let cachedEndpoint = "";
let cachedAccessKey = "";

function getR2Client() {
  const config = getR2Config();

  if (
    !cachedClient ||
    cachedEndpoint !== config.endpoint ||
    cachedAccessKey !== config.accessKeyId
  ) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedEndpoint = config.endpoint;
    cachedAccessKey = config.accessKeyId;
  }

  return cachedClient;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType?: string;
  cacheControl?: string;
}) {
  const config = getR2Config();
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl,
    }),
  );

  return {
    url: `${config.publicBaseUrl}/${params.key}`,
  };
}

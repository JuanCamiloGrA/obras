type D1Primitive = string | number | null;

type D1Meta = {
  changes?: number;
  last_row_id?: number | string | null;
};

type D1Result<T> = {
  meta?: D1Meta;
  results: T[];
  success: boolean;
};

type D1Response<T> = {
  errors?: Array<{ message?: string }>;
  result?: Array<D1Result<T>>;
  success?: boolean;
};

function getConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      "Faltan variables de entorno para D1: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID y CLOUDFLARE_D1_API_TOKEN.",
    );
  }

  return {
    endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    apiToken,
  };
}

async function requestD1<T>(sql: string, params: D1Primitive[] = []) {
  const { endpoint, apiToken } = getConfig();

  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ sql, params }),
  });

  const payload = (await response.json()) as D1Response<T>;
  const result = payload.result?.[0];

  if (!response.ok || !payload.success || !result?.success) {
    const errorMessage = payload.errors?.map((item) => item.message).filter(Boolean).join(" | ");
    throw new Error(errorMessage || "D1 devolvió un error al ejecutar SQL.");
  }

  return result;
}

export async function d1Query<T>(sql: string, params: D1Primitive[] = []) {
  const result = await requestD1<T>(sql, params);
  return result.results;
}

export async function d1First<T>(sql: string, params: D1Primitive[] = []) {
  const rows = await d1Query<T>(sql, params);
  return rows[0] ?? null;
}

export async function d1Execute(sql: string, params: D1Primitive[] = []) {
  const result = await requestD1(sql, params);
  return result.meta ?? {};
}

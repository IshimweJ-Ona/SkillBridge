// One-time setup: turns a subscription key into the API user + API key
// mtn-momo.provider.ts needs for its Bearer token exchange (see getAccessToken).
// Usage: node backend/scripts/momo-provision-sandbox.js
// Requires MOMO_BASE_URL, MOMO_CALLBACK_HOST and the two MOMO_*_SUBSCRIPTION_KEY
// values to already be filled in in backend/.env. Safe to re-run - products
// that already have an API_USER + API_KEY are skipped.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ENV_PATH = path.join(__dirname, '..', '.env');

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return values;
}

function setEnvValue(text, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (!pattern.test(text)) {
    throw new Error(`${key} line not found in backend/.env - was the MOMO_* block edited?`);
  }
  return text.replace(pattern, `${key}=${value}`);
}

async function provisionProduct(baseUrl, callbackHost, subscriptionKey, label) {
  const apiUser = crypto.randomUUID();
  const providerCallbackHost = callbackHost.replace(/^https?:\/\//, '');

  const createUserRes = await fetch(`${baseUrl}/apiuser`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Reference-Id': apiUser,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
    body: JSON.stringify({ providerCallbackHost }),
  });

  if (createUserRes.status !== 201) {
    throw new Error(
      `${label}: POST /v1_0/apiuser failed with status ${createUserRes.status} - ${await createUserRes.text()}`,
    );
  }

  const createKeyRes = await fetch(`${baseUrl}/apiuser/${apiUser}/apikey`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey },
  });

  if (!createKeyRes.ok) {
    throw new Error(
      `${label}: POST /v1_0/apiuser/{id}/apikey failed with status ${createKeyRes.status} - ${await createKeyRes.text()}`,
    );
  }

  const { apiKey } = await createKeyRes.json();
  if (!apiKey) {
    throw new Error(`${label}: apikey response did not contain an apiKey field.`);
  }

  return { apiUser, apiKey };
}

async function main() {
  let envText = fs.readFileSync(ENV_PATH, 'utf8');
  const env = parseEnv(envText);

  const baseUrl = (env.MOMO_BASE_URL || '').replace(/\/+$/, '');
  const callbackHost = env.MOMO_CALLBACK_HOST || '';

  if (!baseUrl || !callbackHost) {
    throw new Error('MOMO_BASE_URL and MOMO_CALLBACK_HOST must be set in backend/.env first.');
  }

  const products = [
    {
      label: 'collection',
      subKeyVar: 'MOMO_COLLECTION_SUBSCRIPTION_KEY',
      userVar: 'MOMO_COLLECTION_API_USER',
      keyVar: 'MOMO_COLLECTION_API_KEY',
    },
    {
      label: 'disbursement',
      subKeyVar: 'MOMO_DISBURSEMENT_SUBSCRIPTION_KEY',
      userVar: 'MOMO_DISBURSEMENT_API_USER',
      keyVar: 'MOMO_DISBURSEMENT_API_KEY',
    },
  ];

  for (const product of products) {
    const subscriptionKey = env[product.subKeyVar];
    if (!subscriptionKey) {
      console.log(`Skipping ${product.label}: ${product.subKeyVar} is empty in backend/.env.`);
      continue;
    }

    if (env[product.userVar] && env[product.keyVar]) {
      console.log(`Skipping ${product.label}: already has an API user + API key.`);
      continue;
    }

    console.log(`Provisioning ${product.label}...`);
    const { apiUser, apiKey } = await provisionProduct(
      baseUrl,
      callbackHost,
      subscriptionKey,
      product.label,
    );

    envText = setEnvValue(envText, product.userVar, apiUser);
    envText = setEnvValue(envText, product.keyVar, apiKey);
    fs.writeFileSync(ENV_PATH, envText);

    console.log(`${product.label}: wrote ${product.userVar} and ${product.keyVar} to backend/.env.`);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

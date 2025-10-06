import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import 'dotenv/config';

export async function loadSecrets() {
  const region = process.env.AWS_REGION || 'sa-east-1';
  const client = new SecretsManagerClient({ region });

  try {
    const command = new GetSecretValueCommand({ SecretId: 'meuapp/env' });
    const response = await client.send(command);

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      Object.entries(secrets).forEach(([key, value]) => {
        process.env[key] = value;
      });
      console.log('Segredos carregados do AWS Secrets Manager ✅');
    }
  } catch (err) {
    console.warn('Não foi possível carregar secrets do AWS Secrets Manager, usando .env', err.message);
  }
}

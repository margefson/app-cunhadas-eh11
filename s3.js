// s3.js
import AWS from "aws-sdk";

// Configuração do S3 usando variáveis de ambiente já carregadas pelo app.js
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

// Função para enviar arquivo para S3
export async function uploadToS3(file) {
  if (!file) return null;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    //ACL: "public-read" // para a imagem ficar acessível publicamente ❌ causa AccessControlListNotSupported
  };

  try {
    const data = await s3.upload(params).promise();
    return data.Location; // URL pública da imagem
  } catch (err) {
    console.error("❌ Erro ao enviar para S3:", err);
    throw err;
  }
}

// Exporta o objeto S3 caso precise
export function initS3() {
  return s3;
}

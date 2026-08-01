import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Infraestructura de plataforma -- ver docs/adr/0010-almacenamiento-de-contenido.md.
 * Interfaz mínima y deliberadamente estrecha: Education (cuando exista) o
 * cualquier otro dominio consumidor nunca debe importar un tipo del SDK de
 * AWS/S3 -- solo estos tres métodos. Habla el protocolo S3-compatible
 * (MinIO en dev/CI hoy; Cloudflare R2 el día que se aprovisione, sin
 * cambios de código).
 *
 * Bucket, endpoint y credenciales son enteramente configurables por
 * entorno -- nada fijo en código.
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private bucketEnsured = false;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('OBJECT_STORAGE_BUCKET', 'axioma-content-dev');
    this.client = new S3Client({
      endpoint: this.config.get<string>('OBJECT_STORAGE_ENDPOINT'),
      region: this.config.get<string>('OBJECT_STORAGE_REGION', 'auto'),
      forcePathStyle: true, // requerido por MinIO; inofensivo contra R2/S3 real.
      credentials: {
        accessKeyId: this.config.get<string>('OBJECT_STORAGE_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('OBJECT_STORAGE_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  /** Idempotente: crea el bucket configurado si todavía no existe (solo relevante en dev/CI contra MinIO). */
  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" creado (no existía).`);
    }
    this.bucketEnsured = true;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: input.key, Body: input.body, ContentType: input.contentType }),
    );
  }

  /**
   * URL de lectura firmada de corta duración -- ver ADR-0010: nunca se
   * persiste (ni en BD, ni en logs, ni en disco). Se genera bajo demanda y
   * se entrega directamente a quien la solicitó.
   */
  async getSignedReadUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSeconds,
    });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

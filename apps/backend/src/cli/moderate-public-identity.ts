import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PublicIdentityModerationService } from '../user/public-identity-moderation.service';

/**
 * PS-0C.2 -- ruta de operador para moderación de identidades públicas
 * (username / perfil público). DELIBERADAMENTE no es un endpoint HTTP --
 * mismo precedente que `recover-account.ts` / `create-admin-actor.ts`:
 * requiere acceso operativo al servidor + `DATABASE_URL`, nunca alcanzable
 * por una cuenta de estudiante (este archivo no importa `auth/`).
 *
 * Uso:
 *   node dist/cli/moderate-public-identity.js list
 *   node dist/cli/moderate-public-identity.js dismiss <reportId>
 *   node dist/cli/moderate-public-identity.js action-reset <reportId>
 *
 * `action-reset`:
 *   - retira el username infractor (pasa a la ventana de reserva de 30 días);
 *   - deja el perfil no-presentable hasta que el usuario reclame uno válido;
 *   - marca ACTIONED todos los reportes OPEN contra ese objetivo;
 *   - NO borra cuenta / progreso / XP / LP / participación de liga / ranking.
 *   - retry-safe: repetirlo sobre un perfil ya reseteado sólo cierra reportes.
 */
async function main() {
  const [command, arg] = process.argv.slice(2);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const service = app.get(PublicIdentityModerationService);

    if (command === 'list') {
      const reports = await service.listOpenReports();
      if (reports.length === 0) {
        console.log('No hay reportes OPEN.');
      } else {
        console.log(`${reports.length} reporte(s) OPEN:\n`);
        for (const r of reports) {
          console.log(
            `  ${r.reportId}  [${r.reportType}]  @${r.targetUsername ?? '(sin identidad pública)'}  ` +
              `creado ${r.createdAt.toISOString()}  (${r.openReportsForTarget} reporte(s) OPEN sobre este objetivo)`,
          );
        }
      }
      return;
    }

    if (command === 'dismiss') {
      if (!arg) throw new Error('Uso: dismiss <reportId>');
      await service.dismissReport(arg);
      console.log(`Reporte ${arg} descartado (DISMISSED).`);
      return;
    }

    if (command === 'action-reset') {
      if (!arg) throw new Error('Uso: action-reset <reportId>');
      const result = await service.actionReportForceReset(arg);
      console.log(
        `Identidad pública de la cuenta ${result.targetAccountId} reseteada` +
          (result.alreadyReset ? ' (ya estaba reseteada)' : ` (username anterior: @${result.previousUsername})`) +
          `. ${result.reportsActioned} reporte(s) marcado(s) ACTIONED.`,
      );
      return;
    }

    console.error('Comandos: list | dismiss <reportId> | action-reset <reportId>');
    process.exitCode = 1;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();

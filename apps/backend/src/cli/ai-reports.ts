import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AiResponseReportRepository } from '../ai/ai-response-report.repository';

/**
 * PS-0C.2 -- ruta de operador MÍNIMA para los reportes del Tutor IA
 * ("Reportar respuesta", PRD AI-015). El flujo de reporte del móvil / la
 * persistencia en `ai_response_report` ya existen y NO se tocan.
 *
 * Este CLI sólo demuestra que los reportes PUEDEN revisarse operativamente:
 *   node dist/cli/ai-reports.js list [--all]     (por defecto: sólo sin revisar)
 *   node dist/cli/ai-reports.js mark-reviewed <reportId>
 *
 * NO hay: clasificador automático, ML, reescritura de prompt, panel humano,
 * SLA, motor de escalado. "Un reporte no modifica automáticamente la
 * respuesta" (PRD AI-015) sigue siendo cierto -- `reviewedAt` es puramente
 * una marca de auditoría operativa.
 */
async function main() {
  const [command, arg] = process.argv.slice(2);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const repo = app.get(AiResponseReportRepository);

    if (command === 'list') {
      const onlyUnreviewed = arg !== '--all';
      const reports = await repo.listRecent({ onlyUnreviewed });
      if (reports.length === 0) {
        console.log(onlyUnreviewed ? 'No hay reportes sin revisar.' : 'No hay reportes.');
      } else {
        console.log(`${reports.length} reporte(s)${onlyUnreviewed ? ' sin revisar' : ''}:\n`);
        for (const r of reports) {
          const preview = r.assistantMessage.content.replace(/\s+/g, ' ').slice(0, 140);
          console.log(
            `  ${r.id}  [${r.reportType}]  ${r.createdAt.toISOString()}  ` +
              `${r.reviewedAt ? `revisado ${r.reviewedAt.toISOString()}` : 'SIN REVISAR'}\n` +
              `      conv=${r.assistantMessage.conversationId}\n` +
              `      "${preview}${r.assistantMessage.content.length > 140 ? '…' : ''}"`,
          );
        }
      }
      return;
    }

    if (command === 'mark-reviewed') {
      if (!arg) throw new Error('Uso: mark-reviewed <reportId>');
      const affected = await repo.markReviewed(arg);
      console.log(affected > 0 ? `Reporte ${arg} marcado como revisado.` : `Reporte ${arg} no existe o ya estaba revisado.`);
      return;
    }

    console.error('Comandos: list [--all] | mark-reviewed <reportId>');
    process.exitCode = 1;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();

// Gate de ADS V1 -- ADS-1B (configuracion remota de anuncios + kill switch).
// Deliberadamente SIN Postgres, SIN Docker, SIN `run-gate.ts` -- ejecutable con
// solo `tsx`, mismo criterio que `verify-entitlement-foundation-gate.ts`.
//
// Protege CONTRATO y RUNTIME REAL:
//   A. resolveAdsConfig (funcion pura) -- PREMIUM/tier desconocido -> TODO
//      apagado aunque TODAS las variables esten encendidas; FREE + maestro
//      apagado -> TODO apagado; parseo estricto de flags ("true" literal);
//      numeros acotados con defaults conservadores; sin intersticial -> 0/0.
//   B. Contrato -- toda salida cumple `adsConfigResponseSchema` (.strict());
//      un campo extra o un tipo erroneo se rechaza.
//   C. AdsConfigService (instancia real) -- FREE+enabled, FREE+disabled,
//      PREMIUM, entitlement que lanza, sin ConfigService -> siempre una config
//      valida y nunca propaga el error.
//   D. AdsConfigController -- AuthGuard, opera sobre request.accountId, solo
//      @Get, respuesta validada por el schema estricto.
//   E. Wiring -- AdsModule en app.module; importa solo infraestructura +
//      EntitlementModule; sin Prisma; sin modulo de dominio.
//   F. Sin variables de ADS en `.env.example` activas (todo comentado/apagado).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADS_CONFIG_OFF, adsConfigResponseSchema, type AdsConfigResponse } from '@axioma/contracts';
import {
  ADS_ENV_KEYS,
  DEFAULT_INTERSTITIAL_COOLDOWN_MINUTES,
  DEFAULT_INTERSTITIAL_MAX_PER_SESSION,
  resolveAdsConfig,
} from '../src/ads/ads-config';
import { AdsConfigService } from '../src/ads/ads-config.service';
import { AdsConfigController } from '../src/ads/ads-config.controller';
import type { EntitlementService } from '../src/entitlement/entitlement.service';

const ROOT = join(__dirname, '..');
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const env = (vars: Record<string, string | undefined>) => (key: string) => vars[key];
const isOff = (c: AdsConfigResponse) => JSON.stringify(c) === JSON.stringify(ADS_CONFIG_OFF);

const ALL_ON = {
  [ADS_ENV_KEYS.adsEnabled]: 'true',
  [ADS_ENV_KEYS.bannerHomeEnabled]: 'true',
  [ADS_ENV_KEYS.bannerStudyEnabled]: 'true',
  [ADS_ENV_KEYS.bannerCompeteEnabled]: 'true',
  [ADS_ENV_KEYS.interstitialCompeteEnabled]: 'true',
  [ADS_ENV_KEYS.interstitialCooldownMinutes]: '45',
  [ADS_ENV_KEYS.interstitialMaxPerSession]: '3',
};

function fakeEntitlement(behaviour: 'FREE' | 'PREMIUM' | 'throws'): EntitlementService {
  return {
    getEntitlement: async () => {
      if (behaviour === 'throws') throw new Error('entitlement backend down');
      return { tier: behaviour };
    },
  } as unknown as EntitlementService;
}
const fakeConfig = (vars: Record<string, string | undefined>) =>
  ({ get: (key: string) => vars[key] }) as unknown as import('@nestjs/config').ConfigService;

async function main() {
  console.log('--- A. resolveAdsConfig (pura): fail-closed ---');
  {
    check('ADS_CONFIG_OFF: todo en false y numeros en 0', isOff({ ...ADS_CONFIG_OFF }) && ADS_CONFIG_OFF.adsEnabled === false);
    check('PREMIUM + TODAS las variables encendidas -> TODO apagado', isOff(resolveAdsConfig('PREMIUM', env(ALL_ON))));
    check('tier desconocido ("GOLD") -> TODO apagado', isOff(resolveAdsConfig('GOLD', env(ALL_ON))));
    check('tier vacio -> TODO apagado', isOff(resolveAdsConfig('', env(ALL_ON))));
    check('FREE sin ninguna variable (default del servidor) -> TODO apagado', isOff(resolveAdsConfig('FREE', env({}))));
    check('FREE + maestro ausente pero placements encendidos -> TODO apagado', isOff(resolveAdsConfig('FREE', env({ ...ALL_ON, [ADS_ENV_KEYS.adsEnabled]: undefined }))));
    check('FREE + ADS_ENABLED=false pero placements encendidos -> TODO apagado (maestro)', isOff(resolveAdsConfig('FREE', env({ ...ALL_ON, [ADS_ENV_KEYS.adsEnabled]: 'false' }))));

    for (const bad of ['TRUE', 'True', '1', 'yes', 'on', 'enabled', '', ' ', 'truee', 'true;', 'null']) {
      check(`ADS_ENABLED=${JSON.stringify(bad)} (no literal "true") -> TODO apagado`, isOff(resolveAdsConfig('FREE', env({ ...ALL_ON, [ADS_ENV_KEYS.adsEnabled]: bad }))));
    }

    const full = resolveAdsConfig('FREE', env(ALL_ON));
    check(
      'FREE + todo encendido -> todos los flags true, cooldown 45, max 3',
      full.adsEnabled && full.bannerHomeEnabled && full.bannerStudyEnabled && full.bannerCompeteEnabled && full.interstitialCompeteEnabled && full.interstitialCooldownMinutes === 45 && full.interstitialMaxPerSession === 3,
    );
    const only = resolveAdsConfig('FREE', env({ [ADS_ENV_KEYS.adsEnabled]: 'true', [ADS_ENV_KEYS.bannerStudyEnabled]: 'true' }));
    check('FREE + maestro + SOLO banner de Estudio -> solo ese placement encendido', only.adsEnabled && only.bannerStudyEnabled && !only.bannerHomeEnabled && !only.bannerCompeteEnabled && !only.interstitialCompeteEnabled);
    check('un flag individual apagado apaga solo ese placement (kill switch por placement)', resolveAdsConfig('FREE', env({ ...ALL_ON, [ADS_ENV_KEYS.bannerHomeEnabled]: 'false' })).bannerHomeEnabled === false && resolveAdsConfig('FREE', env({ ...ALL_ON, [ADS_ENV_KEYS.bannerHomeEnabled]: 'false' })).bannerStudyEnabled === true);
    check('intersticial apagado -> cooldown y max en 0 aunque las vars existan', (() => { const c = resolveAdsConfig('FREE', env({ ...ALL_ON, [ADS_ENV_KEYS.interstitialCompeteEnabled]: 'false' })); return c.interstitialCooldownMinutes === 0 && c.interstitialMaxPerSession === 0; })());

    console.log('--- A2. numeros: estrictos, acotados, defaults conservadores ---');
    const withNums = (cd: string | undefined, mx: string | undefined) =>
      resolveAdsConfig('FREE', env({ [ADS_ENV_KEYS.adsEnabled]: 'true', [ADS_ENV_KEYS.interstitialCompeteEnabled]: 'true', [ADS_ENV_KEYS.interstitialCooldownMinutes]: cd, [ADS_ENV_KEYS.interstitialMaxPerSession]: mx }));
    const d = withNums(undefined, undefined);
    check(`ausentes -> defaults conservadores (${DEFAULT_INTERSTITIAL_COOLDOWN_MINUTES} min / ${DEFAULT_INTERSTITIAL_MAX_PER_SESSION} por sesion)`, d.interstitialCooldownMinutes === DEFAULT_INTERSTITIAL_COOLDOWN_MINUTES && d.interstitialMaxPerSession === DEFAULT_INTERSTITIAL_MAX_PER_SESSION);
    for (const bad of ['abc', '-5', '0', '1.5', '9999', '1e3', ' ', '']) {
      const c = withNums(bad, bad);
      check(`cooldown/max invalidos ${JSON.stringify(bad)} -> defaults`, c.interstitialCooldownMinutes === DEFAULT_INTERSTITIAL_COOLDOWN_MINUTES && c.interstitialMaxPerSession === DEFAULT_INTERSTITIAL_MAX_PER_SESSION);
    }
    const lim = withNums('1440', '10');
    check('limites superiores validos (1440 / 10) se respetan', lim.interstitialCooldownMinutes === 1440 && lim.interstitialMaxPerSession === 10);
    check('11 sesiones (fuera de rango) -> default', withNums('30', '11').interstitialMaxPerSession === DEFAULT_INTERSTITIAL_MAX_PER_SESSION);
  }

  console.log('--- B. contrato: schema .strict() ---');
  {
    const outputs = [resolveAdsConfig('PREMIUM', env(ALL_ON)), resolveAdsConfig('FREE', env({})), resolveAdsConfig('FREE', env(ALL_ON)), { ...ADS_CONFIG_OFF }];
    check('TODA salida cumple adsConfigResponseSchema', outputs.every((o) => adsConfigResponseSchema.safeParse(o).success));
    check('el schema rechaza un campo extra (proyeccion minima)', !adsConfigResponseSchema.safeParse({ ...ADS_CONFIG_OFF, tier: 'FREE' }).success);
    check('el schema rechaza un flag no booleano', !adsConfigResponseSchema.safeParse({ ...ADS_CONFIG_OFF, adsEnabled: 'true' }).success);
    check('el schema rechaza cooldown fuera de rango', !adsConfigResponseSchema.safeParse({ ...ADS_CONFIG_OFF, interstitialCooldownMinutes: 1441 }).success);
    check('el schema exige los 7 campos exactos', Object.keys(adsConfigResponseSchema.shape).length === 7);
    check('la salida OFF nunca expone ids de unidad de anuncio ni tier', !JSON.stringify(ADS_CONFIG_OFF).match(/ca-app-pub|tier/i));
  }

  console.log('--- C. AdsConfigService (instancia real) ---');
  {
    const run = async (kind: 'FREE' | 'PREMIUM' | 'throws', vars: Record<string, string | undefined> | null) =>
      new AdsConfigService(fakeEntitlement(kind), vars ? fakeConfig(vars) : undefined).getConfig('acc-1');
    const freeOn = await run('FREE', ALL_ON);
    check('FREE + adsEnabled=true -> elegible (adsEnabled true, placements segun vars)', freeOn.adsEnabled === true && freeOn.bannerHomeEnabled === true);
    check('FREE + adsEnabled=false -> TODO apagado (sin inicializacion)', isOff(await run('FREE', { ...ALL_ON, [ADS_ENV_KEYS.adsEnabled]: 'false' })));
    check('FREE + sin variables (default inicial del servidor) -> TODO apagado', isOff(await run('FREE', {})));
    check('PREMIUM -> TODO apagado aunque todo este encendido', isOff(await run('PREMIUM', ALL_ON)));
    check('entitlement que lanza -> TODO apagado y NO propaga el error', isOff(await run('throws', ALL_ON)));
    check('sin ConfigService -> TODO apagado', isOff(await run('FREE', null)));
    check('toda salida del servicio cumple el schema estricto', [freeOn, await run('PREMIUM', ALL_ON), await run('throws', ALL_ON)].every((o) => adsConfigResponseSchema.safeParse(o).success));
    let seenAccount = '';
    const spy = { getEntitlement: async (id: string) => ((seenAccount = id), { tier: 'FREE' as const }) } as unknown as EntitlementService;
    await new AdsConfigService(spy, fakeConfig(ALL_ON)).getConfig('acc-xyz');
    check('el servicio consulta el entitlement de la cuenta recibida', seenAccount === 'acc-xyz');
  }

  console.log('--- D. AdsConfigController ---');
  {
    const ctrlSrc = stripComments(read('src/ads/ads-config.controller.ts'));
    check("@Controller('me/ads-config')", /@Controller\('me\/ads-config'\)/.test(ctrlSrc));
    check('protegido con @UseGuards(AuthGuard)', /@UseGuards\(AuthGuard\)/.test(ctrlSrc));
    check('opera sobre request.accountId (nunca un id del cliente)', /request\.accountId/.test(ctrlSrc) && !/@Param|@Query|@Body/.test(ctrlSrc));
    check('solo un @Get (superficie de lectura)', (ctrlSrc.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).join() === '@Get(');
    check('responde via adsConfigResponseSchema.parse (strict)', /adsConfigResponseSchema\.parse\(/.test(ctrlSrc));
    const body = await new AdsConfigController({ getConfig: async (id: string) => (id === 'acc-1' ? resolveAdsConfig('FREE', env(ALL_ON)) : { ...ADS_CONFIG_OFF }) } as unknown as AdsConfigService).getAdsConfig({ accountId: 'acc-1' } as never);
    check('el controlador devuelve la config de request.accountId', body.adsEnabled === true && body.interstitialCooldownMinutes === 45);
  }

  console.log('--- E. wiring ---');
  {
    const mod = stripComments(read('src/ads/ads.module.ts'));
    check('AdsModule importa AuthModule, ConfigModule y EntitlementModule', /imports:\s*\[AuthModule,\s*ConfigModule,\s*EntitlementModule\]/.test(mod));
    check('AdsModule no importa ningun modulo de dominio ni Prisma', !/Prisma|EducationModule|ExamsModule|GamificationModule|AiModule|SubscriptionModule/.test(mod));
    const app = read('src/app.module.ts');
    check('app.module importa y registra AdsModule', /import \{ AdsModule \} from '\.\/ads\/ads\.module'/.test(app) && /\n\s+AdsModule,/.test(app));
    const svc = stripComments(read('src/ads/ads-config.service.ts'));
    check('el servicio solo depende de EntitlementService (+ ConfigService opcional)', /EntitlementService/.test(svc) && !/Prisma|Repository/.test(svc));
    check('el servicio captura el fallo y devuelve TODO apagado', /catch\s*\{[\s\S]*ADS_CONFIG_OFF/.test(svc));
  }

  console.log('--- F. .env.example: ADS apagado por defecto ---');
  {
    const envEx = read('.env.example');
    const active = envEx.split(/\r?\n/).filter((l) => /^ADS_[A-Z_]+=/.test(l));
    check('ninguna variable ADS_* esta ACTIVA en .env.example (todas comentadas)', active.length === 0);
    check('.env.example documenta las 7 variables', Object.values(ADS_ENV_KEYS).every((k) => envEx.includes(`# ${k}=`)));
  }

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) del gate ADS-1B backend FALLARON.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate ADS-1B backend (ads-config) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

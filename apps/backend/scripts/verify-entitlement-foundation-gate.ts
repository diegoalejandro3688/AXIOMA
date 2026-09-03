// Gate de PREMIUM V1 -- Capa 1 (Entitlement backend), C1.1. Deliberadamente
// SIN Postgres, SIN Docker, SIN `run-gate.ts` -- ejecutable con solo `tsx`,
// mismo criterio que `verify-free-practice-api-gate.ts` /
// `verify-premium-contract-gate.ts`.
//
// Protege CONTRATO y RUNTIME REAL (nunca texto de docstrings):
//   A. EntitlementService (instancia real) -- default FREE; forma exacta
//      { tier }; override in-memory por cuenta; limpieza; aislamiento entre
//      instancias.
//   B. AiEntitlementService como ADAPTADOR -- con un EntitlementService
//      falso: FREE -> {6,3}, PREMIUM -> {15,50}; el alias
//      setTestOnlyTierOverride delega; el servicio ya NO tiene mapa propio.
//   C. EntitlementController -- AuthGuard, opera sobre request.accountId,
//      responde solo { tier } via schema .strict(), solo @Get.
//   D. EntitlementInternalAdminController -- InternalOpsGuard,
//      rejectInProduction definido Y llamado, valida tier, exige accountId,
//      no persiste.
//   E. Wiring -- EntitlementModule exporta EntitlementService e importa solo
//      infraestructura; registrado en app.module; ai.module lo importa.
//   F. Sin regresion IA -- ai-conversation.service sigue consumiendo
//      getEntitlement().maxTurns/.dailyRequestLimit; ai-internal-admin
//      intacto (alias).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntitlementService } from '../src/entitlement/entitlement.service';
import { AiEntitlementService } from '../src/ai/ai-entitlement.service';
import { accountEntitlementResponseSchema } from '@axioma/contracts';

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

async function main() {
// --------------------------------------------------------------------------
console.log('--- A. EntitlementService (instancia real) ---');
{
  const svc = new EntitlementService();
  const a = 'acc-A-11111111';
  const b = 'acc-B-22222222';

  const def = await svc.getEntitlement(a);
  check("default -> { tier: 'FREE' }", def.tier === 'FREE');
  check('forma exacta: unica clave "tier"', JSON.stringify(Object.keys(def)) === JSON.stringify(['tier']));

  svc.setTestOnlyTierOverride(a, 'PREMIUM');
  check("override PREMIUM -> getEntitlement(a).tier === 'PREMIUM'", (await svc.getEntitlement(a)).tier === 'PREMIUM');
  check('override es por cuenta: b sigue FREE', (await svc.getEntitlement(b)).tier === 'FREE');

  svc.setTestOnlyTierOverride(a, 'FREE');
  check('override explicito a FREE se respeta', (await svc.getEntitlement(a)).tier === 'FREE');

  svc.setTestOnlyTierOverride(a, 'PREMIUM');
  svc.setTestOnlyTierOverride(a, null);
  check('override null -> vuelve al default FREE', (await svc.getEntitlement(a)).tier === 'FREE');

  const fresh = new EntitlementService();
  check('el override es in-memory por instancia (una instancia nueva no lo comparte)', (await fresh.getEntitlement(a)).tier === 'FREE');
}

// --------------------------------------------------------------------------
console.log('--- B. AiEntitlementService como adaptador delgado ---');
{
  let tierToReturn: 'FREE' | 'PREMIUM' = 'FREE';
  const delegateCalls: Array<[string, string | null]> = [];
  const fakeEntitlement = {
    async getEntitlement() {
      return { tier: tierToReturn };
    },
    setTestOnlyTierOverride(accountId: string, tier: 'FREE' | 'PREMIUM' | null) {
      delegateCalls.push([accountId, tier]);
    },
  } as unknown as EntitlementService;

  const ai = new AiEntitlementService(fakeEntitlement);

  tierToReturn = 'FREE';
  const free = await ai.getEntitlement('acc-x');
  check('FREE -> { tier:FREE, maxTurns:6, dailyRequestLimit:3 }', free.tier === 'FREE' && free.maxTurns === 6 && free.dailyRequestLimit === 3);

  tierToReturn = 'PREMIUM';
  const premium = await ai.getEntitlement('acc-x');
  check('PREMIUM -> { tier:PREMIUM, maxTurns:15, dailyRequestLimit:50 }', premium.tier === 'PREMIUM' && premium.maxTurns === 15 && premium.dailyRequestLimit === 50);

  ai.setTestOnlyTierOverride('acc-x', 'PREMIUM');
  ai.setTestOnlyTierOverride('acc-x', null);
  check('el alias setTestOnlyTierOverride DELEGA (2 llamadas registradas en el fake)', delegateCalls.length === 2 && delegateCalls[0]?.[1] === 'PREMIUM' && delegateCalls[1]?.[1] === null);

  const aiSrc = stripComments(read('src/ai/ai-entitlement.service.ts'));
  check('ai-entitlement.service ya NO define un mapa de override propio', !/new Map<|testOnlyTierOverride\s*=/.test(aiSrc));
  check('ai-entitlement.service inyecta EntitlementService en el constructor', /constructor\(\s*private readonly entitlementService: EntitlementService/.test(aiSrc));
  check('ai-entitlement.service importa EntitlementService de ../entitlement/entitlement.service', /import \{ EntitlementService \} from '\.\.\/entitlement\/entitlement\.service'/.test(aiSrc));
  check('los pares de allowance de IA siguen intactos (6/3 y 15/50)', /FREE:\s*\{\s*maxTurns:\s*6,\s*dailyRequestLimit:\s*3\s*\}/.test(aiSrc) && /PREMIUM:\s*\{\s*maxTurns:\s*15,\s*dailyRequestLimit:\s*50\s*\}/.test(aiSrc));
}

// --------------------------------------------------------------------------
console.log('--- C. EntitlementController (GET /me/entitlement) ---');
{
  const src = stripComments(read('src/entitlement/entitlement.controller.ts'));
  check("ruta = @Controller('me/entitlement') + @Get()", /@Controller\('me\/entitlement'\)/.test(src) && /@Get\(\)/.test(src));
  check('@UseGuards(AuthGuard) a nivel de clase', /@UseGuards\(AuthGuard\)/.test(src));
  check('opera sobre request.accountId (nunca un id del cliente)', /request\.accountId/.test(src) && !/@Param|@Body|@Query/.test(src));
  check('responde via accountEntitlementResponseSchema.parse({ tier: ... })', /accountEntitlementResponseSchema\.parse\(\{\s*tier:\s*entitlement\.tier\s*\}\)/.test(src));
  check('superficie de solo lectura (solo @Get, sin @Post/@Put/@Patch/@Delete)', /@Get\(/.test(src) && !/@Post\(|@Put\(|@Patch\(|@Delete\(/.test(src));

  // runtime: el schema estricto descarta cualquier extra que se intentara colar
  const parsed = accountEntitlementResponseSchema.parse({ tier: 'FREE' });
  check('el schema del contrato deja exactamente { tier }', JSON.stringify(parsed) === JSON.stringify({ tier: 'FREE' }));
  check('el schema rechaza un extra de pricing/billing', !accountEntitlementResponseSchema.safeParse({ tier: 'PREMIUM', currentPeriodEnd: 'x' }).success);
}

// --------------------------------------------------------------------------
console.log('--- D. EntitlementInternalAdminController (POST /_internal/entitlement/set-tier-override) ---');
{
  const src = stripComments(read('src/entitlement/entitlement-internal-admin.controller.ts'));
  check("ruta = @Controller('_internal/entitlement') + @Post('set-tier-override')", /@Controller\('_internal\/entitlement'\)/.test(src) && /@Post\('set-tier-override'\)/.test(src));
  check('@UseGuards(InternalOpsGuard) en el handler', /@UseGuards\(InternalOpsGuard\)/.test(src));
  check('rejectInProduction definido', /private rejectInProduction\(\): void/.test(src));
  check(
    'rejectInProduction se llama en el handler, ANTES de mutar el override',
    src.includes('this.rejectInProduction();') &&
      src.indexOf('this.rejectInProduction();') < src.indexOf('this.entitlementService.setTestOnlyTierOverride'),
  );
  check("rejectInProduction compara NODE_ENV === 'production' -> NotFoundException", /NODE_ENV'\)\s*===\s*'production'/.test(src) && /throw new NotFoundException\(\)/.test(src));
  check('exige accountId', /if \(!accountId\)/.test(src) && /VALIDATION_ERROR/.test(src));
  check("valida tier in {FREE, PREMIUM, undefined}", /tier !== undefined && tier !== 'FREE' && tier !== 'PREMIUM'/.test(src));
  check('delega en entitlementService.setTestOnlyTierOverride', /this\.entitlementService\.setTestOnlyTierOverride\(accountId,/.test(src));
  check('NO persiste (sin import de Prisma / repositorio)', !/Prisma|Repository|\.prisma\./.test(src));
}

// --------------------------------------------------------------------------
console.log('--- E. Wiring de modulos ---');
{
  const mod = stripComments(read('src/entitlement/entitlement.module.ts'));
  // C3.1/C3.2: la premisa pre-Billing "solo se consume EntitlementService y
  // no existe AccountSubscription" queda superada. C3.1 anade el repositorio
  // como provider; C3.2 lo EXPORTA para que SubscriptionModule escriba la
  // tabla que EntitlementService lee. Todo lo demas del gate se mantiene.
  check('EntitlementModule exporta EntitlementService y AccountSubscriptionRepository (C3.2)', /exports:\s*\[EntitlementService,\s*AccountSubscriptionRepository\]/.test(mod));
  check('provee EntitlementService y AccountSubscriptionRepository (C3.1)', /providers:\s*\[EntitlementService,\s*AccountSubscriptionRepository\]/.test(mod));
  check('declara ambos controllers', /controllers:\s*\[EntitlementController,\s*EntitlementInternalAdminController\]/.test(mod));
  check('importa SOLO infraestructura (AuthModule, ConfigModule, InternalOpsModule) -- ningun modulo de dominio', /imports:\s*\[AuthModule,\s*ConfigModule,\s*InternalOpsModule\]/.test(mod) && !/EducationModule|ProgressModule|ExamsModule|AiModule/.test(mod));

  const appMod = stripComments(read('src/app.module.ts'));
  check('app.module importa EntitlementModule', /import \{ EntitlementModule \} from '\.\/entitlement\/entitlement\.module'/.test(appMod) && /^\s*EntitlementModule,\s*$/m.test(appMod));
}

// --------------------------------------------------------------------------
console.log('--- F. Sin regresion en IA ---');
{
  const aiMod = stripComments(read('src/ai/ai.module.ts'));
  check('ai.module importa EntitlementModule', /import \{ EntitlementModule \} from '\.\.\/entitlement\/entitlement\.module'/.test(aiMod) && /imports:\s*\[[^\]]*EntitlementModule[^\]]*\]/.test(aiMod));

  const convSrc = stripComments(read('src/ai/ai-conversation.service.ts'));
  check('ai-conversation.service sigue llamando this.entitlementService.getEntitlement(accountId)', /this\.entitlementService\.getEntitlement\(accountId\)/.test(convSrc));
  check('ai-conversation.service sigue leyendo entitlement.maxTurns y entitlement.dailyRequestLimit', /entitlement\.maxTurns/.test(convSrc) && /entitlement\.dailyRequestLimit/.test(convSrc));
  check('ai-conversation.service sigue inyectando AiEntitlementService (no EntitlementService directo)', /private readonly entitlementService: AiEntitlementService/.test(convSrc));

  const adminSrc = stripComments(read('src/ai/ai-internal-admin.controller.ts'));
  check('ai-internal-admin sigue llamando this.entitlementService.setTestOnlyTierOverride (alias intacto)', /this\.entitlementService\.setTestOnlyTierOverride\(accountId, \(tier as AiTier\) \?\? null\)/.test(adminSrc));
  check('ai-internal-admin sigue inyectando AiEntitlementService', /private readonly entitlementService: AiEntitlementService/.test(adminSrc));
}

// --------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.error(`${failures} verificacion(es) fallaron.`);
  process.exit(1);
}
console.log('Todas las verificaciones del gate de fundacion de Entitlement (PREMIUM V1, Capa 1, C1.1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

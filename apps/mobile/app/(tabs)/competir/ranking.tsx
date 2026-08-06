import { ComingSoonPlaceholder } from '../../../components/coming-soon-placeholder';

/**
 * Sub-incremento 5.b (Ranking) todavía no construido -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md, Incremento 5. Placeholder
 * deliberado, mismo criterio que el resto del proyecto (ADR-0009): la
 * ruta existe para que el hub pueda navegar hacia "Ver ranking" desde ya
 * (5.a), pero el contenido real (`GET /user/public-profile/me/leaderboard`,
 * filas redactadas, paginación por cursor) es responsabilidad de 5.b.
 */
export default function RankingScreen() {
  return <ComingSoonPlaceholder title="Ranking" />;
}

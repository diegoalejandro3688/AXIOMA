-- PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3 (seguimiento: resubscribe).
--
-- Migración ADITIVA PURA: añade `account_subscription.resubscribed_from_purchase_token`
-- (nullable, sin índice, sin constraint). NO toca ninguna columna / índice /
-- constraint / trigger existente. NO destructiva. No requiere backfill --
-- todas las filas actuales quedan con NULL (no venían de una re-alta
-- fuera de la app).
--
-- Semántica: registra `SubscriptionPurchaseV2.outOfAppPurchaseContext.expiredPurchaseToken`
-- cuando un usuario se re-suscribe desde Google Play tras la EXPIRACIÓN TOTAL
-- de su suscripción. Es DISTINTO de `linked_purchase_token` (rotación en vivo →
-- SUPERSEDED): aquí la fila anterior se queda EXPIRED y esta columna sólo sirve
-- para atribuir la cuenta si el RTDN llega antes que el reconcile del móvil.
-- Ver docs/adr/PREMIUM-V1-LAYER-3-BILLING-ARCHITECTURE.md §D.4.

-- AlterTable
ALTER TABLE "account_subscription" ADD COLUMN "resubscribed_from_purchase_token" TEXT;

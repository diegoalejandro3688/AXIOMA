import { useCallback, useEffect, useState } from 'react';
import type { CosmeticSlotValue, ListCosmeticsResponse, OwnedCosmetic } from '@axioma/contracts';
import { listCosmetics, equipCosmetic } from '../lib/api/cosmetics';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ListCosmeticsResponse };

/**
 * PROFILE-5B / PROFILE-PERSONALIZATION-REMODEL -- controlador reutilizable de
 * cosméticos: UN solo `listCosmetics()` para toda la pantalla de
 * Personalización (las 4 tabs Avatar/Marco/Banner/Título + la vista previa
 * de identidad comparten este estado ya resuelto; cambiar de tab nunca
 * reconsulta el servidor).
 *
 * Ninguna regla de negocio cambia: mismo backend (`GET`/`PUT
 * /gamification/me/cosmetics[...]`), SIN equipamiento optimista (el estado
 * local solo se actualiza con `outcome.data`, la respuesta REAL del
 * servidor), bloqueo de doble toque POR SLOT (no global -- dos `PUT` a slots
 * distintos pueden coexistir), reconciliación completa ante 404, conservación
 * del equipamiento anterior ante 409/red.
 *
 * La presentación (grids, listas, vista previa, elementos bloqueados) vive en
 * `components/personalization/*` -- este módulo es solo fetch + estado +
 * escritura, deliberadamente libre de imports de React Native para poder
 * gatearse con `tsx` puro junto a `group-cosmetics.ts`/`equip-outcome.ts`.
 */
export function useCosmeticsController(onEquipped?: () => void) {
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [equippingSlot, setEquippingSlot] = useState<CosmeticSlotValue | null>(null);
  const [slotErrors, setSlotErrors] = useState<Partial<Record<CosmeticSlotValue, string>>>({});

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listCosmetics();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setSlotErrors({});
    setState({ status: 'ready', data: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(slot: CosmeticSlotValue, item: OwnedCosmetic) {
    // Protección contra doble toque -- un PUT ya en curso sobre ESTE slot bloquea otra selección en el mismo slot.
    if (equippingSlot !== null) return;

    setEquippingSlot(slot);
    setSlotErrors((prev) => {
      if (!(slot in prev)) return prev;
      const next = { ...prev };
      delete next[slot];
      return next;
    });

    const outcome = await equipCosmetic(slot, item.inventoryItemId);
    setEquippingSlot(null);

    if (outcome.kind === 'ok') {
      // Actualización local con la respuesta REAL del servidor -- nunca antes de recibirla.
      const equipped = outcome.data;
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', data: { ...prev.data, equipped: { ...prev.data.equipped, [slot]: equipped } } } : prev));
      onEquipped?.();
      return;
    }

    if (outcome.kind === 'reload') {
      // 404 -- perfil inexistente o inventario desactualizado: reconciliar recargando todo, no adivinar.
      await load();
      onEquipped?.();
      return;
    }

    // 409 (conflicto: ya no disponible o slot equivocado) o error de red/servidor -- conservar el equipamiento anterior.
    setSlotErrors((prev) => ({ ...prev, [slot]: outcome.message }));
  }

  return { state, equippingSlot, slotErrors, load, handleSelect };
}

export type CosmeticsController = ReturnType<typeof useCosmeticsController>;

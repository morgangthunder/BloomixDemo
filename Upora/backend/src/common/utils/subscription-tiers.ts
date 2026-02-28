const TIER_HIERARCHY: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };

export function hasRequiredTier(userTier: string | null, requiredTier: string | null): boolean {
  if (!requiredTier) return true;
  const userLevel = TIER_HIERARCHY[userTier || 'free'] ?? 0;
  const requiredLevel = TIER_HIERARCHY[requiredTier] ?? 0;
  return userLevel >= requiredLevel;
}

export function getTierLabel(tier: string | null): string {
  switch (tier) {
    case 'pro': return 'Pro';
    case 'enterprise': return 'Enterprise';
    default: return 'Free';
  }
}

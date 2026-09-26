export type UserRole = 'user' | 'admin';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Missing on accounts created before suspension existed, which counts as active. */
  isActive?: boolean;
  isEmailVerified?: boolean;
  suspendedReason?: string;
  profileImage?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminUserDetails extends AdminUser {
  accessibilityPreferences?: Partial<Record<'largeText' | 'highContrast' | 'reducedMotion' | 'keyboardNavigation' | 'screenReader', boolean>>;
  activity?: { translations: number; savedItems: number; reports: number };
}

export interface AdminUserStats {
  total: number;
  admins: number;
  suspended: number;
  verified: number;
  newLast30Days: number;
  activeLast30Days: number;
}

export const isActive = (user: Pick<AdminUser, 'isActive'>) => user.isActive !== false;

/** A readable random password that satisfies the 6+ character rule with room to spare. */
export function generatePassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

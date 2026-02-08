/**
 * 🪝 SETTINGS HOOKS - Esportazioni centralizzate
 */

export { useSettingsPage } from './useSettings';
export { useFormValidation } from './useFormValidation';

// Nuovi hook per v2 Settings
export { useOfflineSync } from './useOfflineSync';
export { useUndo, useFormUndo } from './useUndo';
export { useAvatarUpload } from './useAvatarUpload';
export { useSettingsSkeleton, useComponentSkeleton } from './useSettingsSkeleton';
export { useConfirmModal, confirmPresets } from './useConfirmModal';

// Re-export tipi
export type { 
    ConfirmModalType,
    ConfirmModalConfig,
} from './useConfirmModal';

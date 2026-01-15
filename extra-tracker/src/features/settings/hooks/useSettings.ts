import { useState } from 'react';
import { authService, type ChangePasswordData } from '../../auth/services/authService';
import { useSettings as useSettingsContext } from '../context/SettingsContext';
import type { UserProfile, UserPreferences } from '../services/settingsService';

interface FormStatus {
    loading: boolean;
    success: boolean;
    error: string | null;
}

interface SettingsState {
    profileStatus: FormStatus;
    preferencesStatus: FormStatus;
    passwordStatus: FormStatus;
    accountStatus: FormStatus;
}

const initialStatus: FormStatus = { loading: false, success: false, error: null };

export const useSettingsPage = () => {
    const settings = useSettingsContext();
    const [status, setStatus] = useState<SettingsState>({
        profileStatus: initialStatus,
        preferencesStatus: initialStatus,
        passwordStatus: initialStatus,
        accountStatus: initialStatus,
    });

    const setProfileStatus = (partial: Partial<FormStatus>) => setStatus(prev => ({ ...prev, profileStatus: { ...prev.profileStatus, ...partial } }));
    const setPreferencesStatus = (partial: Partial<FormStatus>) => setStatus(prev => ({ ...prev, preferencesStatus: { ...prev.preferencesStatus, ...partial } }));
    const setPasswordStatus = (partial: Partial<FormStatus>) => setStatus(prev => ({ ...prev, passwordStatus: { ...prev.passwordStatus, ...partial } }));
    const setAccountStatus = (partial: Partial<FormStatus>) => setStatus(prev => ({ ...prev, accountStatus: { ...prev.accountStatus, ...partial } }));

    const saveProfile = async (data: Partial<UserProfile>) => {
        setProfileStatus({ loading: true, success: false, error: null });
        const ok = await settings.updateProfile(data);
        setProfileStatus({ loading: false, success: ok, error: ok ? null : settings.error });
        return ok;
    };

    const savePreferences = async (data: Partial<UserPreferences>) => {
        setPreferencesStatus({ loading: true, success: false, error: null });
        const ok = await settings.updatePreferences(data);
        setPreferencesStatus({ loading: false, success: ok, error: ok ? null : settings.error });
        return ok;
    };

    const changePassword = async (data: ChangePasswordData) => {
        setPasswordStatus({ loading: true, success: false, error: null });
        const response = await authService.changePassword(data);
        const ok = response.success ?? false;
        setPasswordStatus({ loading: false, success: ok, error: ok ? null : response.message || response.error?.message || 'Errore cambio password' });
        return ok;
    };

    const exportData = async () => {
        setAccountStatus({ loading: true, success: false, error: null });
        const data = await settings.exportData();
        setAccountStatus({ loading: false, success: !!data, error: data ? null : 'Export fallito' });
        return data;
    };

    const checkImportData = async (file: File) => {
        const result = await settings.checkImportData(file);
        return result;
    };

    const importData = async (file: File, force = false) => {
        setAccountStatus({ loading: true, success: false, error: null });
        const result = await settings.importData(file, force);
        setAccountStatus({ loading: false, success: !!result, error: result ? null : 'Import fallito' });
        return result;
    };

    const deleteAccount = async (password: string, confirmation: string) => {
        setAccountStatus({ loading: true, success: false, error: null });
        const ok = await settings.deleteAccount(password, confirmation);
        setAccountStatus({ loading: false, success: ok, error: ok ? null : 'Eliminazione fallita' });
        return ok;
    };

    return {
        profile: settings.profile,
        preferences: settings.preferences,
        account: settings.account,
        isLoading: settings.isLoading,
        hasLoaded: settings.hasLoaded,
        error: settings.error,
        statuses: status,
        saveProfile,
        savePreferences,
        changePassword,
        exportData,
        checkImportData,
        importData,
        deleteAccount,
    };
};

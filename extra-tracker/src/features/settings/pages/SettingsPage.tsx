import { useState } from 'react';
import { UserIcon, SettingsIcon, ShieldIcon, TrashIcon } from '../../../shared/components/icons';
import { useSettingsPage } from '../hooks/useSettings';
import { ProfileSettings } from '../components/ProfileSettings';
import { PreferencesSettings } from '../components/PreferencesSettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { AccountSettings } from '../components/AccountSettings';

type TabId = 'profile' | 'preferences' | 'security' | 'account';

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'profile', label: 'Profilo', icon: UserIcon },
  { id: 'preferences', label: 'Preferenze', icon: SettingsIcon },
  { id: 'security', label: 'Sicurezza', icon: ShieldIcon },
  { id: 'account', label: 'Account', icon: TrashIcon },
];

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const {
    profile,
    preferences,
    account,
    statuses,
    saveProfile,
    savePreferences,
    changePassword,
    exportData,
    deleteAccount,
  } = useSettingsPage();

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-3xl font-bold text-white mb-1">Impostazioni</h2>
        <p className="text-white/50">Gestisci profilo, preferenze e sicurezza</p>
      </div>

      <div className="divider" />

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id ? 'bg-primary text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-white/60'} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="glass-card p-6 rounded-2xl space-y-6">
        {activeTab === 'profile' && (
          <ProfileSettings
            profile={profile}
            accountEmail={account?.email}
            onSave={saveProfile}
            status={statuses.profileStatus}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesSettings
            preferences={preferences}
            onSave={savePreferences}
            status={statuses.preferencesStatus}
          />
        )}

        {activeTab === 'security' && (
          <SecuritySettings
            onChangePassword={changePassword}
            status={statuses.passwordStatus}
          />
        )}

        {activeTab === 'account' && (
          <AccountSettings
            accountEmail={account?.email}
            onExport={exportData}
            onDelete={deleteAccount}
            status={statuses.accountStatus}
          />
        )}
      </div>
    </div>
  );
};
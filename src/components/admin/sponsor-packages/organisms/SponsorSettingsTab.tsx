import { ExchangeRateCard } from "../molecules/ExchangeRateCard";
import { ConfiguratorStatusCard } from "../molecules/ConfiguratorStatusCard";

interface SponsorSettingsTabProps {
  exchangeRate: number;
  onSaveRate: (rate: number) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
  isConfiguratorEnabled: boolean;
  onToggleConfigurator: (enabled: boolean) => Promise<void>;
  togglingConfigurator: boolean;
  configuratorError: string | null;
  configuratorSuccess: boolean;
}

export function SponsorSettingsTab({
  exchangeRate,
  onSaveRate,
  saving,
  error,
  success,
  isConfiguratorEnabled,
  onToggleConfigurator,
  togglingConfigurator,
  configuratorError,
  configuratorSuccess,
}: SponsorSettingsTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <ConfiguratorStatusCard
        isEnabled={isConfiguratorEnabled}
        onToggle={onToggleConfigurator}
        saving={togglingConfigurator}
        error={configuratorError}
        success={configuratorSuccess}
      />

      <ExchangeRateCard
        exchangeRate={exchangeRate}
        onSaveRate={onSaveRate}
        saving={saving}
        error={error}
        success={success}
      />
    </div>
  );
}

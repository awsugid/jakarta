import { ExchangeRateCard } from "../molecules/ExchangeRateCard";

interface SponsorSettingsTabProps {
  exchangeRate: number;
  onSaveRate: (rate: number) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
}

export function SponsorSettingsTab({
  exchangeRate,
  onSaveRate,
  saving,
  error,
  success,
}: SponsorSettingsTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
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

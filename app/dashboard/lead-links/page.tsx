import LeadLinksManager from "@/components/LeadLinksManager";

export default function LeadLinksPage() {
  return (
    <div className="w-full max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-[#2c4a3a]">
          Lead Access Links
        </h1>
        <p className="text-sm text-[#4a7060]">
          Generate secure links for leads and monitor their usage.
        </p>
      </div>
      <LeadLinksManager />
    </div>
  );
}

"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building,
  ChevronDown,
  Layers,
  Scale,
  Coins,
  History,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowRight,
  Search,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ControlCenterDashboardData,
  ControlCenterIssue,
  ControlCenterIssueStatus,
  ExplainNumberMetric,
  Member360Data,
  Application360Data,
  PanAuditTimelineItem,
  MissingPanRecord,
  ControlCenterKPIs,
} from "@/types/control-center";
import { TodayIpoSummaryCard } from "./today-ipo-summary-card";
import { IpoIntelligencePanel } from "./ipo-intelligence-panel";
import { MissingPanRecordsModal } from "./missing-pan-records-modal";
import { ControlCenterKpiGrid } from "./control-center-kpi-grid";
import { ReconciliationOverviewFlow } from "./reconciliation-overview-flow";
import { NeedsAttentionPanel } from "./needs-attention-panel";
import { CapitalReconciliationTab } from "./capital-reconciliation-tab";
import { LotReconciliationTab } from "./lot-reconciliation-tab";
import { PanIntelligenceTab } from "./pan-intelligence-tab";
import { IssuesCenterTab } from "./issues-center-tab";
import { ReconciliationTimelineTab } from "./reconciliation-timeline-tab";
import { IssueDetailDrawer } from "./issue-detail-drawer";
import { CompareRecordsModal } from "./compare-records-modal";
import { ExplainNumberModal } from "./explain-number-modal";
import { Member360Modal } from "./member-360-modal";
import { Application360Modal } from "./application-360-modal";
import { PanTimelineModal } from "./pan-timeline-modal";
import {
  getMetricExplanationData,
  getMember360Data,
  getApplication360Data,
  getPanAuditTimelineData,
} from "@/lib/control-center/actions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ControlCenterViewProps {
  initialData: ControlCenterDashboardData;
}

type TabKey = "overview" | "issues" | "capital" | "lots" | "pan" | "timeline";

export function ControlCenterView({ initialData }: ControlCenterViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedIpoId, setSelectedIpoId] = useState<string>(initialData.selectedIpoId);
  const [selectedIssue, setSelectedIssue] = useState<ControlCenterIssue | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Compare records modal
  const [compareIssue, setCompareIssue] = useState<ControlCenterIssue | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Explain this number state
  const [explainMetric, setExplainMetric] = useState<ExplainNumberMetric | null>(null);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  // Member 360 state
  const [member360Data, setMember360Data] = useState<Member360Data | null>(null);
  const [isMember360Open, setIsMember360Open] = useState(false);
  const [isLoadingMember360, setIsLoadingMember360] = useState(false);

  // Application 360 state
  const [app360Data, setApp360Data] = useState<Application360Data | null>(null);
  const [isApp360Open, setIsApp360Open] = useState(false);
  const [isLoadingApp360, setIsLoadingApp360] = useState(false);

  // PAN Timeline state
  const [panTimelineData, setPanTimelineData] = useState<PanAuditTimelineItem | null>(null);
  const [isPanTimelineOpen, setIsPanTimelineOpen] = useState(false);
  const [isLoadingPanTimeline, setIsLoadingPanTimeline] = useState(false);

  // Missing PAN viewer state
  const [missingPanRecords, setMissingPanRecords] = useState<MissingPanRecord[]>(initialData.missingPanRecords || []);
  const [kpis, setKpis] = useState<ControlCenterKPIs>(initialData.kpis);
  const [isMissingPanModalOpen, setIsMissingPanModalOpen] = useState(false);

  const [lastReconciledText, setLastReconciledText] = useState("Just now");

  useEffect(() => {
    setMissingPanRecords(initialData.missingPanRecords || []);
    setKpis(initialData.kpis);
    setLastReconciledText("Just now");
    const interval = setInterval(() => {
      setLastReconciledText("1m ago");
    }, 60000);
    return () => clearInterval(interval);
  }, [initialData]);

  function handleSelectIpo(ipoId: string) {
    setSelectedIpoId(ipoId);
    startTransition(() => {
      router.push(`/ad/control-center?ipoId=${ipoId}`);
    });
  }

  function handleFullReconciliation() {
    startTransition(() => {
      router.refresh();
      setLastReconciledText("Just now");
      toast.showToast("success", "Reconciliation Synchronized", "Calculations verified with live database records.");
    });
  }

  async function handleOpenExplainNumber(metricKey: string) {
    setIsLoadingExplanation(true);
    setIsExplainModalOpen(true);
    try {
      const data = await getMetricExplanationData({
        metricKey,
        selectedIpoId,
      });
      setExplainMetric(data);
    } catch {
      toast.showToast("error", "Error Loading Breakdown", "Failed to load calculation breakdown");
      setIsExplainModalOpen(false);
    } finally {
      setIsLoadingExplanation(false);
    }
  }

  async function handleOpenMember360(memberId: string) {
    setIsLoadingMember360(true);
    setIsMember360Open(true);
    try {
      const data = await getMember360Data({
        memberId,
        selectedIpoId,
      });
      setMember360Data(data);
    } catch {
      toast.showToast("error", "Error Loading Profile", "Failed to load Member 360° dossier");
      setIsMember360Open(false);
    } finally {
      setIsLoadingMember360(false);
    }
  }

  async function handleOpenApplication360(applicationId: string) {
    setIsLoadingApp360(true);
    setIsApp360Open(true);
    try {
      const data = await getApplication360Data({
        applicationId,
      });
      setApp360Data(data);
    } catch {
      toast.showToast("error", "Error Loading Application", "Failed to load Application 360° details");
      setIsApp360Open(false);
    } finally {
      setIsLoadingApp360(false);
    }
  }

  async function handleOpenPanTimeline(pan: string) {
    setIsLoadingPanTimeline(true);
    setIsPanTimelineOpen(true);
    try {
      const data = await getPanAuditTimelineData({
        pan,
        selectedIpoId,
      });
      setPanTimelineData(data);
    } catch {
      toast.showToast("error", "Error Loading Timeline", "Failed to load PAN timeline");
      setIsPanTimelineOpen(false);
    } finally {
      setIsLoadingPanTimeline(false);
    }
  }

  function handleOpenIssueDetails(issue: ControlCenterIssue) {
    setSelectedIssue(issue);
    setIsDrawerOpen(true);
  }

  function handleOpenCompareRecords(issue: ControlCenterIssue) {
    setCompareIssue(issue);
    setIsCompareOpen(true);
  }

  function handleIssueStatusUpdated() {
    startTransition(() => {
      router.refresh();
    });
  }

  const {
    todaySummary,
    intelligenceInsights,
    impactSummary,
    capitalReconciliation,
    lotReconciliation,
    panIntelligence,
    issues,
    reconciliationTimeline,
    availableIpos,
    selectedIpoName,
  } = initialData;

  return (
    <div className="space-y-4 font-sans pb-12">
      {/* 1. COMPACT STICKY TOP COMMAND BAR */}
      <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 py-2.5 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all">
        {/* Left: Branding & Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-zinc-100 uppercase tracking-wide font-mono">
                IPO Control Center
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[10.5px] text-zinc-500 leading-none">
              Real-time reconciliation & operations
            </p>
          </div>
        </div>

        {/* Center: Selected Offering Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="relative">
            <select
              value={selectedIpoId}
              onChange={(e) => handleSelectIpo(e.target.value)}
              className="h-8 rounded-lg border border-zinc-800 bg-zinc-900/90 pl-2.5 pr-7 text-xs font-semibold text-zinc-100 hover:border-zinc-700 focus:outline-hidden transition-all appearance-none cursor-pointer shadow-2xs max-w-[200px] truncate"
            >
              {availableIpos.length === 0 && <option value="">No IPOs Available</option>}
              {availableIpos.map((ipo) => (
                <option key={ipo.id} value={ipo.id} className="bg-zinc-900 text-zinc-100">
                  {ipo.name} {ipo.status === "APPLICATION_OPEN" || ipo.status === "OPEN" ? "• Active" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Right: Last reconciled + Refresh action */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto text-xs">
          <span className="text-[11px] font-mono text-zinc-500 hidden md:inline">
            Last reconciled: <strong className="text-zinc-400 font-normal">{lastReconciledText}</strong>
          </span>

          <Button
            type="button"
            size="sm"
            onClick={handleFullReconciliation}
            disabled={isPending}
            className="h-8 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-100 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={cn("h-3 w-3 text-purple-400", isPending && "animate-spin")} />
            <span>Reconcile Now</span>
          </Button>
        </div>
      </header>

      {/* 2. TODAY'S IPO SUMMARY BANNER */}
      {todaySummary && (
        <TodayIpoSummaryCard
          summary={todaySummary}
          onOpenActionItems={() => setActiveTab("issues")}
        />
      )}

      {/* 3. COMPACT 6-CARD KPI STRIP */}
      <ControlCenterKpiGrid
        kpis={kpis}
        onSelectTab={setActiveTab}
        onExplainNumber={handleOpenExplainNumber}
        onOpenMissingPans={() => setIsMissingPanModalOpen(true)}
      />

      {/* 4. SMART IPO INTELLIGENCE PANEL */}
      {intelligenceInsights && intelligenceInsights.length > 0 && (
        <IpoIntelligencePanel
          insights={intelligenceInsights}
          onOpenMissingPansModal={() => setIsMissingPanModalOpen(true)}
          onSelectTab={(tabKey) => setActiveTab(tabKey as TabKey)}
        />
      )}

      {/* 5. RECONCILIATION OVERVIEW FLOW */}
      <ReconciliationOverviewFlow
        kpis={kpis}
        capitalSummary={capitalReconciliation}
        lotSummary={lotReconciliation}
        panSummary={panIntelligence}
        onSelectTab={setActiveTab}
      />

      {/* 4. TAB CONTROLLER BAR */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-zinc-800/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5",
            activeTab === "overview"
              ? "bg-zinc-800 text-zinc-100 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("issues")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5",
            activeTab === "issues"
              ? "bg-zinc-800 text-zinc-100 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>All Issues</span>
          {kpis.totalOpenIssuesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300">
              {kpis.totalOpenIssuesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("capital")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5",
            activeTab === "capital"
              ? "bg-zinc-800 text-zinc-100 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>Capital Matrix</span>
          {kpis.capitalMismatchesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
              {kpis.capitalMismatchesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lots")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5",
            activeTab === "lots"
              ? "bg-zinc-800 text-zinc-100 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Lot Matrix</span>
          {kpis.lotMismatchesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
              {kpis.lotMismatchesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pan")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5",
            activeTab === "pan"
              ? "bg-zinc-800 text-zinc-100 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <History className="h-3.5 w-3.5" />
          <span>PAN Intelligence</span>
          {panIntelligence.missingGenuinePansCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300">
              {panIntelligence.missingGenuinePansCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5",
            activeTab === "timeline"
              ? "bg-zinc-800 text-zinc-100 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Activity Log</span>
        </button>
      </div>

      {/* 5. TAB VIEW CONTENTS */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Needs Attention Hero & Financial Impact Panel */}
          <NeedsAttentionPanel
            issues={issues}
            impactSummary={impactSummary}
            capitalSummary={capitalReconciliation}
            onViewIssueDetails={handleOpenIssueDetails}
            onViewAllIssues={() => setActiveTab("issues")}
            onExplainNumber={handleOpenExplainNumber}
          />

          {/* All Issues Table below */}
          <IssuesCenterTab
            issues={issues}
            impactSummary={impactSummary}
            selectedIpoName={selectedIpoName}
            onViewIssueDetails={handleOpenIssueDetails}
            onOpenMember360={handleOpenMember360}
            onOpenApplication360={handleOpenApplication360}
            onStatusUpdated={handleIssueStatusUpdated}
          />
        </div>
      )}

      {activeTab === "issues" && (
        <IssuesCenterTab
          issues={issues}
          impactSummary={impactSummary}
          selectedIpoName={selectedIpoName}
          onViewIssueDetails={handleOpenIssueDetails}
          onOpenMember360={handleOpenMember360}
          onOpenApplication360={handleOpenApplication360}
          onStatusUpdated={handleIssueStatusUpdated}
        />
      )}

      {activeTab === "capital" && (
        <CapitalReconciliationTab
          summary={capitalReconciliation}
          selectedIpoName={selectedIpoName}
          onExplainNumber={handleOpenExplainNumber}
          onViewIssueDetails={handleOpenIssueDetails}
        />
      )}

      {activeTab === "lots" && (
        <LotReconciliationTab
          summary={lotReconciliation}
          selectedIpoName={selectedIpoName}
          onExplainNumber={handleOpenExplainNumber}
          onViewIssueDetails={handleOpenIssueDetails}
        />
      )}

      {activeTab === "pan" && (
        <PanIntelligenceTab
          summary={panIntelligence}
          selectedIpoName={selectedIpoName}
          onOpenPanTimeline={handleOpenPanTimeline}
        />
      )}

      {activeTab === "timeline" && (
        <ReconciliationTimelineTab
          timeline={reconciliationTimeline}
          selectedIpoName={selectedIpoName}
        />
      )}

      {/* 6. MODALS & DRAWERS */}
      {/* A. Issue Detail Drawer */}
      <IssueDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        issue={selectedIssue}
        onOpenCompareRecords={handleOpenCompareRecords}
        onOpenMember360={handleOpenMember360}
        onOpenApplication360={handleOpenApplication360}
        onStatusUpdated={handleIssueStatusUpdated}
      />

      {/* B. Compare Records Modal */}
      <CompareRecordsModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        issue={compareIssue}
      />

      {/* C. Explain This Number Modal */}
      <ExplainNumberModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        metric={explainMetric}
        isLoading={isLoadingExplanation}
      />

      {/* D. Member 360 Modal */}
      <Member360Modal
        isOpen={isMember360Open}
        onClose={() => setIsMember360Open(false)}
        memberData={member360Data}
        isLoading={isLoadingMember360}
      />

      {/* E. Application 360 Modal */}
      <Application360Modal
        isOpen={isApp360Open}
        onClose={() => setIsApp360Open(false)}
        applicationData={app360Data}
        isLoading={isLoadingApp360}
      />

      {/* F. PAN Timeline Modal */}
      <PanTimelineModal
        isOpen={isPanTimelineOpen}
        onClose={() => setIsPanTimelineOpen(false)}
        timelineData={panTimelineData}
        isLoading={isLoadingPanTimeline}
      />

      {/* G. Missing PAN Records Modal */}
      <MissingPanRecordsModal
        isOpen={isMissingPanModalOpen}
        onClose={() => setIsMissingPanModalOpen(false)}
        records={missingPanRecords}
        availableIpos={availableIpos}
        onViewApplication360={handleOpenApplication360}
        onRecordResolved={(recordId) => {
          setMissingPanRecords((prev) =>
            prev.map((r) => (r.id === recordId ? { ...r, isResolved: true } : r))
          );
          setKpis((prev) => ({
            ...prev,
            missingPansCount: Math.max(0, (prev.missingPansCount ?? 1) - 1),
          }));
        }}
        onPanUpdated={(appId, newPan) => {
          setMissingPanRecords((prev) =>
            prev.map((r) =>
              r.applicationId === appId
                ? { ...r, currentPans: [newPan], isResolved: true }
                : r
            )
          );
          setKpis((prev) => ({
            ...prev,
            missingPansCount: Math.max(0, (prev.missingPansCount ?? 1) - 1),
          }));
        }}
      />
    </div>
  );
}

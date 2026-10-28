import { useState, useEffect, useCallback } from 'react';
import { ReviewResult, HealthStatus } from '../types';

export type ReviewTabType =
  | 'playground'
  | 'diff'
  | 'findings'
  | 'pr-description'
  | 'taint'
  | 'audit'
  | 'scorecard'
  | 'tests';

export function useReviewSession() {
  const [activeTab, setActiveTab] = useState<ReviewTabType>('playground');
  const [currentResult, setCurrentResult] = useState<ReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json() as HealthStatus;
        setHealth(data);
      }
    } catch {
      // Daemon might be starting or not yet connected
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const analyzeDiff = async (diff: string, generateTests: boolean = true, framework: string = 'vitest') => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/review/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diff,
          generateTests,
          preferredFramework: framework
        })
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || `Review failed with HTTP ${res.status}`);
      }

      const result = await res.json() as ReviewResult;
      setCurrentResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to review diff');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzePrUrl = async (prUrl: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/review/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl })
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || `Failed to fetch PR with HTTP ${res.status}`);
      }

      const result = await res.json() as ReviewResult;
      setCurrentResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze GitHub PR');
    } finally {
      setIsLoading(false);
    }
  };

  const publishReview = async () => {
    if (!currentResult || !currentResult.prInfo) return;
    setIsPublishing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/reviews/${currentResult.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: currentResult.prInfo.owner,
          repo: currentResult.prInfo.repo,
          pullNumber: currentResult.prInfo.pullNumber
        })
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || 'Failed to publish review to GitHub');
      }

      setSuccessMessage('Review comments and suggestions successfully published to GitHub PR!');
    } catch (err: any) {
      setError(err.message || 'Failed to publish review');
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    currentResult,
    setCurrentResult,
    isLoading,
    isPublishing,
    error,
    successMessage,
    health,
    isSettingsOpen,
    setIsSettingsOpen,
    isRulesModalOpen,
    setIsRulesModalOpen,
    analyzeDiff,
    analyzePrUrl,
    publishReview,
    refreshHealth: fetchHealth
  };
}

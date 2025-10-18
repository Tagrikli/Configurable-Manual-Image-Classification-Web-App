"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { apiClient } from "../api/client";
import type { LabelDefinition } from "../api/client";



export const ImageClassification = () => {
    const navigate = useNavigate();
    const {
        username,
        isUsernameLoaded,
        currentImage,
        setCurrentImage,
        labels,
        setLabels,
        setProgress,
        labelConfig,
        isLabelConfigLoaded,
        resetLabels,
    } = useAppContext();
    const [remaining, setRemaining] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [helpCardVisible, setHelpCardVisible] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState<LabelDefinition | null>(null);
    const [showCelebrationDialog, setShowCelebrationDialog] = useState(false);
    const [fullscreenDenied, setFullscreenDenied] = useState(false);
    const longPressTimerRef = useRef<number | null>(null);
    const helpCardRef = useRef<HTMLDivElement>(null);

    const toggleLabel = useCallback(
        (column: string) => {
            setLabels((previous) => {
                const currentValue = Boolean(previous?.[column]);
                return { ...previous, [column]: !currentValue };
            });
        },
        [setLabels]
    );

    const handleLongPress = useCallback(
        (label: LabelDefinition) => {
            setSelectedLabel(label);
            setHelpCardVisible(true);
        },
        []
    );

    const handleMouseDown = useCallback(
        (label: LabelDefinition) => {
            longPressTimerRef.current = window.setTimeout(() => {
                handleLongPress(label);
            }, 300); // 500ms for long press
        },
        [handleLongPress]
    );

    const handleMouseUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleTouchStart = useCallback(
        (label: LabelDefinition) => {
            longPressTimerRef.current = window.setTimeout(() => {
                handleLongPress(label);
            }, 500); // 500ms for long press
        },
        [handleLongPress]
    );

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleTouchCancel = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const keyboardShortcuts = useMemo(() => {
        return labelConfig.reduce<Record<string, () => void>>((acc, label) => {
            const key = (label.shortcut || "").trim().toUpperCase();
            if (!key) {
                return acc;
            }
            acc[key] = () => toggleLabel(label.column);
            return acc;
        }, {});
    }, [labelConfig, toggleLabel]);

    const handleNext = async () => {
        console.log("[DEBUG] handleNext: Called", { currentImage: !!currentImage, username, loading });
        if (loading) {
            console.log("[DEBUG] handleNext: Early return - currently loading");
            return;
        }

        if (!isLabelConfigLoaded) {
            console.log("[DEBUG] handleNext: Label configuration not ready");
            return;
        }

        if (!currentImage || !username) {
            console.log("[DEBUG] handleNext: Early return - no currentImage or username");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            console.log("[DEBUG] handleNext: Starting navigation for", currentImage.filename);

            const response = await apiClient.navigate({
                currentPath: currentImage.path,
                labels,
                reviewer: username,
            });

            console.log("[DEBUG] handleNext: API response received", response);

            const nextImage = response.image ?? null;

            if (nextImage) {
                console.log("[DEBUG] handleNext: Setting new image", nextImage.filename);
                setCurrentImage(nextImage);
                resetLabels();
            } else {
                console.log("[DEBUG] handleNext: No image returned from navigate");
                setCurrentImage(null);
            }

            const progress = await apiClient.getProgress();
            console.log("[DEBUG] handleNext: Progress updated", progress);
            setProgress({
                processed: progress.processed_images,
                total: progress.total_images,
                percentage: progress.percentage,
            });
            const remainingCount = Math.max(progress.total_images - progress.processed_images, 0);
            setRemaining(remainingCount);

            if (!nextImage) {
                if (remainingCount === 0) {
                    console.log("[DEBUG] handleNext: No remaining images, navigating to celebration");
                    setError(null);

                    setShowCelebrationDialog(true);
                } else {
                    setError("No more images to classify");
                }
            }
        } catch (err) {
            console.error("[DEBUG] handleNext: Error caught", err);
            setError(err instanceof Error ? err.message : "Failed to navigate");
        } finally {
            console.log("[DEBUG] handleNext: Setting loading to false");
            setLoading(false);
        }
    };

    const handleCelebrationConfirm = async () => {
        try {
            await document.documentElement.requestFullscreen();
            // Fullscreen granted, navigate to celebration
            navigate("/complete", { replace: true });
        } catch (error) {
            // Fullscreen denied, show dialog again with warning
            console.log("[DEBUG] Fullscreen denied:", error);
            setFullscreenDenied(true);
        }
    };

    useKeyboardShortcuts({
        shortcuts: keyboardShortcuts,
        onSpace: handleNext,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (helpCardRef.current && !helpCardRef.current.contains(event.target as Node)) {
                setHelpCardVisible(false);
            }
        };

        if (helpCardVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [helpCardVisible]);

    useEffect(() => {
        console.log("[DEBUG] useEffect triggered", {
            username,
            hasUsername: !!username,
            isUsernameLoaded,
            setCurrentImage: typeof setCurrentImage,
            setLabels: typeof setLabels,
            setProgress: typeof setProgress,
            labelConfigLoaded: isLabelConfigLoaded,
        });

        if (!isUsernameLoaded) {
            console.log("[DEBUG] Username not loaded yet, waiting");
            return;
        }

        if (!isLabelConfigLoaded) {
            console.log("[DEBUG] Label configuration not loaded yet, waiting");
            return;
        }

        if (!username) {
            console.log("[DEBUG] No username after initialization, redirecting to username page");
            navigate("/username", { replace: true });
            return;
        }

        const loadInitialImage = async () => {
            try {
                console.log("[DEBUG] loadInitialImage: Starting image load");
                setLoading(true);
                setError(null);
                const { image } = await apiClient.loadImage(username);

                const nextImage = image ?? null;

                if (nextImage) {
                    console.log("[DEBUG] loadInitialImage: Image loaded", nextImage.filename);
                    setCurrentImage(nextImage);
                    resetLabels();
                } else {
                    console.log("[DEBUG] loadInitialImage: No unprocessed images available");
                    setCurrentImage(null);
                }

                const progress = await apiClient.getProgress();
                console.log("[DEBUG] loadInitialImage: Progress loaded", progress);
                setProgress({
                    processed: progress.processed_images,
                    total: progress.total_images,
                    percentage: progress.percentage,
                });
                const remainingCount = Math.max(progress.total_images - progress.processed_images, 0);
                setRemaining(remainingCount);

                if (!nextImage) {
                    if (remainingCount === 0) {
                        console.log("[DEBUG] loadInitialImage: Redirecting to celebration, no images remain");
                        setError(null);
                        setShowCelebrationDialog(true);
                    } else {
                        setError("No unprocessed images available");
                    }
                }
            } catch (err) {
                console.error("[DEBUG] loadInitialImage: Error", err);
                setError(err instanceof Error ? err.message : "Failed to load image");
            } finally {
                console.log("[DEBUG] loadInitialImage: Setting loading to false");
                setLoading(false);
            }
        };

        loadInitialImage();
    }, [username, isUsernameLoaded, isLabelConfigLoaded, navigate, setCurrentImage, resetLabels, setProgress]);

    if (!isLabelConfigLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#191724] text-[var(--rp-base05)]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--rp-base0D)] mb-4"></div>
                    <p className="text-[var(--rp-base04)]">Loading configuration...</p>
                </div>
            </div>
        );
    }

    if (loading && !currentImage) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#191724] text-[var(--rp-base05)]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--rp-base0D)] mb-4"></div>
                    <p className="text-[var(--rp-base04)]">Loading image...</p>
                </div>
            </div>
        );
    }

    if (error && !currentImage) {
        console.log("[DEBUG] Rendering error state", { error });
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#191724]">
                <div className="text-center text-[var(--rp-base08)]">
                    <p className="text-lg font-semibold mb-2">Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* File Info Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-4 text-sm sm:text-base text-[var(--rp-base04)]">
                <div className="font-medium text-[var(--rp-base05)]">
                    <strong className="text-[var(--rp-base0C)]">Filename:</strong>{" "}
                    {currentImage?.filename || "No image loaded"}
                </div>
            </div>

            {/* Image Container */}
            <div className="rounded-xl overflow-hidden mb-6 flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-[#1f1d2e] border border-[#26233a]">
                {currentImage ? (
                    <img
                        src={apiClient.getImageUrl(currentImage.path)}
                        alt="Current image"
                        className="max-w-full h-auto max-h-[400px] sm:max-h-[600px] rounded"
                    />
                ) : (
                    <p className="text-[var(--rp-base04)]">No image loaded</p>
                )}
            </div>

            {/* Classification Label Buttons */}
            <div className="flex flex-col w-full items-stretch gap-3 sm:gap-4 mb-6 md:flex-row md:flex-nowrap md:justify-evenly">
                {labelConfig.length === 0 ? (
                    <p className="text-[var(--rp-base04)]">No labels configured.</p>
                ) : (
                    labelConfig.map((label) => {
                        const isActive = Boolean(labels[label.column]);
                        const titleSuffix = label.shortcut ? ` [${label.shortcut.toUpperCase()}]` : '';
                        return (
                            <button
                                key={label.column}
                                onClick={() => toggleLabel(label.column)}
                                onMouseDown={() => handleMouseDown(label)}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={() => handleTouchStart(label)}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchCancel}
                                aria-pressed={isActive}
                                title={`${label.display_name}${titleSuffix}`}
                                className={`px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 w-full md:w-auto min-h-[44px] min-w-[140px] sm:min-w-[160px] border shadow-sm ${
                                    isActive
                                        ? "bg-[var(--rp-base0B)] text-[var(--rp-base06)] border-[var(--rp-base0B)] hover:brightness-110"
                                        : "bg-[var(--rp-base08)] text-[var(--rp-base06)] border-[var(--rp-base08)] hover:brightness-110"
                                }`}>
                                {label.emoji && <span className="text-xl">{label.emoji}</span>}
                                <span className={label.emoji ? "ml-2" : ""}>{label.display_name}</span>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Help Card */}
            {helpCardVisible && selectedLabel && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
                    <div ref={helpCardRef} className="bg-[var(--rp-base00)] p-6 rounded-lg shadow-lg max-w-md w-full mx-4 border-l-4 border-[var(--rp-base0D)]">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-[var(--rp-base05)] flex items-center gap-2">
                                {selectedLabel.emoji && <span className="text-2xl">{selectedLabel.emoji}</span>}
                                <span>{selectedLabel.display_name}</span>
                            </h3>
                        </div>
                        <div className="space-y-2 text-[var(--rp-base05)]">
                            <p>
                                <strong className="font-semibold">Description:</strong> {selectedLabel.description?.description}
                            </p>
                            <p>
                                <strong className="font-semibold text-[var(--rp-base0B)]">When to mark as TRUE:</strong>{' '}
                                {selectedLabel.description?.when_true}
                            </p>
                            <p>
                                <strong className="font-semibold text-[var(--rp-base08)]">When to mark as FALSE:</strong>{' '}
                                {selectedLabel.description?.when_false}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showCelebrationDialog && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[var(--rp-base00)] p-6 rounded-lg shadow-lg max-w-md w-full mx-4 border-l-4 border-[var(--rp-base0B)]">
                        <h2 className="text-2xl font-bold mb-4 text-[var(--rp-base0B)]">
                            🎉 Congratulations!
                        </h2>
                        <p className="mb-4 text-[var(--rp-base05)]">
                            You've completed all images! Would you like to go to the celebration page?
                        </p>
                        {fullscreenDenied && (
                            <p className="mb-4 text-[var(--rp-base08)] font-semibold">
                                ⚠️ We need to go fullscreen!
                            </p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCelebrationDialog(false);
                                    setFullscreenDenied(false);
                                }}
                                className="px-4 py-2 rounded bg-[var(--rp-base03)] text-[var(--rp-base05)] hover:bg-[var(--rp-base04)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCelebrationConfirm}
                                className="px-4 py-2 rounded bg-[var(--rp-base0B)] text-[var(--rp-base00)] hover:bg-[var(--rp-base0C)]"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Controls */}
            <div className="rounded-xl p-4 sm:p-6 bg-[#1f1d2e] border border-[#26233a]">
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 sm:px-5 sm:py-2 text-sm font-semibold rounded-lg min-h-[36px] transition-all duration-200 bg-[var(--rp-base03)] text-[var(--rp-base05)] hover:bg-[var(--rp-base04)]">
                        Skip
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={loading || !currentImage}
                        className="px-6 py-3 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold rounded-lg min-h-[44px] min-w-[120px] sm:min-w-[140px] transition-all duration-200 bg-[var(--rp-base0D)] text-[var(--rp-base00)] hover:bg-[var(--rp-base0C)] disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? "Loading..." : "Next Unprocessed Image"}
                    </button>
                </div>
                <div className="text-center text-sm text-[var(--rp-base04)] mb-2">Remaining images: {remaining}</div>
                <div className="text-center text-xs sm:text-sm text-[var(--rp-base03)]">
                    <span>Adjust labels freely, then press Next to save the current selection</span>
                </div>
            </div>
        </div>
    );
};

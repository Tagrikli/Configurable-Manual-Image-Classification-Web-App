import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient, type LabelDefinition, type LabelState } from '../api/client';

interface AppContextType {
  username: string;
  setUsername: (username: string) => void;
  isUsernameLoaded: boolean;
  progress: {
    processed: number;
    total: number;
    percentage: number;
  };
  setProgress: (progress: { processed: number; total: number; percentage: number }) => void;
  currentImage: {
    filename: string;
    path: string;
  } | null;
  setCurrentImage: (image: { filename: string; path: string } | null) => void;
  labelConfig: LabelDefinition[];
  isLabelConfigLoaded: boolean;
  labels: LabelState;
  setLabels: React.Dispatch<React.SetStateAction<LabelState>>;
  resetLabels: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const buildDefaultLabelState = (config: LabelDefinition[]): LabelState =>
  config.reduce<LabelState>((acc, { column }) => {
    acc[column] = false;
    return acc;
  }, {});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [username, setUsernameState] = useState<string>('');
  const [isUsernameLoaded, setIsUsernameLoaded] = useState(false);
  const [progress, setProgressState] = useState({ processed: 0, total: 0, percentage: 0 });
  const [currentImage, setCurrentImageState] = useState<{ filename: string; path: string } | null>(null);
  const [labelConfig, setLabelConfig] = useState<LabelDefinition[]>([]);
  const [isLabelConfigLoaded, setIsLabelConfigLoaded] = useState(false);
  const [labels, setLabelsState] = useState<LabelState>({});

  useEffect(() => {
    const savedUsername = (localStorage.getItem('username') || '').trim();
    setUsernameState(savedUsername);
    setIsUsernameLoaded(true);
  }, []);

  useEffect(() => {
    const fetchLabelConfig = async () => {
      try {
        const response = await apiClient.getLabelConfig();
        setLabelConfig(response.labels);
        setLabelsState(buildDefaultLabelState(response.labels));
      } catch (error) {
        console.error('[DEBUG] Failed to load label configuration', error);
        setLabelConfig([]);
        setLabelsState({});
      } finally {
        setIsLabelConfigLoaded(true);
      }
    };

    fetchLabelConfig();
  }, []);

  const setUsername = useCallback((newUsername: string) => {
    const trimmedUsername = newUsername.trim();
    console.log('[DEBUG] setUsername called', { newUsername, trimmedUsername });
    setUsernameState(trimmedUsername);
    setIsUsernameLoaded(true);
    if (trimmedUsername) {
      localStorage.setItem('username', trimmedUsername);
    } else {
      localStorage.removeItem('username');
    }
  }, []);

  const setProgress = useCallback((newProgress: { processed: number; total: number; percentage: number }) => {
    console.log('[DEBUG] setProgress called', { newProgress, functionId: 'setProgress-' + Date.now() });
    setProgressState(newProgress);
  }, []);

  const setCurrentImage = useCallback((image: { filename: string; path: string } | null) => {
    console.log('[DEBUG] setCurrentImage called', { image, functionId: 'setCurrentImage-' + Date.now() });
    setCurrentImageState(image);
  }, []);

  const setLabels = useCallback((update: React.SetStateAction<LabelState>) => {
    setLabelsState(prev => {
      const next = typeof update === 'function' ? (update as (prev: LabelState) => LabelState)(prev) : update;
      console.log('[DEBUG] setLabels called', { next, functionId: 'setLabels-' + Date.now() });
      return next;
    });
  }, []);

  const resetLabels = useCallback(() => {
    const defaults = buildDefaultLabelState(labelConfig);
    console.log('[DEBUG] resetLabels called', { defaults });
    setLabelsState(defaults);
  }, [labelConfig]);

  return (
    <AppContext.Provider
      value={{
        username,
        setUsername,
        isUsernameLoaded,
        progress,
        setProgress,
        currentImage,
        setCurrentImage,
        labelConfig,
        isLabelConfigLoaded,
        labels,
        setLabels,
        resetLabels,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

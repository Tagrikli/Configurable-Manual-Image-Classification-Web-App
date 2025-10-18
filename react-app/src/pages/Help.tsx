import React from 'react';
import { useAppContext } from '../context/AppContext';

export const Help: React.FC = () => {
  const { labelConfig, isLabelConfigLoaded } = useAppContext();

  if (!isLabelConfigLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#191724] text-[var(--rp-base05)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--rp-base0D)] mb-4"></div>
          <p className="text-[var(--rp-base04)]">Loading help content...</p>
        </div>
      </div>
    );
  }

  const shortcutLabels = labelConfig.filter((label) => label.shortcut);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl shadow-xl p-6 md:p-10 bg-[#1f1d2e] border border-[#26233a] text-[var(--rp-base05)]">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[var(--rp-base05)]">Help & Documentation</h1>
          <p className="text-lg leading-relaxed text-[var(--rp-base04)]">
            This tool helps you classify images by labeling them with specific attributes. Below you'll find information
            about what each label means and how to use the tool effectively.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6 pb-3 border-b border-[#2e2a44] text-[var(--rp-base05)]">
            Classification Labels
          </h2>

          {labelConfig.length === 0 ? (
            <p className="text-[var(--rp-base04)]">No labels are configured. Please contact your administrator.</p>
          ) : (
            labelConfig.map((label) => {
              const { description } = label;
              return (
                <div
                  key={label.column}
                  className="bg-[#26233a] border-l-4 border-[var(--rp-base0D)] rounded-lg p-5 mb-5 last:mb-0"
                >
                  <h3 className="text-xl font-semibold text-[var(--rp-base0D)] mb-3 flex items-center gap-2">
                    {label.emoji && <span className="text-2xl">{label.emoji}</span>}
                    <span>{label.display_name}</span>
                  </h3>
                  <div className="space-y-2 text-[var(--rp-base04)]">
                    <p>
                      <strong className="font-semibold">Description:</strong> {description.description}
                    </p>
                    <p>
                      <strong className="font-semibold text-[var(--rp-base0B)]">When to mark as TRUE:</strong>{' '}
                      {description.when_true}
                    </p>
                    <p>
                      <strong className="font-semibold text-[var(--rp-base08)]">When to mark as FALSE:</strong>{' '}
                      {description.when_false}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6 pb-3 border-b border-[#2e2a44] text-[var(--rp-base05)]">
            How to Use the Tool
          </h2>

          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--rp-base0D)] text-[#191724] rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold text-[var(--rp-base05)] mb-1">Set Your Username</h4>
                <p className="text-[var(--rp-base04)]">
                  Click &quot;Change Username&quot; in the header to set your reviewer name. This helps track who
                  classified each image.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--rp-base0D)] text-[#191724] rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold text-[var(--rp-base05)] mb-1">Review the Image</h4>
                <p className="text-[var(--rp-base04)]">Carefully examine the displayed image and determine which labels apply.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--rp-base0D)] text-[#191724] rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold text-[var(--rp-base05)] mb-1">Toggle Labels</h4>
                <p className="text-[var(--rp-base04)]">
                  Click the label buttons to toggle them on/off. Keyboard shortcuts are available for faster selection.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--rp-base0D)] text-[#191724] rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h4 className="font-semibold text-[var(--rp-base05)] mb-1">Save and Continue</h4>
                <p className="text-[var(--rp-base04)]">Click &quot;Next Unprocessed Image&quot; to save your labels and move to the next image.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--rp-base0D)] text-[#191724] rounded-full flex items-center justify-center font-bold text-sm">
                5
              </div>
              <div>
                <h4 className="font-semibold text-[var(--rp-base05)] mb-1">Track Progress</h4>
                <p className="text-[var(--rp-base04)]">
                  Watch the progress bar at the bottom to see how many images have been classified overall.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className='mb-10'>
          <h2 className="text-2xl font-bold mb-6 pb-3 border-b border-[#2e2a44] text-[var(--rp-base05)]">
            Keyboard Shortcuts
          </h2>

          <div className="bg-[#26233a] border-l-4 border-[var(--rp-base0D)] rounded-lg p-5">
            {shortcutLabels.length === 0 ? (
              <p className="text-[var(--rp-base04)]">No keyboard shortcuts are configured for the current labels.</p>
            ) : (
              <ul className="space-y-2 text-[var(--rp-base04)]">
                {shortcutLabels.map((label) => (
                  <li key={label.column}>
                    <strong className="font-semibold text-[var(--rp-base05)]">
                      [{label.shortcut.toUpperCase()}]
                    </strong>{' '}
                    - Toggle {label.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-6 pb-3 border-b border-[#2e2a44] text-[var(--rp-base05)]">
            Viewing Label Descriptions
          </h2>

          <div className="bg-[#26233a] border-l-4 border-[var(--rp-base0D)] rounded-lg p-5">
            <p className="text-[var(--rp-base04)]">
              To view detailed descriptions of labels, long press on any labeling button in the classification page. This will display the full description, including when to mark as true or false.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Help;

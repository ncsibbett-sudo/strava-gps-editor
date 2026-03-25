import { useState } from 'react';
import type { ValidationResult } from '../../services/validationService';
import { getValidationSummary } from '../../services/validationService';

interface ValidationWarningProps {
  validationResult: ValidationResult;
  onOverride?: () => void;
  showOverride?: boolean;
}

/**
 * Display validation errors and warnings
 * Prevents saving unless user overrides or fixes issues
 */
export function ValidationWarning({
  validationResult,
  onOverride,
  showOverride = false,
}: ValidationWarningProps) {
  const [isOverridden, setIsOverridden] = useState(false);
  const { errors, warnings } = validationResult;

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  const handleOverrideChange = (checked: boolean) => {
    setIsOverridden(checked);
    if (checked && onOverride) {
      onOverride();
    }
  };

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div
        className={`rounded-lg p-3 border ${
          errors.length > 0
            ? 'bg-red-900/30 border-red-700'
            : 'bg-yellow-900/30 border-yellow-700'
        }`}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg">{errors.length > 0 ? '⚠️' : '⚡'}</span>
          <div className="flex-1">
            <p
              className={`text-sm font-semibold ${
                errors.length > 0 ? 'text-red-200' : 'text-yellow-200'
              }`}
            >
              {errors.length > 0 ? 'Validation Errors' : 'Validation Warnings'}
            </p>
            <p
              className={`text-xs mt-1 ${
                errors.length > 0 ? 'text-red-300' : 'text-yellow-300'
              }`}
            >
              {getValidationSummary(validationResult)}
            </p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-200 mb-2">Errors:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="text-xs text-red-300 flex gap-2">
                <span className="text-red-400 font-mono">•</span>
                <div>
                  <span className="font-semibold">{error.type}:</span> {error.message}
                  {error.value !== undefined && error.threshold !== undefined && (
                    <span className="text-red-400 ml-1">
                      ({error.value.toFixed(1)} &gt; {error.threshold.toFixed(1)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
          <p className="text-xs font-semibold text-yellow-200 mb-2">Warnings:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {warnings.map((warning, index) => (
              <div key={index} className="text-xs text-yellow-300 flex gap-2">
                <span className="text-yellow-400 font-mono">•</span>
                <div>
                  <span className="font-semibold">{warning.type}:</span> {warning.message}
                  {warning.value !== undefined && warning.threshold !== undefined && (
                    <span className="text-yellow-400 ml-1">
                      ({warning.value.toFixed(1)} &gt; {warning.threshold.toFixed(1)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Override Checkbox */}
      {showOverride && errors.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isOverridden}
              onChange={e => handleOverrideChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-600 text-strava-orange focus:ring-strava-orange focus:ring-offset-gray-900"
            />
            <div>
              <span className="text-sm font-semibold text-white">Override Validation</span>
              <p className="text-xs text-gray-400 mt-1">
                I understand these errors may cause issues with GPS data, but I want to proceed
                anyway.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Action Guidance */}
      {errors.length > 0 && !isOverridden && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <p className="text-xs text-blue-200">
            <strong>Recommended actions:</strong>
          </p>
          <ul className="text-xs text-blue-300 mt-2 space-y-1 ml-4">
            <li>• Use editing tools to fix problematic sections</li>
            <li>• Remove points with impossible speeds or timestamps</li>
            <li>• Fill gaps or redraw sections with routing tools</li>
            {showOverride && <li>• Or check "Override Validation" to proceed anyway</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

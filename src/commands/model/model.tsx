import { c as _c } from 'react/compiler-runtime';
import chalk from 'chalk';
import * as React from 'react';
import type { CommandResultDisplay } from '../../commands.js';
import { ModelPicker } from '../../components/ModelPicker.js';
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js';
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../../services/analytics/index.js';
import { useAppState, useSetAppState } from '../../state/AppState.js';
import type { LocalJSXCommandCall } from '../../types/command.js';
import {
  getContextWindowForModel,
  getSessionContextWindowOverrideForModel,
  parseTrailingContextWindowOverride,
  setSessionContextWindowOverrideForModel,
} from '../../utils/context.js';
import { getEffortDisplayTitle, type EffortLevel } from '../../utils/effort.js';
import { isBilledAsExtraUsage } from '../../utils/extraUsage.js';
import {
  clearFastModeCooldown,
  isFastModeAvailable,
  isFastModeEnabled,
  isFastModeSupportedByModel,
} from '../../utils/fastMode.js';
import { MODEL_ALIASES } from '../../utils/model/aliases.js';
import { checkOpus1mAccess, checkSonnet1mAccess } from '../../utils/model/check1mAccess.js';
import {
  getDefaultMainLoopModelSetting,
  isOpus1mMergeEnabled,
  parseUserSpecifiedModel,
  renderDefaultModelSetting,
} from '../../utils/model/model.js';
import { isModelAllowed } from '../../utils/model/modelAllowlist.js';
function ModelPickerWrapper(t0) {
  const $ = _c(17);
  const { onDone } = t0;
  const mainLoopModel = useAppState(_temp);
  const mainLoopModelForSession = useAppState(_temp2);
  const isFastMode = useAppState(_temp3);
  const setAppState = useSetAppState();
  let t1;
  if ($[0] !== mainLoopModel || $[1] !== onDone) {
    t1 = function handleCancel() {
      logEvent('tengu_model_command_menu', {
        action: 'cancel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      });
      const displayModel = renderModelLabel(mainLoopModel);
      onDone(`Kept model as ${chalk.bold(displayModel)}`, {
        display: 'system',
      });
    };
    $[0] = mainLoopModel;
    $[1] = onDone;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const handleCancel = t1;
  let t2;
  if ($[3] !== isFastMode || $[4] !== mainLoopModel || $[5] !== onDone || $[6] !== setAppState) {
    t2 = function handleSelect(model, effort) {
      logEvent('tengu_model_command_menu', {
        action: model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        from_model: mainLoopModel as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        to_model: model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      });
      setAppState(prev => ({
        ...prev,
        mainLoopModel: model,
        mainLoopModelForSession: null,
      }));
      let message = `Set model to ${chalk.bold(renderModelLabel(model))}`;
      if (effort !== undefined) {
        message = message + ` with ${chalk.bold(getEffortDisplayTitle(effort))} effort`;
      }
      let wasFastModeToggledOn;
      if (isFastModeEnabled()) {
        clearFastModeCooldown();
        if (!isFastModeSupportedByModel(model) && isFastMode) {
          setAppState(_temp4);
          wasFastModeToggledOn = false;
        } else {
          if (isFastModeSupportedByModel(model) && isFastModeAvailable() && isFastMode) {
            message = message + ' \xB7 Fast mode ON';
            wasFastModeToggledOn = true;
          }
        }
      }
      if (isBilledAsExtraUsage(model, wasFastModeToggledOn === true, isOpus1mMergeEnabled())) {
        message = message + ' \xB7 Billed as extra usage';
      }
      if (wasFastModeToggledOn === false) {
        message = message + ' \xB7 Fast mode OFF';
      }
      onDone(message);
    };
    $[3] = isFastMode;
    $[4] = mainLoopModel;
    $[5] = onDone;
    $[6] = setAppState;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  const handleSelect = t2;
  let t3;
  if ($[8] !== isFastMode || $[9] !== mainLoopModel) {
    t3 = isFastModeEnabled() && isFastMode && isFastModeSupportedByModel(mainLoopModel) && isFastModeAvailable();
    $[8] = isFastMode;
    $[9] = mainLoopModel;
    $[10] = t3;
  } else {
    t3 = $[10];
  }
  let t4;
  if (
    $[11] !== handleCancel ||
    $[12] !== handleSelect ||
    $[13] !== mainLoopModel ||
    $[14] !== mainLoopModelForSession ||
    $[15] !== t3
  ) {
    t4 = (
      <ModelPicker
        initial={mainLoopModel}
        sessionModel={mainLoopModelForSession}
        onSelect={handleSelect}
        onCancel={handleCancel}
        isStandaloneCommand={true}
        showFastModeNotice={t3}
      />
    );
    $[11] = handleCancel;
    $[12] = handleSelect;
    $[13] = mainLoopModel;
    $[14] = mainLoopModelForSession;
    $[15] = t3;
    $[16] = t4;
  } else {
    t4 = $[16];
  }
  return t4;
}
function _temp4(prev_0) {
  return {
    ...prev_0,
    fastMode: false,
  };
}
function _temp3(s_1) {
  return s_1.fastMode;
}
function _temp2(s_0) {
  return s_0.mainLoopModelForSession;
}
function _temp(s) {
  return s.mainLoopModel;
}
function SetModelAndClose({
  args,
  onDone,
}: {
  args: string;
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay;
    },
  ) => void;
}): React.ReactNode {
  const isFastMode = useAppState(s => s.fastMode);
  const setAppState = useSetAppState();
  const parsedOverride = parseTrailingContextWindowOverride(args);
  const triedBudgetWithoutModel = /^\+\S+\s*$/i.test(args);
  const triedTrailingOverride = /\s+\+\S+\s*$/.test(args);
  const triedDefaultOverride = parsedOverride?.model.trim().toLowerCase() === 'default';
  const model = parsedOverride ? parsedOverride.model : args === 'default' ? null : args;
  React.useEffect(() => {
    async function handleModelChange(): Promise<void> {
      if (triedBudgetWithoutModel) {
        onDone('Specify a model before the context window override, e.g. /model my-model +200k.', {
          display: 'system',
        });
        return;
      }
      if (triedTrailingOverride && !parsedOverride) {
        onDone('Invalid context window override. Use /model [modelName] +200k or +1m.', {
          display: 'system',
        });
        return;
      }
      if (triedDefaultOverride) {
        onDone(
          'Context window overrides require an explicit model name. Use /model default to clear the model selection.',
          {
            display: 'system',
          },
        );
        return;
      }
      if (model && !isModelAllowed(model)) {
        onDone(`Model '${model}' is not available. Your organization restricts model selection.`, {
          display: 'system',
        });
        return;
      }

      // @[MODEL LAUNCH]: Update check for 1M access.
      if (model && isOpus1mUnavailable(model)) {
        onDone(
          `Opus 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`,
          {
            display: 'system',
          },
        );
        return;
      }
      if (model && isSonnet1mUnavailable(model)) {
        onDone(
          `Sonnet 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`,
          {
            display: 'system',
          },
        );
        return;
      }

      // Skip validation for default model
      if (!model) {
        setModel(null, undefined);
        return;
      }

      // Skip validation for known aliases - they're predefined and should work
      if (isKnownAlias(model)) {
        setModel(model, parsedOverride?.contextWindow);
        return;
      }

      setModel(model, parsedOverride?.contextWindow);
    }
    function setModel(modelValue: string | null, contextWindowOverride?: number): void {
      const resolvedModel = modelValue === null ? null : parseUserSpecifiedModel(modelValue);
      if (resolvedModel && contextWindowOverride === undefined) {
        setSessionContextWindowOverrideForModel(resolvedModel, 0);
      }
      setAppState(prev => ({
        ...prev,
        mainLoopModel: modelValue,
        mainLoopModelForSession: null,
      }));
      if (resolvedModel && contextWindowOverride !== undefined) {
        setSessionContextWindowOverrideForModel(resolvedModel, contextWindowOverride);
      }
      let message = `Set model to ${chalk.bold(renderModelLabel(modelValue))}`;
      if (resolvedModel && contextWindowOverride === undefined) {
        message += ' · Session context window reset';
      }
      if (modelValue && contextWindowOverride !== undefined) {
        const resolvedContextWindow = getContextWindowForModel(resolvedModel);
        message += ` · Session context window ${chalk.bold(formatContextWindow(resolvedContextWindow))}`;
      }
      if (modelValue && contextWindowOverride !== undefined) {
        const resolvedModel = parseUserSpecifiedModel(modelValue);
        const resolvedContextWindow = getContextWindowForModel(resolvedModel);
        message += ` · Session context window ${chalk.bold(formatContextWindow(resolvedContextWindow))}`;
      }
      let wasFastModeToggledOn;
      if (isFastModeEnabled()) {
        clearFastModeCooldown();
        if (!isFastModeSupportedByModel(modelValue) && isFastMode) {
          setAppState(prev_0 => ({
            ...prev_0,
            fastMode: false,
          }));
          wasFastModeToggledOn = false;
          // Do not update fast mode in settings since this is an automatic downgrade
        } else if (isFastModeSupportedByModel(modelValue) && isFastMode) {
          message += ` · Fast mode ON`;
          wasFastModeToggledOn = true;
        }
      }
      if (isBilledAsExtraUsage(modelValue, wasFastModeToggledOn === true, isOpus1mMergeEnabled())) {
        message += ` · Billed as extra usage`;
      }
      if (wasFastModeToggledOn === false) {
        // Fast mode was toggled off, show suffix after extra usage billing
        message += ` · Fast mode OFF`;
      }
      onDone(message);
    }
    void handleModelChange();
  }, [
    model,
    onDone,
    parsedOverride,
    setAppState,
    triedBudgetWithoutModel,
    triedDefaultOverride,
    triedTrailingOverride,
  ]);
  return null;
}
function isKnownAlias(model: string): boolean {
  return (MODEL_ALIASES as readonly string[]).includes(model.toLowerCase().trim());
}
function isOpus1mUnavailable(model: string): boolean {
  const m = model.toLowerCase();
  return !checkOpus1mAccess() && !isOpus1mMergeEnabled() && m.includes('opus') && m.includes('[1m]');
}
function isSonnet1mUnavailable(model: string): boolean {
  const m = model.toLowerCase();
  // Warn about Sonnet and Sonnet 4.6, but not Sonnet 4.5 since that had
  // a different access criteria.
  return !checkSonnet1mAccess() && (m.includes('sonnet[1m]') || m.includes('sonnet-4-6[1m]'));
}
function ShowModelAndClose(t0) {
  const { onDone } = t0;
  const mainLoopModel = useAppState(_temp7);
  const mainLoopModelForSession = useAppState(_temp8);
  const effortValue = useAppState(_temp9);
  const runtimeModel = parseUserSpecifiedModel(
    mainLoopModelForSession ?? mainLoopModel ?? getDefaultMainLoopModelSetting(),
  );
  const sessionContextWindowOverride = getSessionContextWindowOverrideForModel(runtimeModel);
  const contextWindowInfo = ` (context: ${formatContextWindow(getContextWindowForModel(runtimeModel))}${sessionContextWindowOverride !== undefined ? ', session override' : ''})`;
  const displayModel = renderModelLabel(mainLoopModel);
  const effortInfo = effortValue !== undefined ? ` (effort: ${getEffortDisplayTitle(effortValue)})` : '';
  if (mainLoopModelForSession) {
    onDone(
      `Current model: ${chalk.bold(renderModelLabel(mainLoopModelForSession))} (session override from plan mode)${contextWindowInfo}\nBase model: ${displayModel}${effortInfo}`,
    );
  } else {
    onDone(`Current model: ${displayModel}${effortInfo}${contextWindowInfo}`);
  }
  return null;
}
function _temp9(s_1) {
  return s_1.effortValue;
}
function _temp8(s_0) {
  return s_0.mainLoopModelForSession;
}
function _temp7(s) {
  return s.mainLoopModel;
}
export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  args = args?.trim() || '';
  if (COMMON_INFO_ARGS.includes(args)) {
    logEvent('tengu_model_command_inline_help', {
      args: args as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    });
    return <ShowModelAndClose onDone={onDone} />;
  }
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone(
      'Run /model to open the model selection menu, /model [modelName] to set the model, or /model [modelName] +200k to set a session context window.',
      {
        display: 'system',
      },
    );
    return;
  }
  if (args) {
    logEvent('tengu_model_command_inline', {
      args: args as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    });
    return <SetModelAndClose args={args} onDone={onDone} />;
  }
  return <ModelPickerWrapper onDone={onDone} />;
};
function renderModelLabel(model: string | null): string {
  const rendered = renderDefaultModelSetting(model ?? getDefaultMainLoopModelSetting());
  return model === null ? `${rendered} (default)` : rendered;
}
function formatContextWindow(contextWindow: number): string {
  if (contextWindow >= 1_000_000 && contextWindow % 1_000_000 === 0) {
    return `${contextWindow / 1_000_000}M`;
  }
  if (contextWindow >= 1_000 && contextWindow % 1_000 === 0) {
    return `${contextWindow / 1_000}k`;
  }
  return new Intl.NumberFormat('en-US').format(contextWindow);
}

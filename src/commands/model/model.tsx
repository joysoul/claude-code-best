import chalk from 'chalk'
import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { ModelPicker } from '../../components/ModelPicker.js'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../../services/analytics/index.js'
import { useAppState, useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  getContextWindowForModel,
  getSessionContextWindowOverrideForModel,
  parseTrailingContextWindowOverride,
  setSessionContextWindowOverrideForModel,
} from '../../utils/context.js'
import type { EffortLevel } from '../../utils/effort.js'
import { getEffortDisplayTitle } from '../../utils/effort.js'
import { isBilledAsExtraUsage } from '../../utils/extraUsage.js'
import {
  clearFastModeCooldown,
  isFastModeAvailable,
  isFastModeEnabled,
  isFastModeSupportedByModel,
} from '../../utils/fastMode.js'
import { MODEL_ALIASES } from '../../utils/model/aliases.js'
import {
  checkOpus1mAccess,
  checkSonnet1mAccess,
} from '../../utils/model/check1mAccess.js'
import {
  getDefaultMainLoopModelSetting,
  isOpus1mMergeEnabled,
  parseUserSpecifiedModel,
  renderDefaultModelSetting,
} from '../../utils/model/model.js'
import { isModelAllowed } from '../../utils/model/modelAllowlist.js'

function ModelPickerWrapper({
  onDone,
}: {
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
}): React.ReactNode {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)
  const isFastMode = useAppState(s => s.fastMode)
  const setAppState = useSetAppState()

  function handleCancel(): void {
    logEvent('tengu_model_command_menu', {
      action:
        'cancel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    const displayModel = renderModelLabel(mainLoopModel)
    onDone(`Kept model as ${chalk.bold(displayModel)}`, {
      display: 'system',
    })
  }

  function handleSelect(
    model: string | null,
    effort: EffortLevel | undefined,
  ): void {
    logEvent('tengu_model_command_menu', {
      action:
        model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      from_model:
        mainLoopModel as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      to_model:
        model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    setAppState(prev => ({
      ...prev,
      mainLoopModel: model,
      mainLoopModelForSession: null,
    }))

    let message = `Set model to ${chalk.bold(renderModelLabel(model))}`
    if (effort !== undefined) {
      message += ` with ${chalk.bold(getEffortDisplayTitle(effort))} effort`
    }

    // Turn off fast mode if switching to unsupported model
    let wasFastModeToggledOn = undefined
    if (isFastModeEnabled()) {
      clearFastModeCooldown()
      if (!isFastModeSupportedByModel(model) && isFastMode) {
        setAppState(prev => ({
          ...prev,
          fastMode: false,
        }))
        wasFastModeToggledOn = false
        // Do not update fast mode in settings since this is an automatic downgrade
      } else if (
        isFastModeSupportedByModel(model) &&
        isFastModeAvailable() &&
        isFastMode
      ) {
        message += ` · Fast mode ON`
        wasFastModeToggledOn = true
      }
    }

    if (
      isBilledAsExtraUsage(
        model,
        wasFastModeToggledOn === true,
        isOpus1mMergeEnabled(),
      )
    ) {
      message += ` · Billed as extra usage`
    }

    if (wasFastModeToggledOn === false) {
      // Fast mode was toggled off, show suffix after extra usage billing
      message += ` · Fast mode OFF`
    }

    onDone(message)
  }

  return (
    <ModelPicker
      initial={mainLoopModel}
      sessionModel={mainLoopModelForSession}
      onSelect={handleSelect}
      onCancel={handleCancel}
      isStandaloneCommand
      showFastModeNotice={
        isFastModeEnabled() &&
        isFastMode &&
        isFastModeSupportedByModel(mainLoopModel) &&
        isFastModeAvailable()
      }
    />
  )
}

function SetModelAndClose({
  args,
  onDone,
}: {
  args: string
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
}): React.ReactNode {
  const isFastMode = useAppState(s => s.fastMode)
  const setAppState = useSetAppState()
  const parsedOverride = parseTrailingContextWindowOverride(args)
  const triedBudgetWithoutModel = /^\+\S+\s*$/i.test(args)
  const triedTrailingOverride = /\s+\+\S+\s*$/.test(args)
  const triedDefaultOverride = parsedOverride?.model.trim().toLowerCase() === 'default'
  const model = parsedOverride ? parsedOverride.model : args === 'default' ? null : args

  React.useEffect(() => {
    async function handleModelChange(): Promise<void> {
      if (triedBudgetWithoutModel) {
        onDone('Specify a model before the context window override, e.g. /model my-model +200k.', {
          display: 'system',
        })
        return
      }
      if (triedTrailingOverride && !parsedOverride) {
        onDone('Invalid context window override. Use /model [modelName] +200k or +1m.', {
          display: 'system',
        })
        return
      }
      if (triedDefaultOverride) {
        onDone(
          'Context window overrides require an explicit model name. Use /model default to clear the model selection.',
          { display: 'system' },
        )
        return
      }

      if (model && !isModelAllowed(model)) {
        onDone(
          `Model '${model}' is not available. Your organization restricts model selection.`,
          { display: 'system' },
        )
        return
      }

      // @[MODEL LAUNCH]: Update check for 1M access.
      if (model && isOpus1mUnavailable(model)) {
        onDone(
          `Opus 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`,
          { display: 'system' },
        )
        return
      }

      if (model && isSonnet1mUnavailable(model)) {
        onDone(
          `Sonnet 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`,
          { display: 'system' },
        )
        return
      }

      // Skip validation for default model
      if (!model) {
        setModel(null, undefined)
        return
      }

      // Skip validation for known aliases - they're predefined and should work
      if (isKnownAlias(model)) {
        setModel(model, parsedOverride?.contextWindow)
        return
      }

      // 直接本地切换模型，不在 /model 阶段发起在线校验请求。
      // 实际是否可用由后续真正发请求时的 provider / API 返回结果决定。
      setModel(model, parsedOverride?.contextWindow)
    }

    function setModel(modelValue: string | null, contextWindow: number | undefined): void {
      const resolvedModel = modelValue === null ? null : parseUserSpecifiedModel(modelValue)
      if (resolvedModel && contextWindow === undefined) {
        setSessionContextWindowOverrideForModel(resolvedModel, 0)
      }
      if (resolvedModel && contextWindow !== undefined) {
        setSessionContextWindowOverrideForModel(resolvedModel, contextWindow)
      }
      setAppState(prev => ({
        ...prev,
        mainLoopModel: modelValue,
        mainLoopModelForSession: null,
      }))
      let message = `Set model to ${chalk.bold(renderModelLabel(modelValue))}`
      if (resolvedModel && contextWindow === undefined) {
        message += ' · Session context window reset'
      }
      if (modelValue && contextWindow !== undefined) {
        const resolvedContextWindow = getContextWindowForModel(resolvedModel)
        message += ` · Session context window ${chalk.bold(formatContextWindow(resolvedContextWindow))}`
      }

      let wasFastModeToggledOn = undefined
      if (isFastModeEnabled()) {
        clearFastModeCooldown()
        if (!isFastModeSupportedByModel(modelValue) && isFastMode) {
          setAppState(prev => ({
            ...prev,
            fastMode: false,
          }))
          wasFastModeToggledOn = false
          // Do not update fast mode in settings since this is an automatic downgrade
        } else if (isFastModeSupportedByModel(modelValue) && isFastMode) {
          message += ` · Fast mode ON`
          wasFastModeToggledOn = true
        }
      }

      if (
        isBilledAsExtraUsage(
          modelValue,
          wasFastModeToggledOn === true,
          isOpus1mMergeEnabled(),
        )
      ) {
        message += ` · Billed as extra usage`
      }

      if (wasFastModeToggledOn === false) {
        // Fast mode was toggled off, show suffix after extra usage billing
        message += ` · Fast mode OFF`
      }

      onDone(message)
    }

    void handleModelChange()
  }, [model, onDone, setAppState, parsedOverride, triedBudgetWithoutModel, triedDefaultOverride, triedTrailingOverride])

  return null
}

function isKnownAlias(model: string): boolean {
  return (MODEL_ALIASES as readonly string[]).includes(
    model.toLowerCase().trim(),
  )
}

function isOpus1mUnavailable(model: string): boolean {
  const m = model.toLowerCase()
  return (
    !checkOpus1mAccess() &&
    !isOpus1mMergeEnabled() &&
    m.includes('opus') &&
    m.includes('[1m]')
  )
}

function isSonnet1mUnavailable(model: string): boolean {
  const m = model.toLowerCase()
  // Warn about Sonnet and Sonnet 4.6, but not Sonnet 4.5 since that had
  // a different access criteria.
  return (
    !checkSonnet1mAccess() &&
    (m.includes('sonnet[1m]') || m.includes('sonnet-4-6[1m]'))
  )
}

function ShowModelAndClose({
  onDone,
}: {
  onDone: (result?: string) => void
}): React.ReactNode {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)
  const effortValue = useAppState(s => s.effortValue)
  const runtimeModel = parseUserSpecifiedModel(
    mainLoopModelForSession ?? mainLoopModel ?? getDefaultMainLoopModelSetting(),
  )
  const sessionContextWindowOverride = getSessionContextWindowOverrideForModel(runtimeModel)
  const contextWindowInfo = ` (context: ${formatContextWindow(getContextWindowForModel(runtimeModel))}${sessionContextWindowOverride !== undefined ? ', session override' : ''})`
  const displayModel = renderModelLabel(mainLoopModel)
  const effortInfo =
    effortValue !== undefined ? ` (effort: ${getEffortDisplayTitle(effortValue)})` : ''

  if (mainLoopModelForSession) {
    onDone(
      `Current model: ${chalk.bold(renderModelLabel(mainLoopModelForSession))} (session override from plan mode)\nBase model: ${displayModel}${effortInfo}${contextWindowInfo}`,
    )
  } else {
    onDone(`Current model: ${displayModel}${effortInfo}${contextWindowInfo}`)
  }

  return null
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  args = args?.trim() || ''
  if (COMMON_INFO_ARGS.includes(args)) {
    logEvent('tengu_model_command_inline_help', {
      args: args as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return <ShowModelAndClose onDone={onDone} />
  }
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone(
      'Run /model to open the model selection menu, /model [modelName] to set the model, or /model [modelName] +200k to set a session context window.',
      { display: 'system' },
    )
    return
  }

  if (args) {
    logEvent('tengu_model_command_inline', {
      args: args as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return <SetModelAndClose args={args} onDone={onDone} />
  }

  return <ModelPickerWrapper onDone={onDone} />
}

function renderModelLabel(model: string | null): string {
  const rendered = renderDefaultModelSetting(
    model ?? getDefaultMainLoopModelSetting(),
  )
  return model === null ? `${rendered} (default)` : rendered
}

function formatContextWindow(contextWindow: number): string {
  if (contextWindow >= 1_000_000 && contextWindow % 1_000_000 === 0) {
    return `${contextWindow / 1_000_000}M`
  }
  if (contextWindow >= 1_000 && contextWindow % 1_000 === 0) {
    return `${contextWindow / 1_000}k`
  }
  return new Intl.NumberFormat('en-US').format(contextWindow)
}

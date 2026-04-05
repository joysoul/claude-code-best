import { afterEach, describe, expect, test } from 'bun:test'
import {
  getContextWindowForModel,
  getSessionContextWindowOverrideForModel,
  parseTrailingContextWindowOverride,
  resetSessionContextWindowOverridesForTests,
  setSessionContextWindowOverrideForModel,
} from '../context'

afterEach(() => {
  resetSessionContextWindowOverridesForTests()
})

describe('parseTrailingContextWindowOverride', () => {
  test('parses model and trailing shorthand override', () => {
    expect(parseTrailingContextWindowOverride('my-model +200k')).toEqual({
      model: 'my-model',
      contextWindow: 200_000,
    })
  })

  test('parses decimal megatoken override', () => {
    expect(parseTrailingContextWindowOverride('custom-model +1.5m')).toEqual({
      model: 'custom-model',
      contextWindow: 1_500_000,
    })
  })

  test('returns null when trailing override is missing', () => {
    expect(parseTrailingContextWindowOverride('my-model')).toBeNull()
  })

  test('returns null when input is only a budget', () => {
    expect(parseTrailingContextWindowOverride('+200k')).toBeNull()
  })
})

describe('session context window overrides', () => {
  test('stores and reads override case-insensitively', () => {
    setSessionContextWindowOverrideForModel('My-Model', 250_000)
    expect(getSessionContextWindowOverrideForModel('my-model')).toBe(250_000)
  })

  test('deletes override when set to non-positive value', () => {
    setSessionContextWindowOverrideForModel('my-model', 250_000)
    setSessionContextWindowOverrideForModel('my-model', 0)
    expect(getSessionContextWindowOverrideForModel('my-model')).toBeUndefined()
  })

  test('takes precedence in getContextWindowForModel', () => {
    setSessionContextWindowOverrideForModel('my-model', 350_000)
    expect(getContextWindowForModel('my-model')).toBe(350_000)
  })
})

import { readInstanceConfig, writeInstanceConfig } from "../runtime/instance.js";
const budget = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0;
export function loadPublisherSecrets(ctx) { const value = readInstanceConfig(ctx, 'publisher'); if (value.apiKey != null && typeof value.apiKey !== 'string')
    throw Error('Invalid private publisher configuration'); return { apiKey: process.env.WORKBENCH_PUBLISHER_API_KEY || value.apiKey || null, maxCreditsPerPost: budget(value.maxCreditsPerPost), maxCreditsPerDay: budget(value.maxCreditsPerDay) }; }
export function publisherMetadata(value) { return { configured: Boolean(value.apiKey), masked: value.apiKey ? '********' : null, maxCreditsPerPost: value.maxCreditsPerPost, maxCreditsPerDay: value.maxCreditsPerDay }; }
export function savePublisherSecrets(ctx, value, auth) { if (!auth.allowed)
    throw Error('Owner login required'); if (value.apiKey !== null && (typeof value.apiKey !== 'string' || value.apiKey.length > 4096))
    throw Error('Invalid publisher credentials'); if (budget(value.maxCreditsPerPost) !== value.maxCreditsPerPost || budget(value.maxCreditsPerDay) !== value.maxCreditsPerDay)
    throw Error('Invalid publisher budget'); writeInstanceConfig(ctx, 'publisher', value); }
export function requirePublisherBudget(value, credits) { if (!value.apiKey || !Number.isSafeInteger(credits) || credits < 1 || value.maxCreditsPerPost < credits || value.maxCreditsPerDay < credits)
    throw Error('Publisher credentials and explicit credit budgets required'); }

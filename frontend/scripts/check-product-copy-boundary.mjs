import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { messages } from '../src/i18n.js';

const FORBIDDEN_PRODUCT_COPY = /StopOfRoute|RouteUID|\bendpoint\b|evidence fallback|\bp95\b|\bschema\b|\bPOC\b|\bETA\b|direction 0|direction 1|方向 0|方向 1|\bdebug\b|\bfixture\b|\bprototype\b|\bAPI\b|\baudit\b/i;
const PRODUCT_COPY_PREFIXES = [
  'oversight.',
  'routeQuality.',
  'routeProgress.',
  'routeProgressEncoding.',
  'signal.',
  'analytics.',
  'routeHealth.',
  'routeService.',
  'routeOperators.',
  'routeDirectory.',
];

const templateChecks = [
  {
    file: 'src/BusOversightDashboard.vue',
    extract: (text) => text.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? '',
    message: 'bus oversight template contains implementation wording',
  },
  {
    file: 'src/OperationsExplorer.vue',
    extract: (text) => text.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? '',
    message: 'operations explorer template contains implementation wording',
  },
];

function userVisibleValue(value) {
  return String(value).replaceAll(/\{[^}]+\}/g, '');
}

function visibleTemplateText(template) {
  return [...template.matchAll(/>([^<>{}][^<]*)</g)]
    .map((match) => match[1].replaceAll(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const messageFailures = Object.entries(messages).flatMap(([locale, dictionary]) => (
  Object.entries(dictionary)
    .filter(([key]) => PRODUCT_COPY_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .filter(([, value]) => FORBIDDEN_PRODUCT_COPY.test(userVisibleValue(value)))
    .map(([key, value]) => `${locale}:${key}: implementation wording in product copy: ${value}`)
));

const templateFailures = templateChecks.flatMap((check) => {
  const text = readFileSync(new URL(`../${check.file}`, import.meta.url), 'utf8');
  const template = check.extract(text);
  const target = visibleTemplateText(template);
  return FORBIDDEN_PRODUCT_COPY.test(target) ? [`${check.file}: ${check.message}`] : [];
});

const failures = [...messageFailures, ...templateFailures];

assert.equal(failures.length, 0, failures.join('\n'));

console.log('product copy boundary checks passed');

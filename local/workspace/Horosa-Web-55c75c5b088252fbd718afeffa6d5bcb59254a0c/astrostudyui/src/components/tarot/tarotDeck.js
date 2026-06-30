// [门面] 塔罗牌库——re-export 自 engine/decks(通用 deck schema)。保现有 import 零改动。
// 实现已迁至 decks/core78.js(78 张骨架 + 富对应字段)+ decks/correspondences.js(事实对应表)。
export { SUIT_META, CORE78 as TAROT_DECK, getCard, cardKeywords } from './decks/core78.js';
export { PUBLIC_DOMAIN_ATTRIBUTION } from './decks/meanings78.js';

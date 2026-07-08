// [门面] 确定性洗牌——re-export 自 engine/shuffle。tarotShuffle(seed) 与旧版字节一致(78/p=0.5)。
// 通用 size 感知洗牌见 engine/shuffle.js 的 shuffle(seed,{size,usesReversals,pReversed})。
export { tarotShuffle, shuffle } from './engine/shuffle.js';
export { tarotShuffle as default } from './engine/shuffle.js';

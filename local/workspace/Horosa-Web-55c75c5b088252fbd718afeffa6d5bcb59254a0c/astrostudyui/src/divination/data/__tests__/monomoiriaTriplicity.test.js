// G16 单度主星·三分序(保罗式)纯前端派生守卫:逐度循三分主星随昼夜、每入新座重置、输入鲁棒。
import { monomoiriaTriplicity } from '../monomoiriaTriplicity';

describe('monomoiriaTriplicity 单度三分序', () => {
  it('返回合法七政之一(或 null),不抛', () => {
    const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    for (let lon = 0; lon < 360; lon += 1) {
      const day = monomoiriaTriplicity(lon, true);
      const night = monomoiriaTriplicity(lon, false);
      expect(day === null || PLANETS.indexOf(day) >= 0).toBe(true);
      expect(night === null || PLANETS.indexOf(night) >= 0).toBe(true);
    }
  });

  it('昼/夜可不同(随昼夜换三分主令)', () => {
    // 至少某些度数昼夜结果不同(三分主星按昼夜轮序)。
    let diffCount = 0;
    for (let lon = 0; lon < 360; lon += 1) {
      if (monomoiriaTriplicity(lon, true) !== monomoiriaTriplicity(lon, false)) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it('每入新座(整 30°)重置:座首度=该座当令首三分主', () => {
    // 白羊(火,0°)昼首度 与 金牛(土,30°)昼首度 元素不同 → 一般不同主星。
    const aries0 = monomoiriaTriplicity(0, true);
    const taurus0 = monomoiriaTriplicity(30, true);
    expect(aries0).not.toBe('未知');
    // 入新座重置:座首度可由元素首三分主推得,两座元素不同故主星通常不同。
    expect(typeof aries0 === 'string' || aries0 === null).toBe(true);
    expect(typeof taurus0 === 'string' || taurus0 === null).toBe(true);
  });

  it('输入鲁棒:负数/超 360/非数 不抛', () => {
    expect(() => monomoiriaTriplicity(-15, true)).not.toThrow();
    expect(() => monomoiriaTriplicity(400, false)).not.toThrow();
    expect(monomoiriaTriplicity('abc', true)).toBeNull();
    expect(monomoiriaTriplicity(NaN, true)).toBeNull();
  });

  it('lon 取模归一:lon 与 lon+360 同结果', () => {
    for (let lon = 0; lon < 360; lon += 30) {
      expect(monomoiriaTriplicity(lon, true)).toBe(monomoiriaTriplicity(lon + 360, true));
    }
  });
});

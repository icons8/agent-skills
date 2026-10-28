// How far the limbs of a scene swing: the largest rotation of a limb part about its joint and the largest bone bend,
// degrees from rest. A hint for the judge and a column of the run record, not a gate of the build.
//
// Limbs are found by part names (arms, legs, hands, feet, forearms, ...). Rotation is the part's own, relative to its parent
// and to rest (the swing at its joint); bend is the largest bone angle of a part with `bones`.
//
// THRESHOLD comes from the approved reference scenes in which a limb moves (largest limb angle of each, rotation or bend):
// runner of the loader 40, witch 40, skeleton 44, space explorer 44 (bend), AI worker 25, collaboration 17.5, ghost 16 (bend),
// hiker 14, robot hand on a screen 11 (a hand tapping, no body). The hiker, the walking reference, is the smallest figure with
// a body: below its 14° the gesture reads as stiff. The 2D test had a median of 9°.
const { valueAt } = require('../lottie/keys');

const THRESHOLD = 14;
// rotation of 180° and more is a spin (a wheel, a loader ring), not a swing
const SPIN = 180;

const LIMB = new RegExp(
  '^(?:[LR]?ARM(?:_\\w+|\\d*)|FOREARM\\w*|FORE(?:_\\w+)?|LEG(?:_\\w+|\\d*)|[LR]_(?:SH|UP|ELB|FORE|FING|WR|HAND)|(?:TH|SH|KN|AN|FT)_[AB]'
  + '|(?:BOOT|FOOT|SHOE|SHIN|THIGH|KNEE|WRIST|ELBOW|FIST|FINGERS?|THUMB|PAW)(?:_\\w+)?|HAND(?!LE)\\w*|[LR]H(?:_F\\d)?|[UF]AE|NH_THIGH'
  + '|CAT_(?:FF|FH|NH|NF))$', 'i');
const isLimb = (name) => LIMB.test(String(name).split('·')[0]);

const asArr = (v) => (Array.isArray(v) ? v : [v]);
const animated = (P) => P && P.a === 1;

// largest |value| of an animated property over the loop (rotation: one number, bend: one per bone)
function peak(P, op) {
  let m = 0;
  for (let t = 0; t <= op; t++) m = Math.max(m, ...asArr(valueAt(P, t)).map(Math.abs));
  return m;
}

// layers: Lottie layers named after parts; bendOf(layer) → animated bend property or null
function measure(layers, op, bendOf = () => null) {
  const limbs = [];
  for (const L of layers) {
    if (!isLimb(L.nm)) continue;
    const bend = bendOf(L);
    const rot = L.ks && animated(L.ks.r) ? peak(L.ks.r, op) : 0;
    const b = bend ? peak(bend, op) : 0;
    limbs.push({ part: L.nm, rotation: rot >= SPIN ? 0 : +rot.toFixed(1), bend: +b.toFixed(1) });
  }
  const top = (k) => limbs.reduce((m, l) => (l[k] > (m ? m[k] : 0) ? l : m), null);
  const r = top('rotation'), b = top('bend');
  return {
    limbs: limbs.length,
    max_rotation: r ? r.rotation : 0, rotation_part: r ? r.part : '',
    max_bend: b ? b.bend : 0, bend_part: b ? b.part : '',
  };
}

// the verdict: n/a — no limb parts by name (an object, an icon), "pass" — a limb swings at least THRESHOLD, "low" — less
function verdict(m) {
  if (!m.limbs) return 'n/a';
  return Math.max(m.max_rotation, m.max_bend) >= THRESHOLD ? 'pass' : 'low';
}

// a scene: the built Lottie plus the model give rotation and bend
function ofModel(inner, model) {
  const m = measure(inner.layers.filter((L) => model.parts[L.nm]), model.op, (L) => model.parts[L.nm].bendProp || null);
  return { ...m, threshold: THRESHOLD, verdict: verdict(m) };
}

// a finished Lottie file: rotation only (the bend is baked into the paths); a loop wrapped by `start` sits in the first asset
function ofLottie(lottie) {
  let layers = lottie.layers || [];
  if (layers.length && layers.every((L) => L.ty === 0) && lottie.assets && lottie.assets[0]) layers = lottie.assets[0].layers || [];
  const m = measure(layers, lottie.op || 0);
  return { ...m, max_bend: null, bend_part: '', threshold: THRESHOLD, verdict: verdict(m) };
}

// Knee direction against the way the character faces (scene.facing "left" | "right"): a knee bends so that the shin goes BEHIND the
// thigh, i.e. the foot goes away from the face. On screen a clockwise (positive) bend of a shin that hangs down moves the foot to the
// left, so for a character facing left the knee bend must be negative and for one facing right positive. Only legs with 3+ joints whose
// drawn shin hangs within 60° of the vertical are judged (a leg drawn folded unfolds either way); the dominant bend (largest, signed)
// of the knee bone decides. Result: { dir: 'ok' | 'reversed' | 'n/a', part, bend }.
function kneeDirection(model, facing) {
  const none = { dir: 'n/a', part: '', bend: 0 };
  if (facing !== 'left' && facing !== 'right') return none;
  const want = facing === 'left' ? -1 : 1;
  let worst = null, seen = null;
  for (const [name, p] of Object.entries(model.parts)) {
    if (!/^(?:[LR]?LEG|THIGH|NH_THIGH)/i.test(name) || !p.bones || !p.bendProp || p.bones.joints.length < 3) continue;
    const [k, a] = [p.bones.joints[1], p.bones.joints[2]];
    const off = Math.abs(Math.atan2(a[0] - k[0], a[1] - k[1]) * 180 / Math.PI);
    if (off > 60) continue;
    let dom = 0;
    for (let t = 0; t <= model.op; t++) { const v = asArr(valueAt(p.bendProp, t))[1] || 0; if (Math.abs(v) > Math.abs(dom)) dom = v; }
    if (Math.abs(dom) < 10) continue;
    const rec = { dir: Math.sign(dom) === want ? 'ok' : 'reversed', part: name, bend: +dom.toFixed(1) };
    seen = seen || rec;
    if (rec.dir === 'reversed' && !worst) worst = rec;
  }
  return worst || seen || none;
}

module.exports = { kneeDirection, ofModel, ofLottie, measure, verdict, isLimb, THRESHOLD };

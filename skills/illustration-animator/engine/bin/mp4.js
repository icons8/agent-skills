// usage (macOS): node engine/bin/mp4.js <out dir> — MP4 for every scene marked pending: ["mp4"]
const fs = require("fs");
const path = require("path");
const { loadTools } = require("../src/setup");
const { mp4FromMov, hevcHasAlpha } = require("../src/render/encode");

const tools = loadTools();
if (!tools.hevc) throw new Error("MP4 is built on Mac only");
const dir = path.resolve(process.argv[2]);
let made = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".status.json"))) {
  const file = path.join(dir, f);
  const st = JSON.parse(fs.readFileSync(file, "utf8"));
  if (st.state !== "done" || st.lottieOnly || !(st.pending || []).includes("mp4")) continue;
  if (!fs.existsSync(path.join(dir, `${st.name}.mov`))) continue;
  const mp4 = mp4FromMov(tools, path.join(dir, `${st.name}.mov`));
  if (!hevcHasAlpha(tools, mp4)) throw new Error(`${st.name}: MP4 has no alpha layer`);
  st.pending = st.pending.filter((x) => x !== "mp4");
  if (!st.pending.length) delete st.pending;
  fs.writeFileSync(file, JSON.stringify(st, null, 2));
  made++;
}
console.log("MP4 done:", made);

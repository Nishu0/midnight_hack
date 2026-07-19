import { TICK_COUNT, tickToPrice } from "@/config";
import type { OracleSeries } from "@/api/oracle-api";

// clearing tick per batch as a line, with the vwap marked. prices produced on-chain
// without a single order ever being public.
type Props = { series?: OracleSeries };

export function OracleWidget({ series }: Props) {
  const points = series?.points ?? [];
  const vwap = series?.vwapTick ?? null;

  return (
    <section className="card rise">
      <div className="eyebrow">on-chain price feed</div>
      <h2>batch oracle</h2>
      <p className="hint">clearing price per settled batch · vwap from public volumes only</p>

      {points.length === 0 ? (
        <p className="hint" style={{ textAlign: "center", padding: "24px 0" }}>
          no batches recorded yet — settle a batch to publish its clearing price.
        </p>
      ) : (
        <>
          <div className="oracle-chart">
            {points.map((p) => {
              const h = (p.tick / (TICK_COUNT - 1)) * 100;
              return (
                <div className="ocol" key={p.batchId.toString()} title={`batch ${p.batchId} · tick ${p.tick} · vol ${p.volume}`}>
                  <div className="obar-wrap">
                    <span className="obar" style={{ height: `${Math.max(4, h)}%` }} />
                  </div>
                  <label>#{p.batchId.toString()}</label>
                </div>
              );
            })}
          </div>
          <div className="oracle-stats">
            <div>
              <span>{points[points.length - 1] ? tickToPrice(points[points.length - 1].tick).toFixed(3) : "—"}</span>
              last price
            </div>
            <div>
              <span>{vwap !== null ? tickToPrice(vwap).toFixed(3) : "—"}</span>
              vwap
            </div>
            <div>
              <span>{series?.cumVolume.toString() ?? "0"}</span>
              total volume
            </div>
          </div>
        </>
      )}
    </section>
  );
}

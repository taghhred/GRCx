import type {
  ReportWatermark,
  WatermarkPosition,
} from "../../mocks/types/reports";
import styles from "./WizardShared.module.css";

const PRESET_TEXTS = [
  "GRCx",
  "Confidential",
  "Internal Use Only",
  "Draft",
  "Custom Text",
] as const;

const POSITIONS: WatermarkPosition[] = [
  "Center",
  "Top Left",
  "Top Right",
  "Bottom Left",
  "Bottom Right",
];

interface WatermarkSettingsProps {
  value: ReportWatermark;
  onChange: (value: ReportWatermark) => void;
}

export default function WatermarkSettings({
  value,
  onChange,
}: WatermarkSettingsProps) {
  return (
    <div className={styles.stack}>
      <div className={styles.chipRow} role="group" aria-label="Watermark toggle">
        <button
          type="button"
          className={`${styles.chip} ${value.enabled ? styles.chipActive : ""}`}
          onClick={() => onChange({ ...value, enabled: true })}
        >
          Enable Watermark
        </button>
        <button
          type="button"
          className={`${styles.chip} ${!value.enabled ? styles.chipActive : ""}`}
          onClick={() => onChange({ ...value, enabled: false })}
        >
          Disable Watermark
        </button>
      </div>

      <div className={styles.chipRow} role="group" aria-label="Watermark text presets">
        {PRESET_TEXTS.map((text) => (
          <button
            key={text}
            type="button"
            className={`${styles.chip} ${value.text === text || (text === "Custom Text" && !PRESET_TEXTS.slice(0, 4).includes(value.text as never)) ? styles.chipActive : ""}`}
            onClick={() =>
              onChange({
                ...value,
                text: text === "Custom Text" ? value.text || "Custom" : text,
              })
            }
          >
            {text}
          </button>
        ))}
      </div>

      <div className={styles.formGrid}>
        <label className={`${styles.field} ${styles.full}`}>
          <span>Text</span>
          <input
            type="text"
            value={value.text}
            maxLength={40}
            disabled={!value.enabled}
            onChange={(event) => onChange({ ...value, text: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Opacity ({value.opacity}%)</span>
          <input
            type="range"
            min={4}
            max={40}
            value={value.opacity}
            disabled={!value.enabled}
            onChange={(event) =>
              onChange({ ...value, opacity: Number(event.target.value) })
            }
          />
        </label>
        <label className={styles.field}>
          <span>Position</span>
          <select
            value={value.position}
            disabled={!value.enabled}
            onChange={(event) =>
              onChange({
                ...value,
                position: event.target.value as WatermarkPosition,
              })
            }
          >
            {POSITIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Rotation ({value.rotation}°)</span>
          <input
            type="range"
            min={-60}
            max={60}
            value={value.rotation}
            disabled={!value.enabled}
            onChange={(event) =>
              onChange({ ...value, rotation: Number(event.target.value) })
            }
          />
        </label>
        <label className={styles.field}>
          <span>Font Size ({value.fontSize}px)</span>
          <input
            type="range"
            min={32}
            max={96}
            value={value.fontSize}
            disabled={!value.enabled}
            onChange={(event) =>
              onChange({ ...value, fontSize: Number(event.target.value) })
            }
          />
        </label>
      </div>
    </div>
  );
}

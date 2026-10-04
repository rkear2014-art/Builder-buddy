import { UNITS } from "@/lib/constants";

export function UnitSelect({ defaultValue = "each" }: { defaultValue?: string }) {
  return (
    <select name="unit" required defaultValue={defaultValue}>
      {UNITS.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}

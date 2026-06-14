import { useState, useMemo } from "react";

export default function usePassword(initial = "", min = 8, max = 64) {
  const [value, setValue] = useState(initial);
  const [show, setShow] = useState(false);
  const meta = useMemo(
    () => ({
      length: value.length,
      valid: value.length >= min && value.length <= max,
      min,
      max,
    }),
    [value, min, max],
  );

  const reset = (v = "") => setValue(v);
  const toggleShow = () => setShow((s) => !s);

  return { value, setValue, meta, reset, show, toggleShow } as const;
}

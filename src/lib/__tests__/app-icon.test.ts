import { describe, expect, it } from "vitest";
import { resolveAppIcon } from "@/lib/app-icon";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";

describe("icône de l'app", () => {
  it("sans choix : F ♥ A sur iPhone, cœur néon ailleurs (Mac, iPad)", () => {
    expect(resolveAppIcon(undefined, IPHONE)).toBe("fa");
    expect(resolveAppIcon(undefined, MAC)).toBe("neon");
  });

  it("le choix enregistré l'emporte sur l'appareil", () => {
    expect(resolveAppIcon("neon", IPHONE)).toBe("neon");
    expect(resolveAppIcon("fa", MAC)).toBe("fa");
  });

  it("une valeur inconnue est ignorée", () => {
    expect(resolveAppIcon("pirate", IPHONE)).toBe("fa");
    expect(resolveAppIcon("", MAC)).toBe("neon");
  });
});

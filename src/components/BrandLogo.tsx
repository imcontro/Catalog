import Image from "next/image";

type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={compact ? "brandLogo brandLogoCompact" : "brandLogo"}>
      <Image
        src="/brand/logo-napitki-berkat.jpg"
        alt="NapitkiBerkat"
        width={160}
        height={96}
        priority
      />
      {!compact ? (
        <div className="brandText">
          <span>Каталог</span>
          <strong>NapitkiBerkat</strong>
        </div>
      ) : null}
    </div>
  );
}

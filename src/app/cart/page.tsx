import { BrandLogo } from "@/components/BrandLogo";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { getRequiredServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const whatsAppPhone = normalizeWhatsAppPhone(
    getRequiredServerEnv("WHATSAPP_PHONE")
  );
  const freeDeliveryThresholdRub = parseFreeDeliveryThreshold(
    getRequiredServerEnv("DELIVERY_FREE_THRESHOLD_RUB")
  );

  return (
    <main className="catalogPage cartPage">
      <header className="topBar">
        <BrandLogo />
      </header>

      <section className="catalogHeader cartPageHeader" aria-labelledby="cart-title">
        <div>
          <p className="sectionKicker">Корзина</p>
          <h1 id="cart-title">Проверьте заказ</h1>
        </div>
      </section>

      <CartPageClient
        freeDeliveryThresholdRub={freeDeliveryThresholdRub}
        whatsAppPhone={whatsAppPhone}
      />
    </main>
  );
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("8")) {
    return `7${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith("9")) {
    return `7${digits}`;
  }

  return digits;
}

function parseFreeDeliveryThreshold(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 8000;
}

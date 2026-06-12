import { BrandLogo } from "@/components/BrandLogo";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { getRequiredServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  const whatsAppPhone = normalizeWhatsAppPhone(
    getRequiredServerEnv("WHATSAPP_PHONE")
  );
  const freeDeliveryThresholdRub = parseFreeDeliveryThreshold(
    getRequiredServerEnv("DELIVERY_FREE_THRESHOLD_RUB")
  );

  return (
    <main className="catalogPage checkoutPage">
      <header className="topBar">
        <BrandLogo />
      </header>

      <section className="catalogHeader checkoutHeader" aria-labelledby="checkout-title">
        <div>
          <p className="sectionKicker">Оформление заказа</p>
          <h1 id="checkout-title">Адрес, оплата и WhatsApp</h1>
        </div>
      </section>

      <CheckoutClient
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

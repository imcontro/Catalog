import { BrandLogo } from "@/components/BrandLogo";
import { CatalogClient } from "@/components/catalog/CatalogClient";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="catalogPage">
      <header className="topBar">
        <BrandLogo />
      </header>

      <section className="catalogHeader" aria-labelledby="catalog-title">
        <div>
          <p className="sectionKicker">Оптовый каталог</p>
          <h1 id="catalog-title">Напитки для заказа</h1>
        </div>
      </section>

      <CatalogClient />
    </main>
  );
}
